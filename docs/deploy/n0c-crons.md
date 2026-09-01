# Crons — panel PlanetHoster N0C

Ces 6 tâches remplacent les schedules `vercel.json`. À créer dans le panel N0C
(section **Cron**), une par une. Chaque commande appelle la route HTTPS avec le
secret partagé `CRON_SECRET` (même valeur que dans le `.env` de l'app).

Remplacer `<DOMAIN>` par le domaine de production et `<CRON_SECRET>` par le secret.

| Cron                 | Expression    | Route                          |
| -------------------- | ------------- | ------------------------------ |
| outbox-drain         | `*/5 * * * *` | /api/cron/outbox-drain         |
| email-queue-drain    | `*/5 * * * *` | /api/cron/email-queue-drain    |
| order-expiration     | `*/5 * * * *` | /api/cron/order-expiration     |
| verification-cleanup | `0 * * * *`   | /api/cron/verification-cleanup |
| webhook-log-purge    | `0 3 * * *`   | /api/cron/webhook-log-purge    |
| email-job-purge      | `0 3 * * *`   | /api/cron/email-job-purge      |

## Commandes (une par tâche, à coller dans le champ « Commande » du panel)

```
curl -fsS -m 30 -H "Authorization: Bearer <CRON_SECRET>" https://<DOMAIN>/api/cron/outbox-drain >/dev/null 2>&1
curl -fsS -m 30 -H "Authorization: Bearer <CRON_SECRET>" https://<DOMAIN>/api/cron/email-queue-drain >/dev/null 2>&1
curl -fsS -m 30 -H "Authorization: Bearer <CRON_SECRET>" https://<DOMAIN>/api/cron/order-expiration >/dev/null 2>&1
curl -fsS -m 30 -H "Authorization: Bearer <CRON_SECRET>" https://<DOMAIN>/api/cron/verification-cleanup >/dev/null 2>&1
curl -fsS -m 30 -H "Authorization: Bearer <CRON_SECRET>" https://<DOMAIN>/api/cron/webhook-log-purge >/dev/null 2>&1
curl -fsS -m 30 -H "Authorization: Bearer <CRON_SECRET>" https://<DOMAIN>/api/cron/email-job-purge >/dev/null 2>&1
```

## Sécurité — secret exposé sur hébergement mutualisé

Sur mutualisé, la commande cron complète est visible dans `ps`, dans les logs cron du
panel et dans les e-mails d'exécution — le `CRON_SECRET` en clair y apparaît donc.
Mitigation : mettre l'en-tête dans un fichier à permissions `600` et le référencer :

```bash
umask 077
printf 'Authorization: Bearer <CRON_SECRET>\n' > ~/.n0c-cron-auth
chmod 600 ~/.n0c-cron-auth
```

Puis, comme commande de tâche (l'en-tête ne transite plus par la ligne de commande) :

```
curl -fsS -m 30 -H @/home/USER/.n0c-cron-auth https://<DOMAIN>/api/cron/outbox-drain >/dev/null 2>&1
```

## Notes

- N0C déconseille l'exécution _toutes les minutes_ en journée : `outbox-drain` et
  `email-queue-drain` passent de `*/1` (Vercel) à `*/5`. Latence outbox/e-mail
  acceptée : jusqu'à ~5 min.
- Les purges tournent la nuit (`0 3 * * *`) pour lisser la charge.
- Si le panel envoie des e-mails sur stdout : garder le `>/dev/null 2>&1`.
