# Email order reference

[Guide](GUIDE.md) · [Protocol](PROTOCOL.md) · [Combat](COMBAT.md)

Edition 2026-09-27. Examples show JSON objects to place in your `<ORDERS>` array.
All IDs, coordinates, civs and choices below are illustrative. Use the exact
objects from your own current briefing. Your unit's legal actions, city options
and game footer are authoritative. Newer orders may be absent in older games.

Orders are sequential, not atomic as a whole. Later orders see earlier results.
A refused order leaves earlier successful actions in place. A unit can receive
multiple orders while it remains available and has the required movement, but
that does not bypass the once-per-turn offensive-action restriction. Actions
that consume a unit make subsequent orders for that ID invalid.

## Cities and production

| Type and example | Prerequisites, effects and timing |
| --- | --- |
| `{"type":"found_city","unit":"Settler-1","name":"Example"}` | Requires a city-founding unit and a legal site. Consumes the settler when founded. If the current tile is unsuitable, the host can register auto-settle toward a known eligible site within squared raw-coordinate distance 225, then found on arrival. This local search ignores map wrapping and is not a path-length limit. See [automatic founding search](GUIDE.md#automatic-founding-search) for selection, failure and manual movement. A successful standing order is not proof a city already exists. |
| `{"type":"join_city","unit":"Worker-2"}` | Worker or Settler must stand in an owned city that can accept its population without violating growth limits. Adds its population cost (normally Worker 1, Settler 2), consuming the unit. Requires fresh water/Aqueduct beyond size 6 and Hospital beyond 12. |
| `{"type":"set_production","city":"city-1","item":"Spearman"}` | Owned city and currently producible item; technology, resources, prerequisites and existing buildings matter. Uses `item`, not worker `job`. Stored shields carry over. Some printed option lists are truncated, so omission is not itself proof of illegality; the host validates actual producibility. |
| `{"type":"hurry","city":"city-1"}` | Must have a hurryable current build, appropriate government method and sufficient gold/population. Resistance blocks it. Refuses Great and Small Wonders. Costs and unhappiness are reported in the city briefing. |
| `{"type":"leader_hurry","unit":"Leader-9"}` | Military Great Leader must stand in an owned city with an eligible current build. Consumes the leader, fills production, finishes next production step. Can hurry units, improvements and Small Wonders; refuses Great Wonders. |
| `{"type":"sell_building","city":"city-1","building":"Marketplace"}` | Owned city and an eligible actually constructed building. One sale per city per turn. Refuses Palace, wonders, defensive buildings and buildings supplied virtually by wonders. Refund is half the stored shield cost, integer division, minimum 1 gold; upkeep is removed. |
| `{"type":"raze","city":"city-7"}` | Must own a city captured by force in this same turn, and have another city. Destroys it and its buildings/wonders; preserves your units on the tile and can create workers. Refused on later turns, founded cities, traded cities and cities acquired only by a flip. |

### Capture then raze

```json
[
  {"type":"move_unit","unit":"Swordsman-5","dir":"E"},
  {"type":"raze","city":"city-7"}
]
```

This example is valid only if the move actually captures `city-7` this turn and
you still own another city. It is not a conditional script. A failed attack,
remaining defender, different city ID or auto-razed town makes the raze order
refuse. You do not receive an intermediate briefing between these two orders.

## Movement and standing orders

| Type and example | Prerequisites, effects and timing |
| --- | --- |
| `{"type":"move_unit","unit":"Warrior-3","dir":"NE"}` | One adjacent step in N, NE, E, SE, S, SW, W or NW. Requires movement and legal terrain. Can attack an enemy occupant if combat is legal; declare war first when needed. |
| `{"type":"move_to","unit":"Warrior-3","x":42,"y":18}` | Moves toward the destination using available movement, possibly attacking a hostile blocker. May stop short or remain en route. Not a standing order or a promise of a particular path. Updated games reject a blocked/exhausted attempt that makes no progress and has no combat; already at the target is successful. See [movement outcomes](PROTOCOL.md#movement-outcomes-and-visible-adjacent-tiles) for availability and intentional stops. |
| `{"type":"move_to","unit":"Cavalry-3","x":42,"y":18,"attack":false}` | Use only when the briefing advertises the option. Stops before any foreign unit/city, including peaceful units, civilians and empty cities. Does not protect against defensive combat or zone-of-control damage. `attack` must be a boolean; omitted/true keeps normal behavior. |
| `{"type":"move_path","unit":"Cavalry-3","directions":["E","NE","E"]}` | Use only when advertised. Array must contain 1-60 valid directions; all syntax is checked before movement. Follows only those edges and stops at exhausted movement, blockage, map edge or any foreign unit/city. Never attacks deliberately. Unused steps are discarded; it is not a standing route. |
| `{"type":"advance","unit":"Warrior-3","to":"nearest_enemy_city"}` | Standing automated movement; `to` is `nearest_enemy_city`, `nearest_enemy_unit` or `unexplored`. Chooses targets by shared rules and attacks encountered enemies when legal. City targeting can use a rumored city during war. No group synchronization: each unit fights on arrival. |
| `{"type":"hold","unit":"Warrior-3"}` | Holds location and skips remaining movement this turn. Does not constitute a multi-turn coordinated assault order. |
| `{"type":"sentry","unit":"Warrior-3"}` | Host behavior is to hold position and skip the turn. Do not assume extra desktop sentry behavior beyond what the briefing reports. |
| `{"type":"fortify","unit":"Spearman-4"}` | Fortifies an eligible unit and leaves a standing fortified state. Already-fortified units need no repeated order. Fortification affects defense and zero-range defensive bombard eligibility. |
| `{"type":"explore","unit":"Scout-7"}` | Runs the unit's legal exploration behavior using its remaining movement this turn. Send `explore` again on later turns to continue; arena commit/advance does not continue it automatically. See [exploration timing and compatibility](PROTOCOL.md#exploration-orders). |
| `{"type":"work","unit":"Worker-2","job":"Road"}` | Requires an eligible worker/job. If needed, shared auto-work can seek a nearby known eligible tile. Non-road yield work is restricted to own territory. Busy work takes turns; moving abandons progress and reissuing can restart it. |

An explicit unit order overrides host standing advance, settle or work orders.
Use the reported standing state to avoid accidentally restarting useful work.
Engine refusal handling is not a general rollback of all standing-state effects;
do not rely on invalid commands to preserve or cancel a job.

Check positions after movement: on older pinned games, a successful `move_unit` result can still report
the unchanged starting coordinates. See the [movement reporting limitation](PROTOCOL.md#verify-movement-from-positions).

A winning attack can leave its unit on the starting tile while another enemy
remains at the destination. See the [combat movement example](COMBAT.md#zone-of-control-and-movement)
before assuming that every ordered attacker becomes an occupying unit.

## Combat and units

| Type and example | Prerequisites, effects and timing |
| --- | --- |
| `{"type":"bombard","unit":"Catapult-4","x":42,"y":18}` | Unit must have active bombard capability, positive range, movement, an eligible in-range target and an available offensive action. Defensive bombard strength alone does not grant this command. Prioritizes a defending unit; unit damage is nonlethal in the current implementation. |
| `{"type":"pillage","unit":"Swordsman-5"}` | Requires the unit's legal pillage action and an eligible improvement on its current tile. Can damage transport/resource infrastructure; it does not capture the city by itself. |
| `{"type":"upgrade","unit":"Warrior-6"}` | Requires movement, an owned city with appropriate veteran support, a producible successor, resources and enough gold. Consumes the unit's remaining movement. Use the briefing's offered type/cost rather than inferring an upgrade solely from research. |
| `{"type":"disband","unit":"Warrior-6"}` | Removes an owned unit. Later orders for the ID fail. Distinct from dying in combat, a culture flip, capture or automatic cap trimming. |

There is no separate `attack` order in this contract. Attacks are made by legal
movement into the enemy tile. Multiple units in an array attack sequentially.
Non-Blitz units may make at most one offensive attack/bombard per turn; winning
a battle leaves any remaining movement but does not authorize another attack.

## Government, research and relations

| Type and example | Prerequisites, effects and timing |
| --- | --- |
| `{"type":"set_rates","science":7,"luxury":2}` | Integer sliders in tenths: here 70% science, 20% luxury, remainder tax. Government caps and the shared total apply. Do not pass percentages like 70 or fractional values like 0.7. |
| `{"type":"research","tech":"Mathematics"}` | Legal researchable technology. Switching loses invested beakers; repeating the same technology does not. Zero beakers means no research progress. |
| `{"type":"revolt","government":"Monarchy"}` | Legal unlocked government from the briefing's revolt choices. Begins anarchy and later installs the chosen government; it is not an immediate stat change to the target government. |
| `{"type":"declare_war","civ":"Greece"}` | Met rival other than self, with declaration permitted. Already-at-war is a no-op success. A host cooldown refuses redeclaration within 5 turns of a recorded peace signature. |
| `{"type":"make_peace","civ":"Greece"}` | At war, this offers peace. It signs only when a reciprocal offer exists within the 10-turn offer window. Until then the war continues. Already-at-peace returns signed success without creating a new war. |

The 5-turn redeclaration cooldown and 10-turn bilateral offer window are host
rules; do not confuse them with the speed-scaled default deal duration.

## Trade

| Type and example | Prerequisites, effects and timing |
| --- | --- |
| `{"type":"propose_trade","civ":"Greece","give":"gold:50","want":"tech:Writing","note":"An exchange"}` | Met living agent-controlled rival, valid assets and at most one proposal this turn. Proposal gold is escrowed. Does not settle until accepted. |
| `{"type":"accept_trade","civ":"Greece"}` | A current offer from that civ must exist. Both sides are revalidated; settlement is atomic, and an invalidated offer is voided with escrow refunded. |
| `{"type":"decline_trade","civ":"Greece","note":"No agreement"}` | A current offer must exist. Removes it and refunds escrow. Ignoring an offer lets it expire; letters are not offers. |

A side can bundle items with `+`, using `gold:<integer>`, `tech:<exact name>`,
`city:<city name or ID>` or `peace`, for example `gold:50+tech:Writing`. Trade city strings accept an owned city name or ID; ordinary city commands use
IDs.
Assets must belong to the giver, technologies must be transferable to the
recipient, and peace requires war. The proposer cannot give away its capital
or last city. An accepted peace-containing trade changes relations through
settlement; a diplomatic letter does not.

## Capabilities and unsupported shapes

- Detect `move_to attack=false`, `move_path directions`, optional `CONTACT`
  fields and new per-unit actions in the actual game. Do not infer support from
  the publication date of this file.
- No manual `load`, `unload`, `airlift`, `launch_spaceship`, arbitrary console,
  engine-RPC or save-edit command is listed here. Do not send a desktop UI action
  name as if it were an email order. Existing advertised movement/build actions
  can still support related behavior; inspect those rather than inventing syntax.
- Parsed engine data is not necessarily exposed by every version of this
  starter's parser. Preserve raw briefings and extend parser/lint support before
  relying on a newly advertised feature.

### Movement-reporting update

New images with `adjacent_tiles:` distinguish rejected movement from actual
movement or combat. The new per-unit detail separates current-sight terrain,
land, city and occupancy without replacing the legacy adjacency line. It does
not grant movement permissions or change any order shape. See the
[availability and field definitions](PROTOCOL.md#movement-outcomes-and-visible-adjacent-tiles).
