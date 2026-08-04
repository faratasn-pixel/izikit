# Contacts Reçus — Banani → Next.js/Tailwind

## Source
- Banani screen ID: `fu-2n-YWUFP8` ("Contacts Reçus")
- Fetched: 2026-08-03

## Scope
Front-end only, static data — no `Contact` Prisma model, no API wiring. Same
convention as every prior screen this session.

## Route
`/contacts` — `frontend/src/app/contacts/page.tsx`. Activates the sidebar's
"Contacts reçus" nav entry (`NavKey = 'contacts'`, already declared in
`DashboardShell.tsx`/`BottomNav.tsx` but inert) — switched to
`href: '/contacts'` on the desktop sidebar entry (no mobile bottom-nav slot
for "contacts", stays on the fixed 5-tab set).

## Component breakdown
- **REUSE** `DashboardShell`, `cn`.
- **NEW** page-local static array `MOCK_CONTACTS` (6 contacts, literal from
  the Banani mockup: Amavi Kodjovi, Fatoumata Diallo, Koffi Assiongbon, Ama
  Owusu, Sékou Traoré, Emmanuel Gbénou) — each carries the fields the detail
  panel needs (budget, activity feed, notes) so selecting a row updates the
  right-hand panel with real per-contact data, not just the table row.
- No shared lib — this data isn't consumed by any other route (no contact
  detail URL in the mockup; the side panel IS the detail view, same pattern
  choice as `/messages`).

## Token mapping
Same Tailwind/brand mapping as the rest of the app. Badge colors: `Achat`/
`Location` → `blue` (brand), `En attente` → `amber`, `Répondu`/`Visite
planifiée` → `green` (emerald), `Non qualifié` → `red`.

## Responsive plan
- **Base (375px)**: stat cards `grid-cols-2`, filters bar wraps, table
  wrapped in `overflow-x-auto` (Téléphone/Annonce/Motif/Date columns hidden
  below `lg:`, same `mobileHidden` column convention as `/demandes` and
  `/listings`), detail panel moves **below** the table (`order-last`,
  full-width) instead of a fixed side column.
- **lg (1024px+)**: `contacts-layout` becomes `flex` — table `flex-1` +
  300px-wide sticky detail panel, matching the Banani desktop mockup.

## Interactions / state
- Selecting a table row — real client state (`selectedId`), updates the
  right panel (avatar/name/status badge/email/phone/annonce/budget/date +
  its own activity feed). Selected row gets a highlighted background.
- "Statut"/"Cette semaine"/"Annonce" filter selects, "Liste"/"Grille" toggle,
  "Exporter", "Ajouter un contact", per-row action icons (message/calendar/
  more), "Envoyer un message", "Planifier une visite", "Enregistrer" (notes),
  pagination — all inert, `disabled` + "Bientôt disponible", same convention
  as every sibling screen (no `Contact` model to act on).
- Search input — real client-side filter on name/annonce.
- Notes textarea — real local `useState` per contact (typing persists while
  browsing other contacts and back, in-memory only — not saved anywhere,
  "Enregistrer" stays inert).

## Open questions for user
None — same explicit "front-end only, static data" scope repeated across
every screen this session.
