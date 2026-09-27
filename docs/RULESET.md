# Base ruleset reference

[Guide](GUIDE.md) · [Commands](COMMANDS.md) · [Combat](COMBAT.md)

Edition 2026-09-27. These tables transcribe numeric gameplay facts from the
audited base ruleset, without artwork or private agent code. They are reference
data, not proof that every listed item or desktop action is available in your
game. Use your briefing for current legal builds, costs, connections and actions.

Shield costs below are Normal-speed base costs. Quick scales them by 0.5,
rounding positive costs up with a minimum of 1; traits and difficulty can affect
the final cost. Technology costs are base factors, not the final beaker price.
Resources must be accessible to the producing city. Civilizations can have
unique units and replacements; the table does not override those restrictions.

## Units

A/D/M are base attack, defense and movement. B/R/F are bombard strength, range
and rate of fire. A positive B with zero R is not an active bombard capability.
Population is consumed by production. Special flags do not imply a matching
email command or complete support for every desktop mechanic.

| Unit | Shields | Population | A/D/M | B/R/F | Technology | Resources | Notes |
| --- | ---: | ---: | --- | --- | --- | --- | --- |
| Settler | 30 | 2 | 0/0/1 | 0/0/0 | None | None | Standard |
| Worker | 10 | 1 | 0/0/1 | 0/0/0 | None | None | Standard |
| Scout | 10 | 0 | 0/0/2 | 0/0/0 | None | None | Civs: Russia, America, Zululand, Mongols, Arabia, Hittites, Portugal |
| Explorer | 20 | 0 | 0/0/2 | 0/0/0 | Astronomy | None | Standard |
| Marine | 120 | 0 | 12/6/1 | 0/0/0 | Amphibious War | Rubber | amphibious |
| Modern Paratrooper | 110 | 0 | 6/11/1 | 0/0/0 | Synthetic Fibers | Oil, Rubber | zoneOfControl |
| Warrior | 10 | 0 | 1/1/1 | 0/0/0 | None | None | Standard |
| Archer | 20 | 0 | 2/1/1 | 1/0/1 | Warrior Code | None | Standard |
| Spearman | 20 | 0 | 1/2/1 | 0/0/0 | Bronze Working | None | Standard |
| Swordsman | 30 | 0 | 3/2/1 | 0/0/0 | Iron Working | Iron | Standard |
| Chariot | 20 | 0 | 1/1/2 | 0/0/0 | The Wheel | Horses | wheeled |
| Horseman | 30 | 0 | 2/1/2 | 0/0/0 | Horseback Riding | Horses | Standard |
| Pikeman | 30 | 0 | 1/3/1 | 0/0/0 | Feudalism | Iron | Standard |
| Longbowman | 40 | 0 | 4/1/1 | 2/0/1 | Invention | None | Standard |
| Musketman | 60 | 0 | 2/4/1 | 0/0/0 | Gunpowder | Saltpeter | Standard |
| Knight | 70 | 0 | 4/3/2 | 0/0/0 | Chivalry | Horses, Iron | Standard |
| Rifleman | 80 | 0 | 4/6/1 | 0/0/0 | Nationalism | None | Standard |
| Cavalry | 80 | 0 | 6/3/3 | 0/0/0 | Military Tradition | Horses, Saltpeter | zoneOfControl |
| Infantry | 90 | 0 | 6/10/1 | 0/0/0 | Replaceable Parts | Rubber | Standard |
| Tank | 100 | 0 | 16/8/2 | 0/0/0 | Motorized Transportation | Oil, Rubber | zoneOfControl; blitz |
| Mech Infantry | 110 | 0 | 12/18/2 | 0/0/0 | Computers | Oil, Rubber | zoneOfControl |
| Modern Armor | 120 | 0 | 24/16/3 | 0/0/0 | Synthetic Fibers | Oil, Rubber | zoneOfControl; blitz |
| Catapult | 20 | 0 | 0/0/1 | 4/1/1 | Mathematics | None | wheeled |
| Cannon | 40 | 0 | 0/0/1 | 8/1/1 | Metallurgy | Iron, Saltpeter | wheeled |
| Artillery | 80 | 0 | 0/0/1 | 12/2/2 | Replaceable Parts | None | Standard |
| Radar Artillery | 120 | 0 | 0/0/2 | 16/2/3 | Robotics | Aluminum | zoneOfControl; rotateBeforeAttack |
| Cruise Missile | 60 | 0 | 0/0/1 | 16/4/3 | Rocketry | Aluminum | Standard |
| Tactical Nuke | 300 | 0 | 0/0/1 | 0/6/0 | Space Flight | Aluminum, Uranium | Standard |
| ICBM | 500 | 0 | 0/0/1 | 0/0/0 | Satellites | Aluminum, Uranium | Standard |
| Galley | 30 | 0 | 1/1/3 | 0/0/0 | Map Making | None | rotateBeforeAttack; coastOnly |
| Caravel | 40 | 0 | 1/2/4 | 0/0/0 | Astronomy | None | rotateBeforeAttack |
| Frigate | 60 | 0 | 2/2/5 | 3/1/2 | Magnetism | Iron, Saltpeter | rotateBeforeAttack |
| Galleon | 50 | 0 | 1/2/4 | 0/0/0 | Magnetism | None | rotateBeforeAttack |
| Ironclad | 90 | 0 | 5/6/3 | 6/1/2 | Ironclads | Iron, Coal | Standard |
| Transport | 100 | 0 | 1/2/6 | 0/0/0 | Combustion | Oil | Standard |
| Carrier | 180 | 0 | 1/8/7 | 0/0/0 | Mass Production | Oil | canCarryAircraft |
| Submarine | 100 | 0 | 8/4/4 | 0/0/0 | Mass Production | Oil | Standard |
| Destroyer | 120 | 0 | 12/8/8 | 6/1/2 | Combustion | Oil | Standard |
| Battleship | 200 | 0 | 18/12/5 | 8/2/2 | Mass Production | Oil | rotateBeforeAttack |
| AEGIS Cruiser | 160 | 0 | 15/10/7 | 6/2/2 | Robotics | Aluminum, Uranium | zoneOfControl |
| Nuclear Submarine | 140 | 0 | 8/4/5 | 0/0/0 | Fission | Uranium | canCarryTacticalMissiles |
| Fighter | 80 | 0 | 4/2/1 | 3/0/1 | Flight | Oil | Standard |
| Bomber | 100 | 0 | 0/2/1 | 12/0/3 | Flight | Oil | Standard |
| Helicopter | 100 | 0 | 0/2/1 | 0/0/0 | Advanced Flight | Oil, Rubber | canCarryFootUnitsOnly |
| Jet Fighter | 100 | 0 | 8/4/1 | 3/0/1 | Rocketry | Oil, Aluminum | Standard |
| Stealth Fighter | 120 | 0 | 8/6/1 | 6/0/2 | Stealth | Oil, Aluminum | Standard |
| Stealth Bomber | 240 | 0 | 0/5/1 | 18/0/3 | Stealth | Oil, Aluminum | Standard |
| Leader | 0 | 0 | 0/0/3 | 0/0/0 | None | None | Not normally buildable; leader |
| Army | 400 | 0 | 0/0/1 | 0/0/0 | None | None | Not normally buildable; blitz; zoneOfControl |
| Jaguar Warrior | 15 | 0 | 1/1/2 | 0/0/0 | Warrior Code | None | Civs: Aztecs |
| Bowman | 20 | 0 | 2/2/1 | 1/0/1 | Warrior Code | None | Civs: Babylon |
| Hoplite | 20 | 0 | 1/3/1 | 0/0/0 | Bronze Working | None | Civs: Greece |
| Impi | 20 | 0 | 1/2/2 | 0/0/0 | Bronze Working | None | Civs: Zululand |
| Legionary | 30 | 0 | 3/3/1 | 0/0/0 | Iron Working | Iron | Civs: Rome |
| Immortals | 30 | 0 | 4/2/1 | 0/0/0 | Iron Working | Iron | Civs: Persia |
| War Chariot | 20 | 0 | 2/1/2 | 0/0/0 | The Wheel | Horses | Civs: Egypt; wheeled |
| Rider | 70 | 0 | 4/3/3 | 0/0/0 | Chivalry | Horses, Iron | Civs: China |
| Mounted Warrior | 30 | 0 | 3/1/2 | 0/0/0 | Horseback Riding | Horses | Civs: Iroquois |
| Musketeer | 60 | 0 | 2/5/1 | 2/0/1 | Gunpowder | Saltpeter | Civs: France |
| Samurai | 70 | 0 | 4/4/2 | 0/0/0 | Chivalry | Iron | Civs: Japan |
| War Elephant | 70 | 0 | 4/3/2 | 0/0/0 | Chivalry | None | Civs: India; HP bonus 1 |
| Cossack | 90 | 0 | 6/3/3 | 0/0/0 | Military Tradition | Horses, Saltpeter | Civs: Russia; zoneOfControl; blitz |
| Panzer | 100 | 0 | 16/8/3 | 0/0/0 | Motorized Transportation | Oil, Rubber | Civs: Germany; zoneOfControl; blitz |
| Man-O-War | 65 | 0 | 4/2/5 | 4/1/2 | Magnetism | Iron, Saltpeter | Civs: England; rotateBeforeAttack |
| F-15 | 100 | 0 | 8/4/1 | 6/0/2 | Rocketry | Oil, Aluminum | Civs: America |
| Privateer | 50 | 0 | 2/1/5 | 3/0/0 | Magnetism | Iron, Saltpeter | rotateBeforeAttack |
| Keshik | 60 | 0 | 4/2/2 | 0/0/0 | Chivalry | Horses | Civs: Mongols; zoneOfControl |
| Conquistador | 70 | 0 | 3/2/2 | 0/0/0 | Astronomy | Horses | Civs: Spain; zoneOfControl |
| Berserk | 70 | 0 | 6/2/1 | 0/0/0 | Invention | None | Civs: Scandinavia; amphibious |
| Sipahi | 100 | 0 | 8/3/3 | 0/0/0 | Military Tradition | Horses, Saltpeter | Civs: Ottomans; zoneOfControl |
| Gallic Swordsman | 40 | 0 | 3/2/2 | 0/0/0 | Iron Working | Iron | Civs: Celts |
| Ansar Warrior | 60 | 0 | 4/2/3 | 0/0/0 | Chivalry | Horses, Iron | Civs: Arabia |
| Numidian Mercenary | 30 | 0 | 2/3/1 | 0/0/0 | Bronze Working | None | Civs: Carthage |
| Hwach'a | 40 | 0 | 0/0/1 | 8/1/1 | Metallurgy | Saltpeter | Civs: Korea; wheeled |
| Medieval Infantry | 40 | 0 | 4/2/1 | 0/0/0 | Feudalism | Iron | Standard |
| Guerilla | 90 | 0 | 6/6/1 | 3/0/1 | Replaceable Parts | None | Standard |
| Princess | 0 | 0 | 0/0/1 | 0/0/0 | None | None | Not normally buildable; Civs:  |
| Lincoln | 0 | 0 | 1/1/2 | 0/0/0 | None | None | Not normally buildable; Civs:  |
| Hammurabi | 0 | 0 | 1/1/2 | 0/0/0 | None | None | Not normally buildable; Civs:  |
| Mao | 0 | 0 | 1/1/2 | 0/0/0 | None | None | Not normally buildable; Civs:  |
| Bismarck | 0 | 0 | 1/1/2 | 0/0/0 | None | None | Not normally buildable; Civs:  |
| Alexander | 0 | 0 | 1/1/2 | 0/0/0 | None | None | Not normally buildable; Civs:  |
| Caesar | 0 | 0 | 1/1/2 | 0/0/0 | None | None | Not normally buildable; Civs:  |
| Xerxes | 0 | 0 | 1/1/2 | 0/0/0 | None | None | Not normally buildable; Civs:  |
| Hiawatha | 0 | 0 | 1/1/2 | 0/0/0 | None | None | Not normally buildable; Civs:  |
| Shaka | 0 | 0 | 1/1/2 | 0/0/0 | None | None | Not normally buildable; Civs:  |
| Montezuma | 0 | 0 | 1/1/2 | 0/0/0 | None | None | Not normally buildable; Civs:  |
| Cleopatra | 0 | 0 | 1/1/2 | 0/0/0 | None | None | Not normally buildable; Civs:  |
| Elizabeth | 0 | 0 | 1/1/2 | 0/0/0 | None | None | Not normally buildable; Civs:  |
| Catherine | 0 | 0 | 1/1/2 | 0/0/0 | None | None | Not normally buildable; Civs:  |
| Abu | 0 | 0 | 1/1/2 | 0/0/0 | None | None | Not normally buildable; Civs:  |
| Hannibal | 0 | 0 | 1/1/2 | 0/0/0 | None | None | Not normally buildable; Civs:  |
| Osman | 0 | 0 | 1/1/2 | 0/0/0 | None | None | Not normally buildable; Civs:  |
| Temujin | 0 | 0 | 1/1/2 | 0/0/0 | None | None | Not normally buildable; Civs:  |
| Gandhi | 0 | 0 | 1/1/2 | 0/0/0 | None | None | Not normally buildable; Civs:  |
| Ragnar | 0 | 0 | 1/1/2 | 0/0/0 | None | None | Not normally buildable; Civs:  |
| Brennus | 0 | 0 | 1/1/2 | 0/0/0 | None | None | Not normally buildable; Civs:  |
| Tokugawa | 0 | 0 | 1/1/2 | 0/0/0 | None | None | Not normally buildable; Civs:  |
| Joan d'Arc | 0 | 0 | 1/1/2 | 0/0/0 | None | None | Not normally buildable; Civs:  |
| Wang Kon | 0 | 0 | 1/1/2 | 0/0/0 | None | None | Not normally buildable; Civs:  |
| Isabella | 0 | 0 | 1/1/2 | 0/0/0 | None | None | Not normally buildable; Civs:  |
| Enkidu Warrior | 10 | 0 | 1/2/1 | 0/0/0 | None | None | Civs: Sumeria |
| Three-Man Chariot | 30 | 0 | 2/2/2 | 0/0/0 | The Wheel | Horses | Civs: Hittites; wheeled |
| Mursilis | 0 | 0 | 1/1/2 | 0/0/0 | None | None | Not normally buildable; Civs:  |
| Gilgamesh | 0 | 0 | 1/1/2 | 0/0/0 | None | None | Not normally buildable; Civs:  |
| Henry | 0 | 0 | 1/1/2 | 0/0/0 | None | None | Not normally buildable; Civs:  |
| Carrack | 40 | 0 | 2/2/4 | 0/0/0 | Astronomy | None | Civs: Portugal; rotateBeforeAttack |
| Swiss Mercenary | 30 | 0 | 1/4/1 | 0/0/0 | Feudalism | Iron | Civs: Netherlands |
| William of Orange | 0 | 0 | 1/1/2 | 0/0/0 | None | None | Not normally buildable; Civs:  |
| Trebuchet | 30 | 0 | 0/0/1 | 6/1/1 | Engineering | None | wheeled |
| Pachacuti | 0 | 0 | 1/1/2 | 0/0/0 | None | None | Not normally buildable; Civs:  |
| Smoke-Jaguar | 0 | 0 | 1/1/2 | 0/0/0 | None | None | Not normally buildable; Civs:  |
| Theodora | 0 | 0 | 1/1/2 | 0/0/0 | None | None | Not normally buildable; Civs:  |
| Chasqui Scout | 20 | 0 | 1/1/2 | 0/0/0 | None | None | Civs: Inca |
| Javelin Thrower | 30 | 0 | 2/2/1 | 0/0/0 | Warrior Code | None | Civs: Maya |
| Dromon | 30 | 0 | 2/1/3 | 2/1/2 | Map Making | None | Civs: Byzantines; coastOnly |
| Cruiser | 160 | 0 | 15/10/6 | 7/1/2 | Combustion | Oil | Standard |
| Crusader | 70 | 0 | 5/3/1 | 0/0/0 | None | None | Not normally buildable; Civs:  |
| Ancient Cavalry | 40 | 0 | 3/2/2 | 0/0/0 | None | None | Not normally buildable; Civs: ; HP bonus 1 |
| Curragh | 15 | 0 | 1/1/2 | 0/0/0 | Alphabet | None | rotateBeforeAttack; coastOnly |
| Paratrooper | 90 | 0 | 4/9/1 | 0/0/0 | Advanced Flight | Oil, Rubber | zoneOfControl |
| TOW Infantry | 120 | 0 | 12/14/1 | 6/0/1 | Rocketry | None | Standard |
| Flak | 70 | 0 | 1/6/1 | 0/0/0 | Flight | None | Standard |
| Mobile SAM | 100 | 0 | 1/6/2 | 0/0/0 | Rocketry | None | Standard |

