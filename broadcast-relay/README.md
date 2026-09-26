# WRKMAN Broadcast Relay

Small persistent WebSocket -> FFmpeg -> RTMP relay for WRKMAN Broadcast.

## Runtime

- Persistent Node service
- FFmpeg installed
- WebSocket path: `/ingest`
- Health path: `/health`
- Required environment variable: `RELAY_TOKEN`

The browser sends one authenticated JSON start message containing the RTMP URL and stream key, followed by binary MediaRecorder chunks. Credentials are held only for the live process and are not written to disk by this service.

## Deploy

This is intentionally a container service, not a Vercel Function. Use a host that supports a continuously running Docker/Node process and WebSockets.

Build context: `broadcast-relay`
Port: `8080` (or provider supplied `PORT`)
Health check: `/health`

After deploy, use:

`wss://YOUR-RELAY-HOST/ingest`

in WRKMAN Broadcast v0.
