// Types for briefing.mjs, so TypeScript callers (the civ-agent Function) get a
// checked shape from the plain-JS parser.

export interface BriefingCity {
	id: string;
	name: string;
	x: number;
	y: number;
	size: number;
	producing: string | null;
	engineDefault: boolean;
	turnsLeft: number | null;
	buildOptions: string[];
	buildOptionsTruncated?: boolean;
	built: string[];
	builtKnown: boolean;
	hurryCost: number | null;
	hurryGold: number | null;
	hurryPays?: "gold" | "pop" | "free";
	notGrowing: boolean;
	disorder: boolean;
	/** From the header "[h happy/c content/u unhappy]"; null on older briefings. */
	happy: number | null;
	content: number | null;
	unhappy: number | null;
	/** Percent of shields and commerce lost to corruption; 0 when not printed. */
	corruption: number;
	/** Citizens made unhappy by war weariness in this city ("war weary:" line); 0 when not printed. */
	warWeary: number;
	/** Citizens resisting your rule in a captured city; while above 0 the city produces nothing and cannot hurry. */
	resisting: number;
	/** Chance per turn that the city defects to another civ by culture; null when the briefing shows none. */
	flipRisk: { percent: number; below: boolean; civ: string } | null;
	/** Workers left by razing this city; set only on the turn it was captured ("raze:" line). */
	razeWorkers: number | null;
}

export interface BriefingUnitActions {
	verbs: Set<string>;
	bombard: Array<{ x: number; y: number }>;
	jobs: string[];
	/** Adjacent enemy tiles this unit may attack; units/bestDefense only on newer engines. */
	attack?: Array<{ x: number; y: number; civ: string; units: number | null; bestDefense: number | null }>;
	/** True when the actions line says the unit already attacked this turn (it may move, not attack again). */
	attackedThisTurn?: boolean;
}

export interface BriefingUnit {
	id: string;
	type: string;
	attack: number | null;
	defense: number | null;
	moves: number;
	/** From "HP 2/3" on the unit line; null on older briefings. */
	hp: number | null;
	maxHp: number | null;
	x: number;
	y: number;
	standingOrder: string | null;
	busy: boolean;
	actions: BriefingUnitActions;
	/** Set when the engine reports this unit's move_to has made no progress for turns. */
	stuck?: { x: number; y: number; turns: number } | null;
}

export interface BriefingStanding {
	cities: number;
	rivalCities: number;
	attack: number;
	rivalAttack: number;
	defense: number;
	rivalDefense: number;
	techs: number;
	rivalTechs: number;
}

export interface BriefingTarget {
	name: string;
	x: number;
	y: number;
	defenders: number;
}

export interface ObservedUnit {
	id: string;
	civ: string;
	type: string;
	x: number;
	y: number;
	hp: number;
	maxHp: number;
	attack: number;
	defense: number;
	speed: number;
	land: boolean;
	fortified: boolean;
}

export interface BriefingStrike {
	civ: string;
	city: string;
	x?: number;
	y?: number;
	defenders: number;
	attackersAdjacent: number;
	siegeAdjacent: number;
}

export interface ParsedBriefing {
	turn: number | null;
	civ: string | null;
	government: string | null;
	gold: number | null;
	goldPerTurn: number | null;
	/** Rival cities on a landmass where we hold no city; kept out of `targets`. */
	overseasTargets: Record<string, Array<{ name: string; x: number; y: number; defenders: number }>>;
	/** Strategic resources we know of but have not connected, with the nearest tile. */
	unconnectedResources: Array<{ resource: string; x: number; y: number; inside: boolean; needsRoad: boolean }>;
	/** Gold per turn of upkeep by building name, read from the build menus. */
	itemUpkeep: Record<string, number>;
	/** Beaker cost of each tech we can research now. */
	researchCost: Record<string, number>;
	/** Per rival: techs they know that we lack, and the engine's suggested purchase. */
	techsFrom: Record<string, { theyKnow: string[]; suggested: { gold: number; tech: string } | null }>;
	/** Units the government supports free, units we have, and gold/turn paid for the rest. */
	unitSupport: { free: number; have: number; cost: number } | null;
	/** Unit stats by build item name, read from the cities' build menus. */
	itemStats: Record<string, { attack: number; defense: number; moves: number }>;
	rates: { science: number; tax: number; luxury: number } | null;
	researching: { tech: string; have: number; need: number } | null;
	researchable: string[];
	cities: BriefingCity[];
	units: BriefingUnit[];
	standings: Record<string, BriefingStanding>;
	targets: Record<string, BriefingTarget[]>;
	relations: Record<string, "peace" | "war">;
	canRevoltTo: string[];
	revoltKnown: boolean;
	declarableWar: string[];
	offerablePeace: string[];
	tradeOffersFrom: string[];
	peaceOffersFrom: string[];
	army: number | null;
	armyCap: number | null;
	workers: number | null;
	settlers: number | null;
	attackStrength?: number | null;
	defenseStrength?: number | null;
	strikes: BriefingStrike[];
	threats: Array<{ city: string; x: number; y: number; enemiesAdjacent: number; garrison: number }>;
	tradeOffers: Array<{ civ: string; text: string }>;
	cityCount: number | null;
	/** Your civilization's optimal city count from the CITY COUNT line (it can differ between civs). */
	cityOptimal: number | null;
	breakEvenScience: number | null;
	/** What bankruptcy took last turn, one entry per "BANKRUPTCY last turn:" line. */
	bankruptcyEvents: string[];
	/** War weariness points per rival civ; empty when the briefing prints none. */
	warWeariness: Record<string, number>;
	/** Turns left in your Golden Age; 0 when none is running. */
	goldenAgeTurnsLeft: number;
	/** True when the briefing advertises move_path. */
	pathMovement: boolean;
	/** True when the briefing advertises move_to with attack=false. */
	cautiousMovement: boolean;
	/** Foreign units in current sight; null when the section is missing or malformed. */
	observedUnits: ObservedUnit[] | null;
}

export function parseObservedUnits(text: string): ObservedUnit[] | null;

export function parseBriefing(text: string): ParsedBriefing;
export function parseBuildOptions(value: string): string[];
export function byId<T extends { id: string }>(xs: T[]): Map<string, T>;
