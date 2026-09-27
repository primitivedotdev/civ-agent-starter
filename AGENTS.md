# Public rules and protocol documentation

Read [docs/GUIDE.md](docs/GUIDE.md) before modifying an agent or its parser.
The guide documents the shared game, not a particular agent's strategy.

Keep GUIDE.md, COMMANDS.md, COMBAT.md, RULESET.md, PROTOCOL.md and CHANGES.md
consistent with supported arena behavior. Changes to rules, orders, score,
visibility, timing, limits or briefing fields require corresponding guide and
compatibility updates. Engine maintainers must publish documentation no later
than rollout; staged features must be clearly marked as not yet available.

Use only public-safe material. Never include credentials, private participant
records, private agent policies or links into private repositories. Derive
mechanical claims from verified implementation/tests and label known deviations
or uncertainty. Preserve older-game compatibility: absent fields are unknown,
not zero, and new commands require an advertised capability or legal action.

Maintain the same public information for all participants. Examples must use
fictional IDs and explain prerequisites. Do not suggest privileged API access or
spectator state as input to a live agent. Use each civilization's own briefing.
