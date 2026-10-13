# H3H Nomera V4.3.1 — Netlify 4KB fix (Android/Termux)

Netlify deployment was blocked by the legacy AWS Lambda compatibility 4 KB aggregate environment-variable size limit. This release migrates both `admin` and `firebase-web-config` to modern Netlify Functions (`.mjs`, default `Request → Response`).

It keeps the old URLs, existing game data, secret names, and all V4.3 racing changes. No Firebase security rules are changed.

**Deploy from Termux using your existing linked project:**

1. Download `H3H_Nomera_V4_3_1_Netlify_Runtime_Fix.zip` into Downloads.
2. In Termux, run these commands (from any directory):

```sh
cd ~/h3h-deploy/H3H_Nomera_Codex
rm -f netlify/functions/admin.js netlify/functions/firebase-web-config.js
unzip -o ~/storage/downloads/H3H_Nomera_V4_3_1_Netlify_Runtime_Fix.zip -d ~/h3h-deploy
npm test
npm run build
netlify deploy --no-build --debug
```

The ZIP wraps all files under `H3H_Nomera_Codex/`, and overwrites only matching paths; your existing `node_modules` and `.netlify` linking are retained.

3. Expect `Deploy URL`. Open the deploy preview and test the game and `/.netlify/functions/admin?action=session`. Before login, a successful configured function should return HTTP 401.
4. After testing, publish production with `netlify deploy --prod --no-build` in the same folder.

**Caution:** Secret values are not included in the ZIP. Keep `FIREBASE_SERVICE_ACCOUNT_JSON`, `NOMERA_ADMIN_PASSWORD_HASH`, and `NOMERA_ADMIN_SESSION_SECRET` in Netlify's Functions environment. Do not paste tokens into chats or upload them into site assets.

Trading and chat still require a secure server-side migration and appropriate database access; this update only repairs the deployment runtime, not Firebase rules or online gameplay.

Docs: https://docs.netlify.com/build/functions/lambda-compatibility/
