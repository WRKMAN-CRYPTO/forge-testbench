# Magic Lab 054 · Soundtrack Assets

The two user-supplied MP3 files are preserved verbatim. This directory is their expected public hosting location:

- `a-new-journey.mp3` — main screen and noncombat exploration (2:30.936).
- `wizard-life.mp3` — battle music (1:58.776).

**Binary upload requirement:** The source files were provided as ChatGPT attachments, but the connected GitHub writer supports UTF-8 source updates rather than directly ingesting those local MP3 bytes. Until these two binary files are uploaded to this directory, use the **IMPORT MUSIC** button from the opening screen or ☰ → **IMPORT MP3** in the game. Choose both named MP3s on your device. They are stored in that browser's IndexedDB and used immediately without page refresh.

To enable music for every visitor, upload both files into `magic-lab/audio/` under the exact lowercase names above. The game automatically checks hosted files when a local import is not saved. No code edits needed once they exist.

## Build 054 playback

- The title/intro screen can start *A New Journey* via an explicit tap, meeting iPhone's gesture restrictions. ENTER THE LAB also attempts to start sound.
- Nearby hostile creatures (within ~300 world units) cause *Wizard Life* to take over. Neutral Mosslings are ignored. Combat music falls back to *A New Journey* after ~6.4 seconds out of danger.
- State changes crossfade over 2.4 seconds. A running track fades in for ~1.35 seconds after looping, fades out over its final ~2.7 seconds, and rewinds shortly before ending.
- `music.js` uses HTML audio streams through Web Audio MediaElementSource + GainNode for iOS-compatible volume changes. It does not allocate full-length decoded buffers.
- The browser menu includes MUSIC ON/OFF, VOLUME, IMPORT MP3. Volume and mute state are saved per browser.
- Phone tab/app backgrounding pauses music; foregrounding attempts to resume. iOS may require a new tap to authorize playback.

This system adds no new render bodies, physics listeners, canvas objects, or rune overhead. `magic-lab/music.js` is independent of the combat engine. 

### Manual audio QA
1. Import both files via iPhone Files picker. Title plays *A New Journey*.
2. Enter lab, approach a Charger or Glassrunner; battle score crossfades in.
3. Walk away or visit Sanctuary; wait a few seconds; main score returns.
4. Listen through a full duration to verify fade/restart and no click/pop.
5. Test mute, the 40%/68%/90% volume cycling, browser reload, background/foreground, and an offline/slow connection.