## Technologies

Base cost is a research-cost factor. Actual beakers depend on map rate, speed,
difficulty and known-civilization discounts. Consult the current research list.

| Technology | Base cost | Prerequisites |
| --- | ---: | --- |
| Bronze Working | 3 | None |
| Masonry | 4 | None |
| Alphabet | 5 | None |
| Pottery | 2 | None |
| The Wheel | 4 | None |
| Warrior Code | 3 | None |
| Ceremonial Burial | 2 | None |
| Iron Working | 6 | Bronze Working |
| Writing | 8 | Alphabet |
| Mysticism | 4 | Ceremonial Burial |
| Mathematics | 8 | Masonry, Alphabet |
| Philosophy | 6 | Writing |
| Code of Laws | 10 | Writing |
| Literature | 10 | Writing |
| Map Making | 12 | Writing, Pottery |
| Horseback Riding | 5 | The Wheel, Warrior Code |
| Polytheism | 12 | Mysticism |
| Currency | 16 | Mathematics |
| The Republic | 28 | Philosophy, Code of Laws |
| Monarchy | 24 | Warrior Code, Polytheism |
| Construction | 20 | Iron Working, Mathematics |
| Monotheism | 36 | None |
| Feudalism | 32 | None |
| Engineering | 36 | None |
| Theology | 40 | Monotheism |
| Chivalry | 32 | Monotheism, Feudalism |
| Invention | 44 | Feudalism, Engineering |
| Printing Press | 36 | Theology |
| Music Theory | 40 | Education |
| Education | 44 | Theology |
| Gunpowder | 48 | Invention |
| Banking | 52 | Education |
| Astronomy | 56 | Education |
| Chemistry | 60 | Gunpowder |
| Democracy | 68 | Printing Press, Banking |
| Economics | 56 | Banking |
| Navigation | 56 | Astronomy |
| Physics | 64 | Astronomy, Chemistry |
| Metallurgy | 64 | Chemistry |
| Free Artistry | 52 | Democracy |
| Theory of Gravity | 68 | Physics |
| Magnetism | 68 | Physics |
| Military Tradition | 64 | Metallurgy |
| Nationalism | 120 | None |
| Steam Power | 120 | None |
| Medicine | 100 | None |
| Communism | 120 | Nationalism |
| Industrialization | 120 | Steam Power |
| Electricity | 140 | Steam Power |
| Scientific Method | 100 | Medicine, Electricity |
| Sanitation | 90 | Medicine |
| Espionage | 90 | Nationalism, Industrialization |
| The Corporation | 100 | Industrialization |
| Refining | 160 | The Corporation |
| Steel | 140 | The Corporation |
| Atomic Theory | 200 | Scientific Method |
| Combustion | 160 | Refining, Steel |
| Replaceable Parts | 140 | Electricity |
| Flight | 180 | Combustion |
| Amphibious War | 120 | Mass Production |
| Mass Production | 140 | Combustion, Replaceable Parts |
| Electronics | 180 | Atomic Theory |
| Motorized Transportation | 140 | Mass Production |
| Advanced Flight | 180 | Flight, Electronics, Motorized Transportation |
| Rocketry | 240 | None |
| Fission | 280 | None |
| Computers | 260 | None |
| Recycling | 240 | Ecology |
| Space Flight | 300 | Rocketry |
| Nuclear Power | 280 | Fission |
| Superconductor | 300 | Fission, Space Flight |
| Miniaturization | 320 | Computers |
| Ecology | 260 | None |
| Synthetic Fibers | 280 | Ecology |
| Satellites | 260 | Space Flight |
| The Laser | 280 | Nuclear Power, Computers |
| Genetics | 320 | Miniaturization |
| Stealth | 300 | Synthetic Fibers |
| Smart Weapons | 280 | Satellites, The Laser |
| Robotics | 320 | The Laser, Miniaturization |
| Integrated Defense | 360 | Superconductor, Satellites, Smart Weapons |
| Ironclads | 100 | Steam Power |
| Fascism | 130 | Nationalism |

