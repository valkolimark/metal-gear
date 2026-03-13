# Metal Gear — Cycle 25: AI Professor Mode

## Context

Read `CLAUDE.md` and `CHANGELOG.md` before starting. The existing "Ask Metal Gear" AI chat on listing pages and the floating help assistant provide basic Q&A. This cycle upgrades the AI to behave like a domain expert — asking follow-up questions, reasoning about equipment compatibility, and recommending alternatives when appropriate.

**Live app:** https://metal-gear-five.vercel.app  
**GitHub:** valkolimark/metal-gear (branch: main)  
**Supabase project:** fkcyfpdkcrhjieauhchn  
**Vercel team:** team_9n9GosoaraicsoDdbAFgzr5j  
**Vercel project:** prj_HQBv7jMhui6LGW5vzVC5pmCMndlx

---

## Critical Rule (always)

All DB operations MUST use server actions with `createAdminClient()`. Never client-side Supabase calls. Never pass functions from Server Components to Client Components.

## Deployment (always)

```bash
curl -s -X POST "https://api.vercel.com/v13/deployments?teamId=team_9n9GosoaraicsoDdbAFgzr5j" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"metal-gear","project":"prj_HQBv7jMhui6LGW5vzVC5pmCMndlx","gitSource":{"type":"github","ref":"main","org":"valkolimark","repo":"metal-gear"},"target":"production"}'
```

---

## Objective

Upgrade the Ask Metal Gear AI chat (on listing pages) to expert "professor" mode: gather process context through follow-up questions, reason about equipment compatibility, suggest alternatives when the listed item isn't the best fit, and always drive toward a concrete recommendation — not open-ended conversation.

---

## The Core Behavior Change

**Current behavior:** User asks a question, AI answers it. Simple Q&A.

**New behavior:** When a user asks a compatibility or suitability question ("Will this work for my process?", "Is this the right equipment?"), the AI does not immediately answer. Instead it:

1. Identifies that this is a compatibility/suitability question
2. Asks follow-up questions to understand the user's process (see question bank below)
3. Once it has enough context (2–4 exchanges), gives a definitive recommendation
4. If the listed equipment is NOT the right fit, says so honestly and suggests what would be better

The AI should feel like a senior process engineer who happens to know the equipment market — direct, knowledgeable, and oriented toward getting the user to the right outcome, not toward keeping them engaged.

---

## Question Bank by Equipment Category

The AI should ask relevant follow-up questions based on the equipment type being viewed. These are examples — the AI uses its judgment based on context.

**Centrifuges / Separators:**
- What are you separating? (liquid/liquid, liquid/solid, what product?)
- What is your feed flow rate? (GPM or m³/hr)
- What are the particle/solids characteristics? (size, density, abrasiveness)
- What is your target solids dryness / liquid clarity?
- What is the operating temperature and pressure?
- Continuous or batch operation?

**Pumps:**
- What fluid are you pumping? (viscosity, temperature, solids content)
- Required flow rate (GPM) and head pressure (PSI or feet)?
- Continuous duty or intermittent?
- Any ATEX / hazardous area requirements?

**Mixers / Agitators:**
- What are you mixing? (viscosities of components)
- Batch size / vessel volume?
- Desired blend time or shear level?
- Top-entry, side-entry, or bottom-entry preference?

**Heat Exchangers:**
- Hot side and cold side fluids?
- Required heat duty (BTU/hr or kW)?
- Inlet/outlet temperatures for both sides?
- Fouling tendency of the fluids?

**Compressors:**
- Gas being compressed?
- Required flow (SCFM or Nm³/hr) and discharge pressure?
- Oil-free requirement?
- Continuous or intermittent duty?

**General (any equipment):**
- What is your industry and application?
- What problem are you trying to solve?
- What does your current equipment do (if replacing)?
- What is your timeline and budget range?

---

## Alternative Equipment Suggestions

If the user's process requirements do not match the listed equipment, the AI must say so. Example:

> "Based on your 3,000 GPM flow rate and fine particle size, a decanter centrifuge would be undersized for your application. You'd likely get better results with a disc-stack centrifuge or a pressure filter. Want me to help you search for those instead?"

The AI should:
- Be honest when the equipment is a poor fit, not try to make it fit
- Name alternative equipment types specifically
- Offer to search for alternatives (provide a suggested search query the user can use)
- Never recommend the listed item just to complete a sale

---

## System Prompt Upgrade

The `POST /api/listings/[id]/ask` route uses a system prompt to configure the AI. Upgrade it substantially:

```
You are Metal Gear's equipment expert — a senior process engineer and industrial equipment specialist with 20+ years of experience across oil & gas, petrochemical, mining, and manufacturing.

Your role:
- Help buyers determine if specific equipment meets their process requirements
- Ask targeted follow-up questions to understand their application before giving an opinion
- Give direct, honest recommendations — including recommending against a purchase if the equipment is wrong for their process
- Suggest alternative equipment types when appropriate
- Drive every conversation toward a concrete, actionable answer

Rules:
- Never give a compatibility opinion without first understanding the user's process requirements
- Ask 2–4 targeted follow-up questions before rendering a verdict
- When you have enough information, be direct: "Yes, this will work because..." or "No, this won't work because... You need X instead"
- Never be evasive or hedge excessively — industrial buyers make expensive decisions and need clear guidance
- If the user's question is not about compatibility (e.g., "What's the lead time?"), answer it directly without the follow-up flow
- Keep responses concise — this is a mobile-first interface

Equipment context:
[LISTING DATA INJECTED HERE — title, specs, condition, category, manufacturer, model]
```

