# BEACON v0.1

**Capture anywhere. See what matters. Finish what’s next.**

BEACON is a single-user task hub designed around fast capture on a phone and a persistent ambient display through FORGE.

## MVP

- Add a task in seconds.
- Put it in **NOW**, **SOON**, or **LATER**.
- Optional due time.
- Mark tasks done.
- Live ambient display for a TV or other FORGE screen.
- One-time display pairing links. The permanent BEACON control key is never placed in the FORGE assignment URL.

## Architecture

- Cloudflare Worker + Static Assets.
- Workers KV binding named `BEACON_STATE`.
- Worker secret named `BEACON_KEY` protects task writes and phone access.
- TV display gets a long-lived HttpOnly session by exchanging a one-time pairing link.
- Task state is stored under the `beacon:` KV key prefix.

The task list intentionally lives as one small JSON document in KV for v0.1. BEACON is a personal tool with low write concurrency; a relational database would add machinery without improving the first job.

## Routes

- `/` phone controller and capture UI.
- `/display` ambient display.
- `/api/tasks` read/add tasks.
- `/api/tasks/:id` move/complete task.
- `/api/pair` create a one-time display link.
- `/api/display-session` exchange a pair token for a display session.

## Cloudflare setup

Before production deploy, add a dedicated KV namespace and put it in `wrangler.jsonc`:

```jsonc
"kv_namespaces": [
  {
    "binding": "BEACON_STATE",
    "id": "YOUR_NAMESPACE_ID"
  }
]
```

Then add a Worker secret named `BEACON_KEY`.

Do not commit the secret.

## FORGE setup

1. Open BEACON on the phone and unlock it with `BEACON_KEY`.
2. Tap **CREATE PAIR LINK**.
3. Copy the returned one-time `/display?pair=...` URL.
4. Assign that URL to the desired FORGE device.
5. On first load, BEACON exchanges the token for an HttpOnly display session and removes the pair token from its visible URL.

Pair links expire after 10 minutes and can only be used once.

## Deliberately not in v0.1

- accounts
- projects or nested task lists
- tags
- recurring tasks
- push/SMS reminders
- collaboration
- gamification
- analytics

Those features only earn their way in after the capture → remember → finish loop proves useful.
