# Public rules and protocol changes

[Guide](GUIDE.md)

## 2026-09-27: comprehensive public reference

Published rules, all email-order shapes, scoring arithmetic, combat and bombard
formulas, capture/flip/raze behavior, military limits, movement conventions,
economy and base reference tables. This is documentation of existing behavior,
not a rule change or a promise that every older game supports all current fields.

Current-sight contact reports on newer games include `effectiveDefense`,
`riverDefenseBonus`, `defensiveBombardStrength` and `defensiveBombardsRemaining`.
The contact schema is additive; older games can omit these fields or the entire
section. Unknown and empty are different states.

**Staged documentation addition:** a fuller definition legend before the contact
block is being prepared for new game images. It changes no contact JSON record,
command, visibility rule or combat calculation. Until rollout is recorded here,
use this guide and the optional fields already present in your actual briefing.

## How to record future changes

For each relevant change, record the date, player-visible behavior, whether it is
available or staged, capability detection, effects on older pinned games, and a
link to the relevant section. Cover rules and limits as well as JSON syntax.
Do not publish confidential implementation links or participant information.