The listing data (title, manufacturer, model, specs, condition) should be injected into the system prompt at request time from the listing record already fetched by the page.

---

## Conversation Flow Detection

The API route needs to detect the type of question being asked to decide whether to trigger the professor follow-up flow:

**Trigger professor mode** (compatibility/suitability questions):
- "Will this work for..."
- "Is this compatible with..."
- "Can this handle..."
- "Is this right for my..."
- "Would this be suitable..."
- "I need something for..." (buying intent)

**Do NOT trigger professor mode** (factual/logistics questions):
- "What is the lead time?"
- "Can you ship to...?"
- "Is this still available?"
- "What does [spec] mean?"
- "What's the difference between X and Y?"

Detection can be a simple heuristic check in the API route — look for compatibility trigger phrases in the user's message. If detected and conversation history has fewer than 2 AI messages, enter professor mode and ask a follow-up instead of answering directly.

---

## Search Suggestion Integration

When the AI recommends alternative equipment, it should output a structured suggestion the UI can render as a clickable search:

```json
{
  "type": "search_suggestion",
  "query": "disc-stack centrifuge food grade",
  "label": "Search for disc-stack centrifuges"
}
```

The `AskMetalGear` client component should detect this JSON block in the streaming response and render a styled "Search for X →" button that, when tapped, navigates to `/search?q=disc-stack+centrifuge+food+grade` using the AI conversational search.

---

## Suggested Question Chips Update

The 4 starter question chips currently shown in `AskMetalGear` should be updated to reflect the professor mode:

Replace generic chips with:
- "Is this compatible with my process?"
- "What specs should I verify before buying?"
- "What's the alternative if this doesn't fit?"
- "Help me evaluate this equipment"

These chips are category-aware — the API can return different chips based on equipment category (e.g., centrifuge chips differ from pump chips). The route already supports `category`-based suggestions — extend this.

---

## Rate Limit Update

Current rate limit: 20 req/hr for `ask` endpoint. Professor mode conversations use more turns. Raise to:
- Free users: 10 conversations/day (not per-hour — daily cap)
- Pro+: unlimited (or a generous 100/day cap)

Implement this as a daily count check using a simple Redis-free approach: count rows in a session log table within the last 24 hours.

---

## Files to Modify

- `/api/listings/[id]/ask/route.ts` — system prompt upgrade, professor mode detection, search suggestion output
- `src/app/(main)/listings/[id]/components/ask-metal-gear.tsx` — search suggestion rendering, chip updates, conversation flow UI
- Rate limiting logic in the ask route

---

## Edge Cases & Validation

- User asks a compatibility question, then immediately asks a logistics question: AI exits professor mode and answers directly
- AI asks follow-up questions, user provides partial info: AI asks for the remaining critical details before giving verdict
- Listed equipment has no specs in the DB: AI discloses this and asks the user to share the spec sheet or nameplate photo (image input is not yet supported in this chat — note this limitation)
- AI recommends against the listed equipment: this is correct behavior, not a bug. The goal is trust, not conversion.
- Search suggestion: if the user is not on a listing page (e.g., using the help assistant), search suggestions link to the main search page

---

## Success Criteria

- [ ] Compatibility questions trigger follow-up question flow before AI renders verdict
- [ ] AI asks 2–4 relevant questions based on equipment category
- [ ] AI gives direct yes/no compatibility verdict with reasoning after gathering context
- [ ] AI recommends alternatives when listed equipment is a poor fit
- [ ] Search suggestion buttons appear when AI recommends alternatives and navigate correctly
- [ ] Factual/logistics questions answered directly without professor flow
- [ ] Starter chips updated to professor-mode prompts
- [ ] System prompt includes injected listing data (title, specs, condition)
- [ ] No TypeScript errors, no console errors
- [ ] Deployed and verified on listing page for centrifuge and pump equipment types

---

## After Completing This Cycle

1. Update `CHANGELOG.md` with a `[3.6.0]` entry
2. Update `README.md` — document AI professor mode
3. Update `CLAUDE.md` — document system prompt upgrade, professor mode detection, search suggestion format
4. Deploy and verify

---

## Commit Message

```
feat(cycle-25): AI professor mode for equipment compatibility

- Ask Metal Gear detects compatibility questions and enters professor mode
- 2-4 follow-up questions gathered before rendering verdict  
- Direct yes/no compatibility verdict with reasoning
- Honest alternative equipment recommendations when listed item is wrong fit
- Search suggestion cards navigate to conversational search
- Equipment-category-aware starter question chips
- System prompt upgraded with listing specs injected at request time
- Rate limiting updated: 10/day free, 100/day pro+

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
