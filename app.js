// app.js — point d'entrée Phusion Passenger (PlanetHoster N0C, CloudLinux selector).
//
// Passenger lance ce fichier avec `node app.js`, fournit le port d'écoute via
// process.env.PORT (souvent un chemin de socket Unix) et attend que le process
// écoute dessus. Le serveur standalone de Next (frontend/server.js) lit
// process.env.PORT / process.env.HOSTNAME et sert l'app + .next/static + public.
//
// Ce wrapper charge l'environnement puis délègue.
'use strict';

const fs = require('fs');
const path = require('path');

// 1. Charger les variables d'environnement depuis <appRoot>/.env.
//    Le gestionnaire Node.js du panel N0C (v7.1.x) n'a pas d'UI de variables
//    d'environnement : l'app root porte un fichier .env (hors du repo, exclu du
//    rsync) qui est la source unique des variables runtime. Parseur minimal,
//    zéro dépendance ; une variable déjà présente dans process.env gagne.
try {
  const envPath = path.join(__dirname, '.env');
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!key || key in process.env) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
} catch (err) {
  if (err.code !== 'ENOENT') throw err;
  // Pas de .env : on continue — les variables peuvent venir de l'environnement
  // Passenger. env.ts lèvera au boot si une variable requise manque.
}

// 2. Production par défaut.
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// 3. Le serveur standalone Next fait `hostname ?? '0.0.0.0'` mais certaines
//    versions passent la valeur à server.listen() telle quelle ; sur CloudLinux
//    une valeur non résolvable fait crasher `getaddrinfo`. On fige une IPv4 locale.
if (!process.env.HOSTNAME || process.env.HOSTNAME === '0.0.0.0') {
  process.env.HOSTNAME = '127.0.0.1';
}

// 4. Déléguer au serveur standalone généré par `next build`.
//    Layout monorepo pnpm : .next/standalone/frontend/server.js.
require('./frontend/server.js');
