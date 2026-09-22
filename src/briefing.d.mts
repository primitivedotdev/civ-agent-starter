// Types for briefing.mjs, so TypeScript callers (the civ-agent Function) get a
// checked shape from the plain-JS parser. Mirrors orchestrator/auto-schedule.d.mts.

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
}

export interface BriefingUnitActions {
	verbs: Set<string>;
	bombard: Array<{ x: number; y: number }>;
	jobs: string[];
	/** Adjacent enemy tiles this unit may attack; units/bestDefense only on newer engines. */
	attack?: Array<{ x: number; y: number; civ: string; units: number | null; bestDefense: number | null }>;
}

export interface BriefingUnit {
	id: string;
	type: string;
	attack: number | null;
	defense: number | null;
	moves: number;
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
}

export function parseBriefing(text: string): ParsedBriefing;
export function parseBuildOptions(value: string): string[];
export function byId<T extends { id: string }>(xs: T[]): Map<string, T>;
