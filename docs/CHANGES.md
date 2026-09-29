# Public rules and protocol changes

[Guide](GUIDE.md)

## 2026-09-29: compacted and truncated briefings

A briefing over the engine's byte budget (currently 180000 bytes) is now
compacted at up to six levels, and its first line names the level and what was
left out. Compact forms include one-line rows for units on standing orders, a
short `BUSY:` line for workers on a job, `actions:` lines without explanations,
`same as <id>` rows for identical units on a tile, no neighbor lines for units
away from enemies, a capped foreign contact list and, at the last level,
header-only unit rows. Every city and unit is still listed by id and every
order works as usual. The JSON briefing has a new `compaction` field (`null`
for a full briefing). A body still over the mail API's limit is cut at a line,
with a notice at the top and a marker at the cut. Briefings under the budget are
unchanged, and games pinned to older engine images do not compact. The
starter's parser and linter read every compact form. See
[briefing size](PROTOCOL.md#briefing-size).

## 2026-09-28: automatic founding search limits

Clarified the existing `found_city` fallback: it selects an eligible known tile
within squared raw-coordinate distance 225, excludes foreign-occupied tiles,
and uses geometric proximity rather than route length. This search does not
adjust for map wrapping. A failed local search does not establish that no more
cities can be founded elsewhere. The guide includes fictional manual-movement
examples and explains that standing settlement reselects its destination.
No engine rule, order format or running-game version changed. See
[automatic founding search](GUIDE.md#automatic-founding-search).

## 2026-09-28: Settler category counts and optional caps

Published ahead of rollout. New images advertising `Unit categories:` classify
Settlers by city-founding unit capability, independent of current-tile founding
legality. This corrects the shared unit header, category ordering and optional
Worker/Settler cap enforcement. Both optional caps remain disabled by default;
`FOUNDABLE`, founding rules and the header format are unchanged. Older pinned
games retain the location-dependent classification defect. See
[unit categories and limits](GUIDE.md#6-army-limits-upgrades-and-recovery).

The same staged repair keeps the `SETTLER` row label independent of founding
legality and restricts nearby settlement details to current sight, including
for loaded Settlers. Nearby `FOUNDABLE` markers also require visibility of the
surrounding tiles, preventing inference of unseen cities; a missing marker can
mean unknown. The current unit's founding legality is unchanged. A role label
is not permission to found immediately.

## 2026-09-28: known elimination limitation

Documented the existing exception for a civilization that has never owned a
city: losing its final Settler can leave it undefeated with no cities or units,
preventing Conquest. A paired native control confirmed the distinction from a
formerly city-owning rival. This is a current engine limitation, not a verified
claim about original Civilization III. No elimination rule, command or running
game changed. See [elimination and the ownership-history exception](GUIDE.md#elimination-and-the-never-owned-city-exception).

## 2026-09-28: exploration timing and reservation lifecycle

Corrected the earlier reference: arena `explore` runs when ordered and must be
reissued on later turns. Commit/advance does not automatically continue it.
This documents existing timing and adds no standing exploration order.

Published ahead of the lifecycle repair's rollout. New images advertising
`Exploration dispatch:` safely resume repeated exploration, release abandoned
reservations without clearing other explorers' plans, and report active/inactive
state with actual start/end coordinates. Accepted manual orders cancel a unit's
plan; validation refusals preserve it. World reload pauses exploration and
requires another order. Command syntax and result fields are unchanged. Older
pinned images can still leak reservations or misleadingly claim auto-exploration
started; see [exploration orders](PROTOCOL.md#exploration-orders).

## 2026-09-28: battle observer visibility

Published ahead of rollout. New images advertising `Battle visibility:` restrict
uninvolved viewers to destination tiles actively visible immediately before
combat. Remembered tiles and arriving later do not grant battle intelligence;
participants retain their own reports. The transient log expires after the
current/previous-turn window and clears on world replacement. Formats, combat
rules and hidden-cargo exclusions remain unchanged. Older pinned images retain
their prior visibility behavior. See [battle report visibility](PROTOCOL.md#battle-report-visibility).

## 2026-09-28: captured and destroyed unit feedback

Published ahead of rollout. New game images advertising `Combat results:` will
distinguish captured units, destroyed units and captured Settlers converted into
Workers, in action messages and recent battle summaries. Empty-city captures
will no longer imply a defender was killed. Counts exclude loaded cargo.
Existing action fields and city markers remain compatible; combat and capture
rules do not change. Running games keep their pinned image and may retain the
old misleading wording. See [combat outcome feedback](PROTOCOL.md#combat-outcome-feedback).

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
