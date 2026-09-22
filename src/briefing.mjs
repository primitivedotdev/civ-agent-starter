// Structured parse of a primitive civ turn briefing.
//
// The briefing is your agent's whole view of the game, and it already
// enumerates every legal action: each city's build options, each unit's action
// list, the standings against each rival, and which rivals can be declared on.
// parseBriefing() turns it into data, so your agent (and the order linter) can
// work from the same candidate sets the engine accepts.
//
// Deliberately tolerant: an unparsed section yields an empty list rather than
// throwing, because briefings from older games are missing sections that newer
// ones have. Parse what is there; never guess.

const RE = {
	turn: /^=== TURN (\d+) \| (.+?) ===$/m,
	gov: /^Government: (\S+)\s+Gold: (-?\d+) \(([+-]?\d+)\/turn\)/m,
	rates: /Rates: science (\d+)% \/ tax (\d+)% \/ luxury (\d+)%/,
	research: /^Researching: (.+?) - (\d+)\/(\d+) beakers/m,
	canResearch: /^ {2}(.+?) \(cost (\d+) beakers\)/gm,
	citiesHdr: /^CITIES \((\d+)\)/m,
	cityHdr: /^ {2}(city-\d+) (.+?) \((-?\d+),(-?\d+)\) size (\d+)/,
	producing: /^producing:\s*(.+?)(\s*\[ENGINE DEFAULT[^\]]*\])?\s*\((.*?)\)/,
	// "hurry (80g)", "hurry (2 pop)", or "hurry ()" when the rest is free:
	// The engine prints an empty cost when neither gold nor pop is charged.
	hurry: /^hurry \((?:(\d+)(g| pop))?\)/,
	// Older games print the header without the combat totals, so that half is optional.
	unitsHdr: /^UNITS \(army (\d+)\/(\d+), workers (\d+), settlers (\d+)(?:; army combat totals: attack (\d+) \/ defense (\d+))?\)/m,
	// Tags such as [UPGRADEABLE to Musketman for 30g - order: upgrade] can sit
	// between the stats and the tile; they are skipped so the stats still parse.
	unitHdr: /^ {2}(.+?-\d+) (.+?) (?:\[SIEGE[^\]]*\] )?(?:a(\d+)\/d(\d+)\/m(\d+) )?(?:\[[^\]]*\] )*\((-?\d+),(-?\d+)\) moves (\d+)/,
	standing: /^ {2}STANDING vs (\S+): cities (\d+) vs (\d+); army attack (\d+) vs (\d+), defense (\d+) vs (\d+); techs (\d+) vs (\d+)/gm,
	targets: /^ {2}(\S+) CITIES \(targets if you go to war\): (.+)$/gm,
	targetCity: /([^;(]+?) \((-?\d+),(-?\d+), (\d+) defenders?(, overseas)?\)/g,
	diplomacy: /^Diplomacy: (.+)$/m,
	relation: /([A-Za-z][A-Za-z ]*?) \[(peace|AT WAR)\]/g,
	declarable: /^ {2}declare_war on: (.+?)\s{3}make_peace with: (.+?)\s/m,
	// "*** TRADE OFFER from Greece - THIS TURN ONLY: they give you ..."
	offer: /^\*\*\* TRADE OFFER from (.+?) - THIS TURN ONLY: (.+)$/gm,
	// "(estimated break-even science rate: ~40% - at that rate gold/turn stays >= 0 ...)"
	breakEven: /estimated break-even science rate: ~(\d+)%/,
	// "CITY COUNT: you have 17 cities; this map's optimal is ~14."
	cityCount: /CITY COUNT: you have (\d+) cities; this map's optimal is ~(\d+)/,
	offersPeace: /^ {2}(.+?) OFFERS PEACE \(since turn/gm,
	standingOrder: /\[(FORTIFIED[^\]]*|ADVANCING[^\]]*|AUTO-[^\]]*)\]/,
	// "[SIEGE: bombard strength 4, range 1]" - present on EVERY siege unit line,
	// including the compact lines of units that already have a standing order and
	// therefore print no "actions:" line at all.
	siege: /\[SIEGE: bombard strength (\d+), range (\d+)\]/,
	// "Can revolt to: Monarchy, Republic (a few turns of anarchy to switch)." and
	// "Can revolt to: Despotism - and you SHOULD, now: ..." both occur.
	canRevolt: /^ {2}Can revolt to: (.+?)(?:\s*\(|\s+-\s+|$)/m,
	// ">>> STRIKE OPPORTUNITY: Greece's Pella (2 defenders), your force adjacent: 3 attacker(s) + 1 siege."
	strike: /^ {2}>>> STRIKE OPPORTUNITY: (.+?)'s (.+?) \((\d+) defenders?\), your force adjacent: (\d+) attacker\(s\)(?: \+ (\d+) siege)?/gm,
	// "*** THREATENED: Hattusa (22,22) has 5 enemy unit(s) adjacent; garrison 6."
	threat: /^ {2}\*\*\* THREATENED: (.+?) \((-?\d+),(-?\d+)\) has (\d+) enemy unit\(s\) adjacent; garrison (\d+)/gm,
};

