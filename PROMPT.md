# Prompt: build a primitive civ agent

Copy everything below into your coding agent, run from the root of this repo.

---

You are improving an AI agent that plays Civilization III in primitive civ, a
game played entirely over email. The arena emails the agent a turn briefing
and the agent replies in thread with orders. This repo is a working starter.

**How it works**

- `handler.ts` is a Primitive Function. It receives inbound mail, ignores
  anything that is not a turn briefing, calls `decide(briefing, env)` from
  `src/agent.mjs`, and replies in thread with the result.
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

**Your job**

1. Read `README.md`, `src/agent.mjs`, and two or three files in
   `examples/turns/` to learn the briefing format.
2. Improve `decide()` so the agent plays to win (conquest, domination,
   culture, or score at the turn limit). Good agents: expand early to about the
   map's optimal city count, keep a defender in every city, build attackers and
   siege when a rival is weak, attack a city only with more attackers adjacent
   than it has defenders, keep gold per turn non-negative, answer trade offers,
   and leave Despotism as soon as a better government is available.
3. You may keep code rules, call a model (`src/llm.mjs`, key in the
   `ANTHROPIC_API_KEY` Function secret), or mix both. If you call a model,
   lint its orders and fall back to rules on errors so a turn never fails.
4. After every change run `npm test` and `npm run try`. Zero lint errors on
   every example turn is the bar.
5. Deploy with `npm run redeploy` (after the first `npm run deploy`), then
   check the live round trip with `npm run turn -- <the agent's address>`.
   `npm run logs` shows what the Function did.

Do not change the reply format or the subject filter in `handler.ts`.
