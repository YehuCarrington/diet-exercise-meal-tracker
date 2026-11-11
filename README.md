# Plateful

Installable web app (PWA): four planned plates a day with times and portions, for losing, gaining or holding weight. Training plan, habit calendar, weight trend, shopping list.
Runs as one Cloudflare Worker: static files from `public/`, plus `/api/state`, which stores one JSON document in KV so every device shows the same data.

## Deploy

Needs Node 18+ and a domain already on your Cloudflare account.

```sh
npx wrangler login
npx wrangler kv namespace create CUTPLAN      # copy the id into wrangler.toml
# edit wrangler.toml: set the KV id and your hostname (pattern = "habitapp.yehu.dev")
openssl rand -base64 32                        # this is your sync key, keep it
npx wrangler secret put SYNC_KEY               # paste the key when asked
npx wrangler deploy
```

Wrangler changes often. If a command or config key is rejected, check the current Workers docs for static assets, KV bindings and custom domains.

## Google sign-in

Each person signs in with Google and gets their own private copy of their data. One-time setup:

1. In Google Cloud Console, create a project, then APIs & Services, OAuth consent screen: choose External, fill in the app name and your email, and publish it (or add your friends as test users).
2. Credentials, Create credentials, OAuth client ID, type "Web application".
   - Authorised redirect URI: `https://habitapp.yehu.dev/api/auth/callback`
3. Store the three secrets:

```sh
npx wrangler secret put GOOGLE_CLIENT_ID       # from step 2
npx wrangler secret put GOOGLE_CLIENT_SECRET   # from step 2
npx wrangler secret put SESSION_SECRET         # any long random string; changing it signs everyone out
```

Until all three are set the app hides the sign-in button and keeps working on-device. The old `SYNC_KEY` still works under More, Setup, "Use a sync key instead".

Sign in with Apple is not included: it needs a paid Apple Developer account. The Worker is laid out so a second provider can be added beside Google.

Recipe import (`/api/import`) reads the public schema.org Recipe data from a page and only works for signed-in users.

## Deploy from GitHub

`.github/workflows/deploy.yml` deploys on every push to `main`. One-time setup:

1. Do the first deploy by hand as above (it creates the KV namespace, the secret and the custom domain).
2. In Cloudflare, create an API token from the "Edit Cloudflare Workers" template.
3. In the GitHub repo, Settings, Secrets and variables, Actions: add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

After that, a push to `main` is live in about a minute. `SYNC_KEY` stays in Cloudflare and is never in the repo.

## Install on iPad or iPhone

1. Open `https://habitapp.yehu.dev` in Safari.
2. Share, then Add to Home Screen.
3. Open it from the home screen, go to Setup, paste the sync key, tap Connect. The Today screen should say "Synced".
4. Repeat on each device with the same key.

Add it to the home screen before logging data. Safari and the home-screen app keep separate storage, though with sync on both will pull the same data.

## How sync behaves

- Each device keeps a full local copy, so the app works offline.
- On open, and whenever the app comes back to the foreground, it fetches the server copy and takes whichever is newer.
- Every change is pushed about a second after you make it.
- It is whole-document, newest wins. If you log on two devices while one is offline, the later save replaces the earlier one. The server refuses a push that is older than what it holds, and that device then picks up the newer copy.
- Setup has a Backup box to copy or restore everything by hand.

## Security

The sync key is the only thing protecting your data. Anyone with the URL can load the app shell, but the API returns nothing without the key.
For a second layer, put the hostname behind Cloudflare Access (Zero Trust) with your email as the only allowed user.

## Updating

Edit `public/index.html`, bump `VERSION` in `public/sw.js`, run `npx wrangler deploy`.
Recipes are in the `MEALS` object, the weekly rotation in `WEEK`, the shopping list in `SHOP`.
The three training days are in `WORKOUTS`. Screens are the `vToday`, `vPlan`, `vTrain`, `vTrack` and `vMore` functions.

## Local test

```sh
echo 'SYNC_KEY="dev"' > .dev.vars
npx wrangler dev
```