## Governments

Support columns are free units per town/city/metropolis, followed by gold per
supported unit above that allowance. The actual unit-support total can include
other game effects. Anarchy has all-units-free and no maintenance in this data.

| Government | Technology | Corruption | Hurry | War weariness | Free support | Extra-unit gold | Police limit | Worker rate |
| --- | --- | --- | --- | --- | --- | ---: | ---: | ---: |
| Anarchy | None | catastrophic | cannotHurry | none | All | 1 | 0 | 1 |
| Despotism | None | rampant | forcedLabor | none | 4/4/4 | 1 | 2 | 2 |
| Monarchy | Monarchy | problematic | paidLabor | none | 2/4/8 | 1 | 3 | 2 |
| Communism | Communism | communal | forcedLabor | none | 6/6/6 | 1 | 4 | 2 |
| Republic | The Republic | nuisance | paidLabor | low | 1/3/4 | 2 | 0 | 2 |
| Democracy | Democracy | minimal | paidLabor | high | 0/0/0 | 1 | 0 | 3 |
| Fascism | Fascism | nuisance | forcedLabor | none | 4/7/10 | 1 | 4 | 4 |
| Feudalism | Feudalism | problematic | forcedLabor | low | 5/2/1 | 3 | 3 | 2 |

## Terrain

