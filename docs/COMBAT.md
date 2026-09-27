# Combat mechanics and observations

[Guide](GUIDE.md) · [Orders](COMMANDS.md) · [Base data](RULESET.md)

Edition 2026-09-27. Formulas describe the audited arena behavior. The ordinary
combat calculation excludes retreat, defensive fire and promotion unless those
are explicitly modeled below. A useful probability estimate must account for
those events and the actual observed units, not only nominal unit counts.

## Ordinary combat

For each round, let `A` be the attacker's effective attack and `D` the defender's
effective defense. The attacker wins that round with probability:

```text
p = A / (A + D)
```

The round loser loses one HP. Repeat until death or an eligible retreat. HP is
not a multiplier applied to the per-round strength; it controls how many rounds
a unit can survive. Veteran and elite units are harder to kill because of their
extra HP. The defender is selected by the engine, not chosen freely by the
attacker, and another defender can become the top choice as the stack changes.

Among eligible defenders, the current selection favors enemies of the attacker
and compares effective defense (without a directional river bonus) multiplied
by remaining HP. Domain eligibility is checked first: a ship or aircraft in a
city does not become its ordinary defender against a land attacker. This means
a damaged high-defense unit may stop being selected ahead of a healthier unit.

For a duel with constant `p`, attacker HP `a`, defender HP `d`, no retreat and
no defensive fire, an exact recurrence is:

```text
W(a, 0) = 1
W(0, d) = 0, for d > 0
W(a, d) = p × W(a, d-1) + (1-p) × W(a-1, d)
```

This makes clear why `A/(A+D)` is a **round** probability, not the probability
of capturing a defended city. A city assault is a sequence of duels against a
changing defender stack. Surviving HP, available attacks, defensive shots,
retreats and legal entry into the tile all matter.

## Observations and modifiers

Current-sight `CONTACT` JSON fields are:

| Field | Meaning |
| --- | --- |
| `id`, `civ`, `type`, `x`, `y` | Identity, owner, unit type and current observed position. |
| `hp`, `maxHp` | Current and maximum HP, including experience/type effects. |
| `attack`, `defense`, `speed` | Base unit strengths and movement allowance, not remaining movement or modified defense. |
| `land`, `fortified` | Domain and observed fortification state. |
| `effectiveDefense` | Defense including terrain, tile improvements, fortification and city bonuses; excludes direction-dependent river crossings and opponent-specific modifiers. Optional in older games. |
| `riverDefenseBonus` | Additional strength if this attack crosses a river. Positive does not mean every approach crosses one. Optional in older games. |
| `defensiveBombardStrength` | Eligible defensive-fire strength in the current fortification state. Can be positive after shots are exhausted. Optional in older games. |
| `defensiveBombardsRemaining` | Remaining defensive shots this turn. Zero means no defensive shot even if the strength is positive. Optional in older games. |

New game images deployed on 2026-09-27 include these definitions in the briefing,
regardless of coaching mode, and link to this public guide. Existing contact
records keep their shape. Older pinned games can omit the legend and additional
fields; coded clients must tolerate optional/unknown fields. See the availability
record in [CHANGES.md](CHANGES.md).

Ordinary defense bonuses add inside one multiplier:

```text
D = base_defense × (1 + sum(defense_bonus_fractions))
```

Base fortification is +25%, river crossing +25%, flat grassland/plains/desert
+10%, hill +50%, mountain +100%, and forest/jungle +25% in the reference data.
Cities provide size-based defense: town (through size 6) +0%, city (7-12) +50%,
metropolis (13+) +100%. Walls normally give +50% but are town-only. Do not stack
a large-city Walls bonus that no longer applies. Tile improvements can add
further defense. See the terrain/reference tables and actual observed strength.

For example, a base-defense-2 Spearman fortified in a grassland town with Walls
has `2 × (1 + .10 + .25 + .50) = 3.7` defense. Crossing a river adds `.5`, making
4.2. An attack-3 unit's round chance is about 44.78% against 3.7 or 41.67% against
4.2. Those are not whole-duel survival odds.

Opponent-specific barbarian multipliers are separate from these additive terrain
bonuses. They are irrelevant in barbarians-off games, but should not be silently
included in an estimate for a normal rival.

## Bombardment

An active bombard requires positive range, a legal bombard capability, an
in-range eligible target, movement, and an available offensive action. Archers
can have bombard strength for defensive fire while lacking an active bombard
order. Strength and range are different fields.

Current targeting order is:

1. A defending unit on the target tile, if one exists.
2. A foreign city without such a unit.
3. Tile improvements, if neither prior target is selected.

For unit bombardment, each rate-of-fire trial succeeds with probability
`B / (B + D_bombard)`, using the unit's effective bombard strength and the target's
bombard defense. A hit removes one HP, but **cannot lower that target below 1 HP**
in the current implementation. A shot against a one-HP unit can therefore expend
the action without useful HP damage.

A single bombard order keeps its chosen unit target for its rate-of-fire sequence.
It does not distribute every successful trial to a newly selected defender.
Separate artillery orders can select a different top defender after earlier
orders changed HP. Account for this when estimating stack damage.

Walls do not intercept a fixed proportion of shots before they reach the garrison.
Units are targeted first, and applicable Walls remain part of their defense.
Bombarding a defended town does not imply its Walls were destroyed. City
population/building damage is a different branch once no unit target is selected;
Palace and wonders are protected from bombard destruction by this implementation.

The current fork can apply a river crossing bonus to bombard defense. This was
reproduced in controlled native checks, but is not asserted here to match original
Civ III. Also, current unit bombardment is nonlethal even where a desktop ruleset
may have a special lethal-bombard flag. Treat these as implementation details to
feature/version-track, not assumptions from a unit's name.

