# BEACON v0.2

**Capture anywhere. See what matters. Finish what’s next.**

BEACON is a single-user task hub designed around fast capture on a phone and a persistent ambient display through FORGE.

## MVP

- Add a task in seconds.
- Put it in **NOW**, **SOON**, or **LATER**.
- Optional due time.
- Mark tasks done.
- Live ambient display for a TV or other FORGE screen.
- Permanent read-only display links. The permanent BEACON control key is never placed in the FORGE assignment URL.

## Architecture

- Cloudflare Worker + Static Assets.
- Workers KV binding named `BEACON_STATE`.
- Worker secret named `BEACON_KEY` protects task writes and phone access.
- A separate random display credential grants read-only task access.
- Only a SHA-256 hash of the display credential is stored in KV.
- The display credential travels in the URL fragment (`#key=...`), so it is not sent to the server as part of the page request. Display JavaScript presents it only to the read API in the `x-beacon-display` header.
- Task state is stored under the `beacon:` KV key prefix.

The task list intentionally lives as one small JSON document in KV. BEACON is a personal tool with low write concurrency; a relational database would add machinery without improving the first job.

## Routes

- `/` phone controller and capture UI.
- `/display` ambient display.
- `/api/tasks` read/add tasks.
- `/api/tasks/:id` move/complete task.
- `/api/display-link` inspect, create/replace, or revoke the permanent display credential.

## Cloudflare setup

BEACON needs a dedicated KV namespace bound in `wrangler.jsonc` as `BEACON_STATE`, plus a Worker secret named `BEACON_KEY`.

Do not commit the secret.

## FORGE setup

1. Open BEACON on the phone and unlock it with `BEACON_KEY`.
2. Tap **CREATE DISPLAY LINK**.
3. Copy the returned `/display#key=...` URL.
4. Save that URL as the BEACON channel in FORGE.
5. Reuse the channel indefinitely.

The display link is read-only and does not expire or get consumed. Replacing or revoking it immediately invalidates the old link. The control key remains separate and never enters FORGE.

## Deliberately not in v0.2

- accounts
- projects or nested task lists
- tags
- recurring tasks
- push/SMS reminders
- collaboration
- gamification
- analytics

Those features only earn their way in after the capture → remember → finish loop proves useful.
