# Messages Inbox — Banani → Next.js/Tailwind

## Source
- Banani screen ID: `u_egjun0aqjO` ("Messages Inbox")
- Fetched: 2026-08-03

## Scope
Front-end only, static data — no `Conversation`/`Message` Prisma model, no
API wiring, no real-time (Ably not wired for this pass). Same convention as
every prior screen this session.

## Route
`/messages` — `frontend/src/app/messages/page.tsx`. First screen this
session to activate the sidebar's "Messages" nav entry — `DashboardShell.tsx`
and `BottomNav.tsx` both had it declared but inert (`href` omitted); both
switched to `href: '/messages'`.

## Component breakdown
- **REUSE** `DashboardShell`, `cn`.
- **NEW** page-local static data: `CONVERSATIONS` (7 entries, literal from
  the Banani mockup) each carrying its own property-context block
  (image/title/location/ref/price/verified) so switching conversations
  updates the chat header + property bar, not just the message list.
  Conversation 1 (Aïcha Diallo / Villa Cocody) is the mockup's
  active/selected conversation — its property context and its **8-message
  transcript** (incl. the visit-request card and the trailing typing
  indicator) are the literal fetched content. The other 6 conversations get
  a short 2-message illustrative transcript (their own list preview as the
  incoming message + a generic agent reply) — flagged as illustrative, same
  convention as the `/alertes/[id]` and `/demandes/[id]` non-primary records.
- No new shared lib — this data isn't consumed by any other route yet (no
  "conversation detail" URL exists in the mockup; the two-panel view IS the
  detail view).

## Layout decision
`DashboardShell`'s content slot is a padded, vertically-stacking flex
container (`p-4 lg:p-7`, `overflow-y-auto`) meant for stat cards/tables — a
true split-pane chat UI needs a bounded-height container with its own
internal scroll regions instead. Wrapped the whole messages UI in one
`rounded-2xl bg-white` card sized `h-[75vh] min-h-[560px]`, with the
conversation list and the chat transcript each independently
`overflow-y-auto` inside it. `DashboardShell` itself was not modified beyond
the two nav-href changes above.

## Responsive plan
- **Base (375px)**: single-pane — `mobileView` state (`'list' | 'chat'`)
  toggles between the conversation list (full width) and the open chat (full
  width, with a back-arrow in the chat header that returns to the list).
  Filter tabs scroll horizontally. Property-context bar and message bubbles
  shrink their max-width to accommodate the narrower viewport.
- **lg (1024px+)**: real Banani two-column split — 320px conversation list +
  flexible chat panel, both visible at once, no `mobileView` toggle needed
  (state still exists but is ignored above `lg:`).

## Interactions / state
- Selecting a conversation — real state, switches the active conversation,
  marks it read (removes its unread dot), updates header/property
  context/transcript. On mobile, also flips `mobileView` to `'chat'`.
- Filter tabs (Tous/Non lus/Visites/Archivés) — **Tous** and **Non lus** are
  real client-side filters; **Visites** filters to the one conversation that
  has a visit-request card (`hasVisit`); **Archivés** shows a real empty
  state (no conversation is archived in the mock data).
- Conversation search — real client-side filter on name/property tag.
- Chat input box, send button, attachment/emoji icons, header phone/calendar
  actions, "Voir l'annonce", visit card's "Confirmer"/"Proposer autre date"
  — all inert, `disabled` + "Bientôt disponible" (no messaging backend
  exists), same convention as every sibling screen.
- Typing indicator is static (always shown under Aïcha's conversation,
  matching the mockup) — not a real "agent is typing" simulation.

## Open questions for user
None — same explicit "front-end only, static data" scope repeated across
every screen this session. Non-primary conversations' transcripts are an
explicit, disclosed simplification (only conversation 1 was fully fetched).
