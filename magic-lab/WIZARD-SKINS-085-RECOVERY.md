# Wandrune 085: Wizard Skin Recovery (Fire Debug Preserved)

**Status:** Isolated bugfix branch. The existing Pass A fire detector, camera registration, Physics 038, player movement, gameplay and rune logic are untouched.

## Report

User's 23-second iPhone recording shows the original vector wizard rather than the selected 20-skin character art. The wardrobe's large preview and **all 20 thumbnails are blank**. Selected design 08 is visible, so the UI selection exists even though the imagery failed to appear.

## Diagnosis and scope

The original 013 WebP sprite atlas and 013 PNG hue mask are both present and byte-identical in GitHub's main and Pass A branches. The Vercel preview can return the atlas with HTTP 200 via server inspection. The phone's exact failed load or decode reason remains unverified. Because the same browser issue affects both the Phaser character and CSS thumbnails, the right response is to make asset delivery resilient and observable, **not change Pixi cluster physics or replace the artist's wizard art**.

## Fix

1. A dedicated `skins/wizard-skin-backup-085.js` packages the **unchanged original** 013 atlas and original 013 dye mask, and creates local `blob:` image URLs at startup. This avoids dependence on per-preview asset path, CDN image response type, and long CSS data-URI property limits.
2. The wardrobe's CSS thumbnails and large preview now use the same local original sprite atlas even if Phaser has not finished loading the in-world sprite.
3. Phaser's `loadCosmetics()` attempts the bundled 013 source first, remote 013 second, and existing older WebP 012 last. If one source fails, the others remain available.
4. The selected-skin storage key `wrkman-arcane-lab010-skin-selected`, keeper key, existing Hue Forge palette format and 20-skin frame indexing remain unchanged. A successful load applies `activeSkin-1` exactly as before, as well as existing dye material if available.
5. The wardrobe now shows its image status and displays a **RETRY ART** button on total failure. The gameplay and spells are never reset by a retry.
6. All image sourcing is local to the *new preview*. Because Vercel preview hosts are different browser origins, old preview localStorage selections may not automatically transfer. Re-select a design once on the new preview if necessary. Nothing is deleted on other origins.

## Verification

- Unchanged original WebP RIFF/WEBP signatures and PNG signature, atlas 90,574 bytes, mask 6,067 bytes.
- Mock backup module produces a `blob:` WebP and PNG URL with exactly those byte counts and MIME types.
- Loader simulation: skin 08 uses spritesheet frame 7 on bundled success, also on remote 013 fallback, and reports a clear error only after all sources fail.
- `node magic-lab/wizard-skin-recovery.tests.js` covers bundle integrity, skin save keys, source order and local Blob URLs.
- Existing fire cluster, camera, formation, material regression suites remain valid.
- Real iPhone must confirm original artwork appears in wardrobe and on player; syntax checks and mock tests are not visual proof.

## Device test

Open new branch preview; select SKINS. The large preview and all twenty thumbnails should be visible. Tap design 08 and return to game. The wizard should use design 08, not the classic circle/hat fallback. Open HUES to verify original dye colors. Turn FIRE GROUPS ON and cast a dense fire spell: fire detection must remain unchanged. If artwork fails, the wardrobe should show a clear status and **RETRY ART**.

**Do not merge until the user confirms normal skins and fire detection simultaneously.**