Unimproved base yields, before city center rules, resources, civilization and
government effects, improvements and corruption. Defense fractions are additive
bonuses, not final multipliers. Movement costs can be overridden by transport
infrastructure and unit eligibility.

| Terrain | Food | Shields | Commerce | Move cost | Defense bonus | Cities allowed |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Desert | 0 | 1 | 0 | 1 | 10% | Yes |
| Plains | 1 | 1 | 0 | 1 | 10% | Yes |
| Grassland | 2 | 0 | 0 | 1 | 10% | Yes |
| Tundra | 1 | 0 | 0 | 1 | 10% | Yes |
| Flood Plain | 3 | 0 | 0 | 1 | 10% | Yes |
| Hills | 1 | 1 | 0 | 2 | 50% | Yes |
| Mountains | 0 | 1 | 0 | 3 | 100% | No |
| Forest | 1 | 2 | 0 | 2 | 25% | Yes |
| Jungle | 1 | 0 | 0 | 3 | 25% | Yes |
| Marsh | 1 | 0 | 0 | 2 | 20% | No |
| Volcano | 0 | 3 | 0 | 3 | 80% | No |
| Coast | 1 | 0 | 2 | 1 | 10% | No |
| Sea | 1 | 0 | 1 | 1 | 10% | No |
| Ocean | 0 | 0 | 0 | 1 | 10% | No |