For an undefended city's bombard branch, the engine chooses building versus
population targeting with equal probability once per order. Population defense
is 12; ordinary building defense is 16. A building with domain-specific bombard
defense is targeted first (normally Walls for land bombardment or Coastal Fortress
for naval bombardment, defense 8); otherwise an eligible building is selected.
Building targets are reselected per trial, and a lack of eligible buildings
falls back to population. Improvement-only bombardment uses defense 3 and keeps
one chosen improvement for the order. These are current implementation constants,
not claims about every original Civ III variant.

A non-Blitz unit has one offensive action per turn shared by attack/bombard.
Rate of fire is the number of trials inside that action, not permission to issue
multiple fresh bombard orders. Movement costs are applied during the bombard
trials; do not assume the gun can freely reposition afterward.

## Defensive bombard

Before an ordinary duel, the engine can choose another eligible unit in the
same defending stack for a defensive shot. It does not choose the defender itself.
It selects the strongest eligible defensive bombarder with a shot remaining.
A unit with positive bombard but zero range must be fortified to qualify;
positive-range bombarders do not have that additional fortification requirement.

The shot's hit chance is defensive bombard strength divided by that strength
plus the attacker's defense against defensive bombard. This is not the ordinary
attacker's offensive strength. A successful shot removes one attacker HP and
cannot kill: it is not triggered against an attacker already at one HP.
The firing unit spends one defensive shot. The current turn reset restores one
shot per unit. Later attackers must see the updated remaining-shot state.

## Retreat and experience

Base experience HP are Conscript 2, Regular 3, Veteran 4 and Elite 5, before unit
HP bonuses. The corresponding base retreat chances are 34%, 50%, 58% and 66%.
These chances apply only when retreat is eligible, not before every combat round.

In the current implementation, a fortified unit cannot retreat. A unit must
have base movement greater than 1 and face an opponent with base movement at
most 1; the opponent must have at least 2 HP. Retreat is checked before a losing
round would remove the unit's last HP. A defending unit cannot retreat from a
city and needs a legal free retreat tile in the field. A defender that began
combat at one HP is not eligible for defensive retreat under the current code.
An attacking unit can remain on its original tile after retreat; it does not
capture the destination. Promotions can affect survivors and later combats.

## Healing and time

Healing is evaluated when a unit begins its next turn, if it retained its full
movement allowance rather than spending it. A movement order, attack, upgrade
or other movement-consuming activity can therefore delay healing. Fortified
units that have not moved can recover; repeating a fortify order is unnecessary.

Base recovery per eligible turn:

| Location | Ground recovery |
| --- | ---: |
| Own field territory | 1 HP |
| Neutral/unowned or peaceful foreign field territory | 1 HP |
| Hostile field territory | 0 HP |
| Friendly city without appropriate veteran support | 2 HP |
| Friendly city with appropriate veteran support (Barracks for land) | Full HP |

Sea units do not heal in the open field under this implementation; a suitable
Harbor provides their city support. HP is capped at maximum. Battlefield
Medicine's hostile-territory recovery is not modeled in this audited behavior.

Consequently, repeatedly bombarding and waiting may produce no lasting reduction
in a city's garrison: eligible defenders can heal before the next assault. That
is distinct from bombard orders being ignored. Evaluate damage immediately
before the attack and after the intervening advancement phase.

## Zone of control and movement

Zone of control does not stop movement as in some other Civilization games.
Moving between tiles adjacent to an eligible enemy can trigger a free shot that
removes at most one HP, cannot kill, and receives no return fire. Cautious
movement (`attack:false` or `move_path`) avoids deliberately entering a foreign
occupied tile, but does not grant immunity to this damage or later enemy attacks.

An attack costs one movement point. Non-Blitz units can continue moving after a
win if they retain movement, but cannot attack again. Terrain, roads, river
crossing, wheeled-unit restrictions and naval terrain eligibility still apply.
Only amphibious units can attack from a boat. A unit listed in reference data
may have desktop actions not exposed through email; use actual advertised
orders and capabilities.

Winning a duel does **not** necessarily move the attacker onto the destination.
If another enemy unit remains there, the winning attacker stays on its original
tile. It has spent its attack, lost any HP taken in combat, and left its fortified
state. The attack that clears the tile can move in; later units ordered toward
the now-clear tile can also enter. Remaining civilians or artillery can require
another unit's capture action after the combat defenders are gone.

For example, suppose three enemy defenders occupy the tile east of three
friendly Swordsmen, all with movement available, and the civilizations are at
war. These orders attempt three successive fights:

```json
[
  {"type":"move_unit","unit":"Swordsman-1","dir":"E"},
  {"type":"move_unit","unit":"Swordsman-2","dir":"E"},
  {"type":"move_unit","unit":"Swordsman-3","dir":"E"}
]
```

If each wins and kills one defender, with no other enemy units left, the first
two winners remain at the origin and the third enters the destination. Losses,
retreats, remaining occupants and subsequent movement orders change those final
positions. A combat planner must track both surviving HP and location before
estimating the next counterattack.

## What a combat model should not assume

- One identical defender per city-count entry, all at three HP.
- Walls disappearing merely because artillery fired at a garrison.
- A defensive shot available whenever bombard strength is positive.
- All bombard trials spreading across the whole defending stack.
- Damage persisting through the next turn's healing phase.
- All surviving attackers occupying the captured city, or every removed unit
  having died in ordinary combat.
- A high battle-win probability implying that the captured city is safe from a
  culture flip. [Culture flips](GUIDE.md#7-capture-resistance-culture-flips-and-razing)
  can delete the entire occupation stack without combat.
