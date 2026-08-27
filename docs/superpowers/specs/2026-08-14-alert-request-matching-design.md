# Alerte ↔ Demande immobilière — moteur de correspondance

Date: 2026-08-14

## Contexte

Une "Alerte secteur" (`Alert`) est une recherche sauvegardée par un agent. Une
"Demande immobilière" (`PropertyRequest`) enregistre les critères de recherche
d'un client/prospect saisis par un (potentiellement autre) agent. Une
correspondance existe quand une `PropertyRequest` satisfait les critères d'une
`Alert` — l'agent propriétaire de l'alerte est alors notifié.

## Critères de correspondance (stricts)

Entre une `Alert` et une `PropertyRequest` :

- `transactionType` identique
- `propertyType` de la demande ∈ `propertyTypes` (Json string[]) de l'alerte
- `country` identique ET `city` identique
- chevauchement des fourchettes de prix : `[alert.priceMin, alert.priceMax]`
  et `[request.budgetMin, request.budgetMax]` se recoupent. Une borne
  manquante d'un côté n'exclut pas le match sur ce critère (traitée comme
  illimitée).

## Déclenchement (bidirectionnel, temps réel)

- Fin de `POST /api/alerts` (après création) : scanne les `PropertyRequest`
  existantes, calcule les matches pour la nouvelle alerte.
- Fin de `POST /api/requests` (après création) : scanne les `Alert` actives
  (`active = true`) existantes, calcule les matches pour la nouvelle demande.

Pas de tâche planifiée (cron) nécessaire — tout est déclenché à la création.

## Persistance

Nouveau modèle `AlertMatch` :

```
model AlertMatch {
  id                String          @id @default(cuid())
  alertId           String
  alert             Alert           @relation(fields: [alertId], references: [id], onDelete: Cascade)
  propertyRequestId String
  propertyRequest   PropertyRequest @relation(fields: [propertyRequestId], references: [id], onDelete: Cascade)
  createdAt         DateTime        @default(now())

  @@unique([alertId, propertyRequestId])
  @@index([alertId, createdAt])
}
```

Sert de verrou anti-doublon (le `@@unique` empêche de re-notifier deux fois la
même paire) et de source de données réelle pour la section "Correspondances"
de `/alertes/[id]` (remplace le tableau vide actuel).

## Notification

Pour chaque nouveau `AlertMatch` (créé avec succès, donc pas un doublon) :

1. Notification in-app via `createNotification` (jamais `prisma.notification.create`
   directement), `dedupeKey: alert-match:${alertId}:${propertyRequestId}`.
2. Si `alert.notifEmail` : enqueue via l'`EmailQueue` existante (Brevo,
   durable, retries auto — voir `email-queue-singleton.ts`).
3. Si `alert.notifSms` : envoi best-effort via un nouveau
   `src/lib/server/sms.ts` (Brevo Transactional SMS API). Nécessite
   `user.phone`. Best-effort = pas de file durable dédiée (limitation
   documentée, même posture que le CircuitBreaker mono-instance).
4. Si `alert.notifWhatsapp` : envoi best-effort via un nouveau
   `src/lib/server/whatsapp.ts` (Brevo WhatsApp Business API). Nécessite
   `user.phone` + un template WhatsApp pré-approuvé côté compte Brevo
   (`BREVO_WHATSAPP_TEMPLATE_ID`) — configuration hors du contrôle du code.

Chaque canal est indépendant et best-effort : l'échec d'un canal (config
absente, erreur réseau, numéro manquant) est loggé (`log.warn`) et n'annule
ni la création de l'alerte/demande, ni les autres canaux.

## Garde-fou téléphone

- Frontend (`/alertes/new`) : les boutons de canal WhatsApp/SMS sont
  désactivés (avec message) si `user.phone` est vide.
- Backend (`POST /api/alerts`, `PATCH /api/alerts/[id]` si un jour l'édition
  active ces canaux) : rejette (400 `PHONE_REQUIRED`) une requête qui active
  `notifSms` ou `notifWhatsapp` alors que l'utilisateur authentifié n'a pas de
  `phone`.

## Fichiers touchés

**Nouveaux :**
- `frontend/prisma/migrations/.../` (AlertMatch)
- `frontend/src/lib/server/sms.ts`
- `frontend/src/lib/server/whatsapp.ts`
- `frontend/src/lib/server/alerts/matching.ts`

**Modifiés :**
- `frontend/prisma/schema.prisma` (modèle `AlertMatch`, relations)
- `frontend/src/lib/server/notifications/templates.ts` (wrapper `alertMatchNotification`)
- `frontend/src/app/api/alerts/route.ts` (validation téléphone + appel matching)
- `frontend/src/app/api/requests/route.ts` (appel matching)
- `frontend/src/app/api/alerts/[id]/route.ts` (GET renvoie les vrais matches)
- `frontend/src/app/alertes/[id]/page.tsx` (affiche les vrais matches)
- `frontend/src/app/alertes/new/page.tsx` (garde-fou téléphone sur les toggles SMS/WhatsApp)

**Non touchés (protégés) :** `outbox/dispatcher.ts` n'est pas utilisé pour ce
flux — les envois sont déclenchés directement depuis les routes (pas de
webhook, pas besoin de l'invariant transactionnel de l'outbox).

## Limitations connues

- SMS/WhatsApp ne sont pas mis en file durable — un échec réseau ponctuel ne
  sera pas automatiquement réessayé (contrairement à l'email).
- Le payload exact de l'API WhatsApp Brevo (`/v3/whatsapp/sendMessage`) n'a
  pas pu être vérifié en direct (pas d'accès à un compte Brevo configuré
  dans cet environnement) — implémenté d'après la documentation publique,
  à valider une fois `BREVO_WHATSAPP_TEMPLATE_ID` configuré en réel.