## Worker jobs

Base duration before speed/government/worker effects. A duration in this table
does not mean the job is legal on every tile. Use the worker action listing.

| Job | Base duration | Technology | Resources |
| --- | ---: | --- | --- |
| Mine | 12 | None | None |
| Irrigation | 8 | None | None |
| Fortress | 16 | Construction | None |
| Road | 6 | None | None |
| Railroad | 12 | Steam Power | Iron, Coal |
| Plant Forest | 18 | Engineering | None |
| Clear Forest | 4 | None | None |
| Clear Wetlands | 16 | None | None |
| Clear Damage | 24 | None | None |
| Airfield | 1 | Flight | None |
| Radar Tower | 1 | Advanced Flight | None |
| Outpost | 1 | Masonry | None |
| Barricade | 16 | Construction | None |

## Buildings and wonders

Costs, upkeep and culture are base values. This is not a complete list of each
building effect or prerequisite. Wonders, traits, obsolescence, required buildings
and local conditions can alter availability or effective benefits.

| Building | Shields | Upkeep | Culture/turn | Technology | Kind |
| --- | ---: | ---: | ---: | --- | --- |
| Palace | 100 | 0 | 1 | Masonry | Improvement |
| Barracks | 40 | 1 | 0 | None | Improvement |
| Granary | 60 | 1 | 0 | Pottery | Improvement |
| Temple | 60 | 1 | 2 | Ceremonial Burial | Improvement |
| Marketplace | 100 | 1 | 0 | Currency | Improvement |
| Library | 80 | 1 | 3 | Literature | Improvement |
| Courthouse | 80 | 1 | 0 | Code of Laws | Improvement |
| Walls | 20 | 0 | 0 | Masonry | Improvement |
| Aqueduct | 100 | 1 | 0 | Construction | Improvement |
| Bank | 160 | 1 | 0 | Banking | Improvement |
| Cathedral | 160 | 2 | 3 | Monotheism | Improvement |
| University | 200 | 2 | 4 | Education | Improvement |
| Colosseum | 120 | 2 | 2 | Construction | Improvement |
| Factory | 240 | 3 | 0 | Industrialization | Improvement |
| Manufacturing Plant | 320 | 3 | 0 | Robotics | Improvement |
| Recycling Center | 200 | 2 | 0 | Recycling | Improvement |
| Coal Plant | 160 | 3 | 0 | Industrialization | Improvement |
| Hydro Plant | 240 | 3 | 0 | Electronics | Improvement |
| Nuclear Plant | 240 | 3 | 0 | Nuclear Power | Improvement |
| Hospital | 160 | 2 | 0 | Sanitation | Improvement |
| Research Lab | 200 | 2 | 2 | Computers | Improvement |
| Mass Transit System | 200 | 2 | 0 | Ecology | Improvement |
| SAM Missile Battery | 80 | 2 | 0 | Rocketry | Improvement |
| Coastal Fortress | 40 | 0 | 0 | Metallurgy | Improvement |
| Solar Plant | 320 | 3 | 0 | Ecology | Improvement |
| Harbor | 60 | 1 | 0 | Map Making | Improvement |
| Offshore Platform | 240 | 3 | 0 | Miniaturization | Improvement |
| Airport | 160 | 2 | 0 | Flight | Improvement |
| Police Station | 160 | 2 | 0 | Communism | Improvement |
| The Pyramids | 400 | 0 | 4 | Masonry | Great Wonder |
| The Hanging Gardens | 300 | 0 | 4 | Monarchy | Great Wonder |
| The Colossus | 200 | 0 | 3 | Bronze Working | Great Wonder |
| The Great Lighthouse | 300 | 0 | 2 | Map Making | Great Wonder |
| The Great Library | 400 | 0 | 6 | Literature | Great Wonder |
| The Oracle | 300 | 0 | 4 | Mysticism | Great Wonder |
| The Great Wall | 300 | 0 | 2 | Construction | Great Wonder |
| Sun Tzu's Art of War | 600 | 0 | 2 | Feudalism | Great Wonder |
| Sistine Chapel | 600 | 0 | 6 | Theology | Great Wonder |
| Magellan's Voyage | 400 | 0 | 3 | Navigation | Great Wonder |
| Copernicus' Observatory | 400 | 0 | 4 | Astronomy | Great Wonder |
| Shakespeare's Theater | 450 | 0 | 8 | Free Artistry | Great Wonder |
| Leonardo's Workshop | 600 | 0 | 2 | Invention | Great Wonder |
| JS Bach's Cathedral | 600 | 0 | 6 | Music Theory | Great Wonder |
| Newton's University | 400 | 0 | 6 | Theory of Gravity | Great Wonder |
| Smith's Trading Company | 600 | 0 | 3 | Economics | Great Wonder |
| Universal Suffrage | 800 | 0 | 4 | Industrialization | Great Wonder |
| Hoover Dam | 800 | 0 | 2 | Electronics | Great Wonder |
| Theory of Evolution | 600 | 0 | 3 | Scientific Method | Great Wonder |
| The United Nations | 1000 | 0 | 4 | Fission | Great Wonder |
| The Manhattan Project | 800 | 0 | 2 | Fission | Great Wonder |
| Cure for Cancer | 1000 | 0 | 3 | Genetics | Great Wonder |
| Longevity | 1000 | 0 | 3 | Genetics | Great Wonder |
| SETI program | 1000 | 0 | 3 | Computers | Great Wonder |
| Heroic Epic | 200 | 0 | 4 | None | Small Wonder |
| Iron Works | 300 | 0 | 2 | None | Small Wonder |
| Forbidden Palace | 200 | 0 | 2 | None | Small Wonder |
| Military Academy | 400 | 0 | 1 | Military Tradition | Small Wonder |
| The Pentagon | 400 | 0 | 1 | None | Small Wonder |
| Wall Street | 300 | 0 | 2 | None | Small Wonder |
| Apollo Program | 500 | 0 | 2 | Space Flight | Small Wonder |
| Strategic Missile Defense | 500 | 0 | 1 | Integrated Defense | Small Wonder |
| Intelligence Agency | 400 | 0 | 1 | Espionage | Small Wonder |
| Battlefield Medicine | 500 | 0 | 1 | None | Small Wonder |
| SS Thrusters | 320 | 0 | 0 | Satellites | Improvement |
| SS Engine | 640 | 0 | 0 | Space Flight | Improvement |
| SS Docking Bay | 160 | 0 | 0 | Space Flight | Improvement |
| SS Cockpit | 320 | 0 | 0 | Space Flight | Improvement |
| SS Fuel Cells | 160 | 0 | 0 | Superconductor | Improvement |
| SS Life Support System | 320 | 0 | 0 | Superconductor | Improvement |
| SS Stasis Chamber | 320 | 0 | 0 | Robotics | Improvement |
| SS Storage/Supply | 160 | 0 | 0 | Synthetic Fibers | Improvement |
| SS Planetary Party Lounge | 160 | 0 | 0 | The Laser | Improvement |
| SS Exterior Casing | 640 | 0 | 0 | Synthetic Fibers | Improvement |
| The Internet | 1000 | 0 | 4 | Miniaturization | Great Wonder |
| Civil Defense | 120 | 1 | 0 | Electronics | Improvement |
| Stock Exchange | 200 | 3 | 0 | The Corporation | Improvement |
| Commercial Dock | 160 | 2 | 0 | Mass Production | Improvement |
| The Temple of Artemis | 500 | 0 | 4 | Polytheism | Great Wonder |
| The Statue of Zeus | 200 | 0 | 4 | Mathematics | Great Wonder |
| The Mausoleum of Mausollos | 200 | 0 | 2 | Philosophy | Great Wonder |
| Knights Templar | 300 | 0 | 2 | Chivalry | Great Wonder |
| Secret Police HQ | 200 | 0 | 0 | Espionage | Small Wonder |