// "Settler(~3t, founds a new city (costs 2 pop)), Worker(~1t), Walls(~2t, ...)"
// -> ["Settler", "Worker", "Walls"]. Item names never contain "(" so the split
// is on the top-level commas only, which nesting depth tracks.
export function parseBuildOptions(value) {
	const out = [];
	let depth = 0, token = "";
	for (const ch of value) {
		if (ch === "(") { if (depth === 0) { out.push(token.trim()); token = ""; } depth++; continue; }
		if (ch === ")") { depth = Math.max(0, depth - 1); continue; }
		if (depth === 0) token += ch;
	}
	if (token.trim()) out.push(token.trim());
	return out.map((s) => s.replace(/^,\s*/, "").trim()).filter(Boolean);
}

// "actions: move_unit dir N/NE | advance to nearest_enemy_city | bombard x45 y23 | fortify"
// -> { verbs: Set{move_unit, advance, bombard, fortify}, bombard: [{x,y}], jobs: [...] }
const KNOWN_VERBS = ["move_unit", "move_to", "advance", "bombard", "pillage", "explore", "fortify", "sentry", "hold", "disband", "work", "upgrade", "found_city"];
function parseActions(line) {
	const verbs = new Set(), bombard = [], jobs = [], attack = [];
	// A verb can appear anywhere in a segment, e.g.
	// "move_unit dir N/NE/... (or move_to x,y)" offers both move_unit and move_to.
	for (const v of KNOWN_VERBS) if (new RegExp(`\\b${v}\\b`).test(line)) verbs.add(v);
	for (const part of line.split("|")) {
		const t = part.trim();
		if (!t) continue;
		const b = /^bombard x(-?\d+) y(-?\d+)/.exec(t);
		if (b) bombard.push({ x: Number(b[1]), y: Number(b[2]) });
		// "attack: move onto (32,24) to attack America (10 units, best defense 0 - ...)";
		// the parenthesised stack is only printed by newer engines.
		const a = /^attack: move onto \((-?\d+),(-?\d+)\) to attack ([A-Za-z .'-]+?)(?: \((\d+) units?, best defense (\d+)[^)]*\))?$/.exec(t);
		if (a) attack.push({ x: Number(a[1]), y: Number(a[2]), civ: a[3].trim(), units: a[4] ? Number(a[4]) : null, bestDefense: a[5] != null ? Number(a[5]) : null });
		const w = /^work job (.+)$/.exec(t);
		if (w) jobs.push(...w[1].split("/").map((s) => s.trim()).filter(Boolean));
	}
	return { verbs, bombard, jobs, attack };
}

export function parseBriefing(text) {
	const lines = text.split("\n");
	const out = {
		turn: null, civ: null, government: null, gold: null, goldPerTurn: null,
		rates: null, researching: null, researchable: [],
		cities: [], units: [], standings: {}, targets: {}, relations: {}, canRevoltTo: [], revoltKnown: false,
		strikes: [], threats: [],
		declarableWar: [], offerablePeace: [], tradeOffersFrom: [], tradeOffers: [], peaceOffersFrom: [],
		cityCount: null, cityOptimal: null, breakEvenScience: null,
		armyCap: null, army: null, workers: null, settlers: null,
		itemStats: {},
		unitSupport: null,
		researchCost: {}, techsFrom: {}, overseasTargets: {}, unconnectedResources: [], itemUpkeep: {},
	};
	let m;
	if ((m = RE.turn.exec(text))) { out.turn = Number(m[1]); out.civ = m[2]; }
	if ((m = RE.gov.exec(text))) { out.government = m[1]; out.gold = Number(m[2]); out.goldPerTurn = Number(m[3]); }
	if ((m = RE.canRevolt.exec(text))) {
		out.canRevoltTo = /^\(?none/i.test(m[1].trim()) ? [] : m[1].split(",").map((x) => x.trim()).filter(Boolean);
		out.revoltKnown = true;
	}
	if ((m = RE.rates.exec(text))) out.rates = { science: Number(m[1]), tax: Number(m[2]), luxury: Number(m[3]) };
	if ((m = RE.research.exec(text))) out.researching = { tech: m[1], have: Number(m[2]), need: Number(m[3]) };
	if ((m = RE.unitsHdr.exec(text))) {
		out.army = Number(m[1]); out.armyCap = Number(m[2]); out.workers = Number(m[3]);
		out.settlers = Number(m[4]);
		out.attackStrength = m[5] ? Number(m[5]) : null;
		out.defenseStrength = m[6] ? Number(m[6]) : null;
	}
	if ((m = RE.diplomacy.exec(text))) {
		for (const r of m[1].matchAll(RE.relation)) out.relations[r[1].trim()] = r[2] === "peace" ? "peace" : "war";
	}
	if ((m = RE.declarable.exec(text))) {
		const clean = (s) => (s.trim() === "(none)" ? [] : s.split(",").map((x) => x.trim()).filter(Boolean));
		out.declarableWar = clean(m[1]); out.offerablePeace = clean(m[2]);
	}
	for (const s of text.matchAll(RE.standing)) {
		out.standings[s[1]] = {
			cities: Number(s[2]), rivalCities: Number(s[3]),
			attack: Number(s[4]), rivalAttack: Number(s[5]),
			defense: Number(s[6]), rivalDefense: Number(s[7]),
			techs: Number(s[8]), rivalTechs: Number(s[9]),
		};
	}
	for (const t of text.matchAll(RE.targets)) {
		// A city the engine marks "overseas" is on a landmass we hold no city
		// on: no land unit can reach it, so it is kept out of the targets every
		// rule and metric reads, and listed apart.
		const cs = [], sea = [];
		for (const c of t[2].matchAll(RE.targetCity)) {
			(c[5] ? sea : cs).push({ name: c[1].trim(), x: Number(c[2]), y: Number(c[3]), defenders: Number(c[4]) });
		}
		out.targets[t[1]] = cs;
		if (sea.length) out.overseasTargets[t[1]] = sea;
	}
	// The engine has already counted defenders, our adjacent attackers and our
	// adjacent siege for every city we could hit this turn: the exact numbers a
	// "mass before you assault" rule needs, so nothing here has to be estimated.
	for (const m of text.matchAll(RE.strike)) {
		out.strikes.push({
			civ: m[1].trim(), city: m[2].trim(), defenders: Number(m[3]),
			attackersAdjacent: Number(m[4]), siegeAdjacent: m[5] ? Number(m[5]) : 0,
		});
	}
	for (const m of text.matchAll(RE.threat)) {
		out.threats.push({ city: m[1].trim(), x: Number(m[2]), y: Number(m[3]), enemiesAdjacent: Number(m[4]), garrison: Number(m[5]) });
	}
	for (const o of text.matchAll(RE.offer)) {
		out.tradeOffersFrom.push(o[1].trim());
		// The engine writes the valuation into the line itself (what researching
		// it would cost, how much gold we hold), which is what a judgment needs.
		out.tradeOffers.push({ civ: o[1].trim(), text: o[2].trim() });
	}
	// "supports up to 105 unit(s) free; you have 103 - support cost 0" or
	// "you have 117 unit(s), 12 over your free limit of 105 - support cost 24".
	if ((m = /supports up to (\d+) unit\(s\) free; you have (\d+) - support cost (\d+)/.exec(text))) {
		out.unitSupport = { free: Number(m[1]), have: Number(m[2]), cost: Number(m[3]) };
	} else if ((m = /you have (\d+) unit\(s\), \d+ over your free limit of (\d+) - support cost (\d+)/.exec(text))) {
		out.unitSupport = { free: Number(m[2]), have: Number(m[1]), cost: Number(m[3]) };
	}
	// "NOT connected - Iron (gates Swordsman/...): nearest known at (49,9), inside
	// your borders - ROAD that tile to connect it"
	for (const r of text.matchAll(/NOT connected - ([A-Za-z]+) \(gates [^)]*\): nearest known at \((-?\d+),(-?\d+)\), (inside|OUTSIDE) your borders( - ROAD that tile)?/g)) {
		out.unconnectedResources.push({ resource: r[1], x: Number(r[2]), y: Number(r[3]), inside: r[4] === "inside", needsRoad: !!r[5] });
	}
	if ((m = RE.breakEven.exec(text))) out.breakEvenScience = Number(m[1]);
	// The engine's search runs from the highest rate down, so "your current rate
	// is sustainable" means the current rate IS the break-even; "NO rate is" means 0.
	else if (/your current science rate is sustainable/.test(text) && out.rates) out.breakEvenScience = out.rates.science;
	else if (/NO science rate is sustainable/.test(text)) out.breakEvenScience = 0;
	if ((m = RE.cityCount.exec(text))) {
		out.cityCount = Number(m[1]);
		out.cityOptimal = Number(m[2]);
	}
	for (const o of text.matchAll(RE.offersPeace)) out.peaceOffersFrom.push(o[1].trim());
	for (const r of text.matchAll(RE.canResearch)) {
		if (/^[A-Z]/.test(r[1]) && !/^ {2}[a-z]/.test(r[0])) {
			out.researchable.push(r[1].trim());
			out.researchCost[r[1].trim()] = Number(r[2]);
		}
	}
	// "TRADE with Hittites: they know The Wheel, Mysticism (you do not); ...
	// You could BUY The Wheel: {... "give":"gold:150","want":"tech:The Wheel" ...}"
	for (const t of text.matchAll(/^TRADE with ([A-Za-z .'-]+?): they know (.+?) \(you do not\)(.*)$/gm)) {
		const buy = /"give":"gold:(\d+)","want":"tech:([^"]+)"/.exec(t[3]);
		out.techsFrom[t[1].trim()] = {
			theyKnow: t[2].split(",").map((x) => x.trim()).filter(Boolean),
			suggested: buy ? { gold: Number(buy[1]), tech: buy[2] } : null,
		};
	}

	// Cities and units: walk the two sections line by line.
	const citiesAt = lines.findIndex((l) => RE.citiesHdr.test(l));
	const unitsAt = lines.findIndex((l, i) => i > citiesAt && RE.unitsHdr.test(l));
	let city = null;
	for (let i = citiesAt + 1; i < (unitsAt < 0 ? lines.length : unitsAt); i++) {
		const line = lines[i];
		const h = RE.cityHdr.exec(line);
		if (h) {
			city = {
				// "** CIVIL DISORDER ..." is appended to the HEADER line, not to a
				// detail line below it, so it has to be read here or it is missed.
				disorderFromHeader: /\*\* CIVIL DISORDER/.test(line),
				id: h[1], name: h[2], x: Number(h[3]), y: Number(h[4]), size: Number(h[5]),
				producing: null, engineDefault: false, turnsLeft: null, buildOptions: [],
				built: [], builtKnown: false, hurryGold: null, hurryCost: null, notGrowing: false,
			};
			city.disorder = city.disorderFromHeader;
			// "[4 happy/0 content/0 unhappy]": a city riots when unhappy > happy,
			// so the margin says how close a calm city is to the edge.
			const mood = /\[(\d+) happy\/(\d+) content\/(\d+) unhappy\]/.exec(line);
			city.happy = mood ? Number(mood[1]) : null;
			city.content = mood ? Number(mood[2]) : null;
			city.unhappy = mood ? Number(mood[3]) : null;
			city.corruption = 0;
			out.cities.push(city);
			continue;
		}
		if (!city) continue;
		const t = line.trim();
		let mm;
		if ((mm = RE.producing.exec(t))) {
			city.producing = mm[1] === "(nothing!)" ? null : mm[1].trim();
			city.engineDefault = !!mm[2];
			const tl = /(\d+) turns? left/.exec(mm[3]);
			city.turnsLeft = tl ? Number(tl[1]) : null;
			city.notGrowing = /NOT GROWING/.test(t);
			const cor = /corruption (\d+)%/.exec(t);
			if (cor) city.corruption = Number(cor[1]);
		} else if (t.startsWith("build options:")) {
			city.buildOptions = parseBuildOptions(t.slice("build options:".length));
			// Buildings carry their upkeep: "Barracks(~3t, upkeep -1g/turn, ...)".
			for (const up of t.matchAll(/([A-Z][A-Za-z' -]*?)\((?:~\d+t|stalled)[^()]*?upkeep -(\d+)g\/turn/g)) {
				out.itemUpkeep[up[1].trim()] = Number(up[2]);
			}
			// Units carry their stats in the menu: "Archer(~3t a2/d1/m1, ...)".
			for (const st of t.matchAll(/([A-Z][A-Za-z' -]*?)\((?:~\d+t|stalled) a(\d+)\/d(\d+)\/m(\d+)/g)) {
				out.itemStats[st[1].trim()] = { attack: Number(st[2]), defense: Number(st[3]), moves: Number(st[4]) };
			}
			// The engine prints at most 12 build options per city, so a
			// full list means "there may be more the engine would still accept".
			city.buildOptionsTruncated = city.buildOptions.length >= 12;
		} else if (t.startsWith("built:")) {
			city.built = t.slice("built:".length).split(",").map((s) => s.trim()).filter(Boolean);
			city.builtKnown = true;
		} else if ((mm = RE.hurry.exec(t))) {
			city.hurryCost = mm[1] ? Number(mm[1]) : 0;
			city.hurryPays = !mm[1] ? "free" : mm[2] === "g" ? "gold" : "pop";
			city.hurryGold = mm[1] && mm[2] === "g" ? Number(mm[1]) : null;
		} else if (/RIOT|civil disorder/i.test(t)) {
			city.disorder = true;
		}
	}
	let unit = null;
	for (let i = (unitsAt < 0 ? lines.length : unitsAt) + 1; i < lines.length; i++) {
		const line = lines[i];
		const h = RE.unitHdr.exec(line);
		if (h) {
			const so = RE.standingOrder.exec(line);
			const sg = RE.siege.exec(line);
			unit = {
				siege: sg ? { strength: Number(sg[1]), range: Number(sg[2]) } : null,
				id: h[1], type: h[2].trim(), attack: h[3] ? Number(h[3]) : null,
				defense: h[4] ? Number(h[4]) : null, moves: Number(h[8]),
				x: Number(h[6]), y: Number(h[7]),
				standingOrder: so ? so[1].split(/[\s-]/)[0] : null,
				busy: false, actions: { verbs: new Set(), bombard: [], jobs: [], attack: [] },
			};
			// "[STUCK: move_to (21,25) has made no progress for 5 turns ...]"
			const stuck = /\[STUCK: move_to \((-?\d+),(-?\d+)\) has made no progress for (\d+) turns/.exec(line);
			unit.stuck = stuck ? { x: Number(stuck[1]), y: Number(stuck[2]), turns: Number(stuck[3]) } : null;
			out.units.push(unit);
			continue;
		}
		if (!unit) continue;
		const t = line.trim();
		if (t.startsWith("actions:")) unit.actions = parseActions(t.slice("actions:".length));
		else if (t.startsWith("on ")) {
			// "on Grassland/Grassland f2s0c0 RES:NONE [mine] [road] [occupied]; ..."
			unit.tile = {
				mine: /\[mine\]|\[road\+mine\]|\+mine/.test(t),
				irrigation: /\[irrigation\]|\+irrigation/.test(t),
				road: /\[road/.test(t),
			};
		} else if (t.startsWith("NOTE: no useful job on this tile.")) {
			// "Nearest useful job: Road at (47,25) - issue work with that job ..."
			const nj = /Nearest useful job: (\w[\w ]*?) at \((-?\d+),(-?\d+)\)/.exec(t);
			if (nj) unit.nearestUsefulJob = { job: nj[1], x: Number(nj[2]), y: Number(nj[3]) };
		}
		else if (t.startsWith("BUSY:")) unit.busy = true;
	}
	return out;
}

export const byId = (xs) => new Map(xs.map((x) => [x.id, x]));
