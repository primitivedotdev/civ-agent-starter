<!--
For people: paste the text below into your coding agent (Claude Code, Cursor,
...), or just tell it "read PROMPT.md and follow it with <ADDRESS> = <your
agent's address>". primitiveciv.com/play gives you that one-liner with your
address filled in.
-->

You are setting up and then improving an AI agent that plays Civilization III
in primitive civ, a game played entirely over email. The arena emails the agent
a turn briefing and the agent replies in thread with orders. This repo is a
working starter. The agent's address is `<ADDRESS>`.

**Set it up (do this first)**

Needs Node 22 or newer.

1. Get into a clone of this repo (`git clone https://github.com/primitivedotdev/civ-agent-starter.git && cd civ-agent-starter`
   if there is none yet), then run `npm install`. An npm warning about
   esbuild's install script is harmless.
2. `npm run setup -- <ADDRESS>`. This deploys the agent as a Primitive
   Function, routes every mailbox on the address's domain to it, and plays one
   live turn. It remembers the address and function in
   `.primitive/function.json`, so later runs are just `npm run setup`. If the
   Primitive CLI is not signed in, it opens a browser sign-in: tell me to
   approve it and wait. If it says the domain already sends its mail to
   another function, ask me before re-running with `--takeover`.
3. Setup prints who plays: "a model" or "the built-in rules". If it is the
   rules and I have an Anthropic key, ask me to put it in `.env` as
   `ANTHROPIC_API_KEY=...` (copy `.env.example`; never paste the key into this
   chat), then run `npm run setup` again.
4. When the live turn passes, ask me for a public username (shown on the
   leaderboard) and run `npm run join -- --username <name>`. It qualifies the
   agent with the arena's test turn and queues it for the next game; if a
   check fails, fix what it says, run `npm run setup`, and join again.

**How it works**

- `handler.ts` is a Primitive Function and harness. It trusts only the arena
  and the listed mailboxes of games the agent is in, keeps per-game state in
  Primitive memories, calls `decide(briefing, env, game)` from `src/agent.mjs`
  for each turn briefing, and replies in thread with the result. Letters
  between civs go through `<DIPLOMACY to="Civ">...</DIPLOMACY>` blocks in the
  reply and `onLetter()` (see README, Diplomacy).
- The reply must contain one `<ORDERS>[ ... ]</ORDERS>` block holding a JSON
  array of orders. Only the last such block counts. Replies must arrive within
  120 seconds.
- `src/briefing.mjs` parses a briefing into data. Every unit and city lists
  the actions it can legally take this turn; only use ids and options the
  briefing lists. The briefing's footer lists every order type.
- `src/lint.mjs` checks orders against their briefing. Error-level findings
  mean the engine will refuse the order.
- `examples/turns/` has real briefings. `npm run try` runs the agent over all
  of them and lints the replies; `npm run try -- <file>` shows one full reply.

**Then make it win**

1. Read `README.md`, `src/agent.mjs`, and two or three files in
   `examples/turns/` to learn the briefing format.
2. Improve `decide()` so the agent plays to win (conquest, domination,
   culture, or score at the turn limit). Good agents: expand early to about the
   map's optimal city count, keep a defender in every city, build attackers and
   siege when a rival is weak, attack a city only with more attackers adjacent
   than it has defenders, keep gold per turn non-negative, answer trade offers,
   and leave Despotism as soon as a better government is available.
3. You may keep code rules, call a model (`src/llm.mjs`), or mix both. If you
   call a model, lint its orders and fall back to rules on errors so a turn
   never fails.
4. After every change run `npm test` and `npm run try`. Zero lint errors on
   every example turn is the bar, and the score `npm run try` prints (out of
   100, with the change since the last run and what cost points) should go
   up; read its notes to pick the next thing to fix. Once the agent has played a real game,
   `npm run replay -- <game-id>` saves the briefings it received and
   `npm run try -- examples/games/<game-id>` scores changes against them. Then `npm run setup` redeploys and plays a
   live turn; `npm run logs` shows what the Function did.

Do not change the reply format or the trust checks in `handler.ts`.
