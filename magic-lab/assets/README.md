# Wandrune Title Artwork

The game now launches with a dedicated full-viewport title overlay (Build 055).

To publish the **exact original** supplied artwork for everyone, upload the original JPEG to:

`magic-lab/assets/wandrune-title.jpg`

The file should be 1536 × 864, landscape 16:9. The filename and path must match exactly, including lowercase spelling.

### Works without hosting yet

On a new browser, if the hosted JPEG has not been uploaded, the title overlay displays a branded fallback and an **IMPORT TITLE ART** button. Importing a JPEG, PNG, WebP or AVIF saves the image in that browser's IndexedDB. It is displayed on future visits on that device, including before the game opens. The original uploaded image is recommended.

Audio controls are on the title overlay:
- **♫ PLAY MUSIC** starts A New Journey with an actual user gesture for iOS.
- **IMPORT MUSIC** loads the two MP3 tracks into the existing local audio library.
- **✦ ENTER WANDRUNE** fades out the full-screen title and enters the arena.

The old welcome tutorial is no longer automatically shown. It remains under the game's ☰ → **HOW TO PLAY** menu and closes with **BACK TO WANDRUNE**.

Internal file paths remain under `magic-lab/` to preserve browser saves and existing integrations.
