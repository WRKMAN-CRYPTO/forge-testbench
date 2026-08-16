# FORGE Viewer v0.1

A deliberately small persistent-screen system:

**DEVICE → URL**

The TV stays on `/view/<device-id>`. A phone opens `/control.html`, selects the same device, and assigns a project URL. The TV checks for assignment changes every 10 seconds without navigating away from the FORGE shell.

## MVP behavior

- One persistent viewer per device ID.
- One current URL assignment per device.
- Phone-first controller.
- Shared control key protects writes.
- Viewer polling failures do not destroy the currently displayed project.
- Last assignment is cached locally on the display and restored when the shell itself is available.
- HTTPS-only project assignments, except localhost during development.
- No accounts, schedules, playlists, analytics, telemetry, or project database.

## Important MVP boundary

Projects are shown in an `<iframe>`. A project must permit embedding. Sites that send restrictive `X-Frame-Options` or CSP `frame-ancestors` headers will refuse to render inside FORGE. That is intentionally left as a v0.1 boundary rather than introducing a content proxy.

Browsers also do not provide a reliable cross-origin signal that distinguishes a successfully rendered page from a page blocked by frame policy. FORGE therefore preserves the last assigned URL but cannot prove arbitrary third-party content rendered correctly.

## Cloudflare setup

This project targets Cloudflare Workers + Workers Static Assets + Workers KV.

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create a KV namespace:

   ```sh
   npx wrangler kv namespace create FORGE_STATE
   ```

3. Put the returned namespace ID into `wrangler.jsonc` in place of `REPLACE_WITH_KV_NAMESPACE_ID`.

4. Set the controller secret:

   ```sh
   npx wrangler secret put CONTROL_KEY
   ```

5. Run locally:

   ```sh
   npm run dev
   ```

6. Deploy:

   ```sh
   npm run deploy
   ```

Cloudflare recommends `wrangler.jsonc` for new projects, Workers Static Assets for front-end assets, and bindings for in-Worker access to platform resources. This project follows that shape.

## Use

Controller:

```text
https://<your-worker>/control.html
```

Viewer for the first TV:

```text
https://<your-worker>/view/forge-01
```

Open the viewer on the TV and leave it there. Open the controller on a phone, enter `forge-01`, paste a frameable HTTPS project URL, enter the control key, and assign it.

## Failure rules

- Control API unavailable: keep showing the current project.
- Bad assignment syntax: reject it before replacing the existing assignment.
- TV reloads while online: recover the current assignment from KV.
- Viewer shell reloads after previously loading an assignment: try the locally cached assignment immediately, then reconcile with the control API.
- Project itself is down or blocks framing: browser limitations mean v0.1 cannot always diagnose this reliably; the assignment remains intact so the controller can replace it.

## v0.1 acceptance test

1. Open `/view/forge-01` on the TV.
2. Assign Project A from the phone.
3. Confirm the TV changes without being touched.
4. Assign Project B.
5. Confirm the TV changes again.
6. Interrupt the control API/network while a project is already displayed.
7. Confirm the current display is not deliberately blanked by FORGE.
8. Restore connectivity and assign Project A again.
9. Reload the viewer while online and confirm the current assignment returns.

If those pass, the core product exists.
