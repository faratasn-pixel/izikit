// app.js — point d'entrée Phusion Passenger (PlanetHoster N0C, CloudLinux selector).
//
// Passenger lance ce fichier avec `node app.js`, fournit le port d'écoute via
// process.env.PORT (souvent un chemin de socket Unix) et attend que le process
// écoute dessus. Le serveur standalone de Next (frontend/server.js) lit
// process.env.PORT / process.env.HOSTNAME et sert l'app + .next/static + public.
//
// Ce wrapper se contente de normaliser l'environnement puis de déléguer.
'use strict';

// 1. Charger .env si Passenger ne l'a pas déjà injecté (défensif — le panel N0C
//    charge .env à l'Application Root, mais pas toujours selon la config).
try {
  require('./node_modules/dotenv').config({ path: __dirname + '/.env' });
} catch (_) {
  /* dotenv absent en local hors bundle : les vars viennent alors du shell */
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
