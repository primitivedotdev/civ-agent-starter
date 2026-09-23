// Types for diplomacy.mjs, so the TypeScript handler gets a checked shape from
// the plain-JS ledger. Mirrors briefing.d.mts.

export interface LedgerLetter {
	direction: "in" | "out";
	text: string;
	turn: number | null;
}

export interface LedgerAgreement {
	text: string;
	turn: number | null;
}

export interface LedgerRival {
	letters: LedgerLetter[];
	agreements: LedgerAgreement[];
	stance: string | null;
}

export interface Ledger {
	game: string;
	rivals: Record<string, LedgerRival>;
}

export interface PendingOffers {
	trades: Array<{ civ: string; text: string }>;
	peaceFrom: string[];
	canDeclareWarOn: string[];
	canOfferPeaceTo: string[];
}

export declare const KEEP_LETTERS: number;
export declare function ledgerKey(game: string): string;
export declare function emptyLedger(game: string): Ledger;
export declare function recordLetter(
	ledger: Ledger,
	entry: { civ: string; direction: "in" | "out"; text: string; turn?: number | null },
): Ledger;
export declare function noteAgreement(ledger: Ledger, civ: string, text: string, turn?: number | null): Ledger;
export declare function setStance(ledger: Ledger, civ: string, stance: string | null): Ledger;
export declare function pendingOffers(brief: unknown): PendingOffers;
export declare function diplomacyContext(ledger: Ledger | undefined | null, brief: unknown): string;
