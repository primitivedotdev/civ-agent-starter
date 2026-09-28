# Public rules and protocol changes

[Guide](GUIDE.md)

## 2026-09-28: movement outcomes and visible adjacency

Published ahead of the engine rollout. New game images emitting `adjacent_tiles:`
report rejected `move_unit` attempts accurately, preserve combat outcomes without
advance, and add per-unit current-sight terrain and occupancy records. `move_to`
also rejects blocked/exhausted attempts with no movement or combat away from the
target. Already at the target and intentional `attack:false` stops remain
successful, with explicit messages instead of claiming progress. Existing
order shapes and the legacy adjacency format are retained. Hidden units and
transport cargo are not exposed by the new records. Games keep their pinned
engine version; older games can retain the documented false-success limitation.

The starter parser exposes optional `unit.adjacentTiles`, with `null` for missing
or malformed data and `[]` for a present empty list. Records are observations,
not a replacement for unit-specific legal actions. See the complete
[movement outcome contract](PROTOCOL.md#movement-outcomes-and-visible-adjacent-tiles).

## 2026-09-27: movement success and actual displacement

Documented an existing [movement reporting defect](PROTOCOL.md#verify-movement-from-positions):
`move_unit` can report success while a terrain-blocked unit stays in place.
The example explains how to recognize unchanged coordinates and why an escort
and artillery can separate despite receiving matching orders. This was verified
against native movement on all four restricted terrain types, with hills and
roaded mountains as controls. It changes no engine behavior or protocol format;
existing games retain their pinned versions.

## 2026-09-27: displayed and lifetime culture totals

Documented an existing [culture-summary reporting limitation](GUIDE.md#culture-totals-in-the-briefing):
the displayed totals cover currently owned cities, while resistance and flip
calculations retain culture produced in lost or destroyed cities. The guide now
explains the difference with an arithmetic example, identifies which total the
cultural-victory check uses, and directs agents to the engine's reported city
flip risk. This is a documentation correction, not an
engine fix, rule change or new field. Existing pinned games retain their format.

## 2026-09-27: positions and promotions after sequential combat

Clarified [where attackers end up after a fight](COMBAT.md#zone-of-control-and-movement),
with an exact three-order example. Winners remain at their origin while another
enemy occupies the destination; the unit that clears it can enter. This documents
existing behavior verified with sequential engine actions. Also documented the
base promotion chances and how a promotion affects later fights. It adds no command,
field or rule and requires no engine rollout. Games retain their pinned versions.

## 2026-09-27: comprehensive public reference

Published rules, all email-order shapes, scoring arithmetic, combat and bombard
formulas, capture/flip/raze behavior, military limits, movement conventions,
economy and base reference tables. This is documentation of existing behavior,
not a rule change or a promise that every older game supports all current fields.

Current-sight contact reports on newer games include `effectiveDefense`,
`riverDefenseBonus`, `defensiveBombardStrength` and `defensiveBombardsRemaining`.
The contact schema is additive; older games can omit these fields or the entire
section. Unknown and empty are different states.

**Available in new game images as of 2026-09-27:** briefings link to this public
guide and include a definition legend before the contact block for every player,
with coaching either disabled or enabled. This changes no contact JSON record,
command, visibility rule or combat calculation. The rollout was verified after
the guide was published.

Detect the additions from the `Public rules and command guide:` and
`Combat fields:` lines. Existing games retain their pinned engine images and can
lack these lines or the optional fields. Consult the definitions in this guide
for fields actually present; do not treat absent fields as zero.

## How to record future changes

For each relevant change, record the date, player-visible behavior, whether it is
available or staged, capability detection, effects on older pinned games, and a
link to the relevant section. Cover rules and limits as well as JSON syntax.
Do not publish confidential implementation links or participant information.
