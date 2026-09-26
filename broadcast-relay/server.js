import http from 'node:http';
import { spawn } from 'node:child_process';
import { WebSocketServer, WebSocket } from 'ws';

const PORT = Number(process.env.PORT || 8080);
const RELAY_TOKEN = process.env.RELAY_TOKEN || '';
const MAX_BUFFERED_STDIN = 24 * 1024 * 1024;
const MAX_SESSION_MS = 6 * 60 * 60 * 1000;

if (!RELAY_TOKEN) {
  console.error('RELAY_TOKEN is required.');
  process.exit(1);
}

function send(ws, payload) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
}

function cleanRtmpUrl(value) {
  const v = String(value || '').trim();
  if (!/^rtmps?:\/\//i.test(v)) throw new Error('RTMP URL must begin with rtmp:// or rtmps://');
  return v.replace(/\/+$/, '');
}

function cleanStreamKey(value) {
  const v = String(value || '').trim();
  if (!v || v.length > 512) throw new Error('Invalid stream key');
  if (/\s/.test(v)) throw new Error('Stream key cannot contain whitespace');
  return v;
}

function buildTarget(rtmpUrl, streamKey) {
  return `${cleanRtmpUrl(rtmpUrl)}/${cleanStreamKey(streamKey)}`;
}

function startFfmpeg(target) {
  const args = [
    '-hide_banner',
    '-loglevel', 'warning',
    '-fflags', '+genpts+nobuffer',
    '-i', 'pipe:0',
    '-map', '0:v:0',
    '-map', '0:a:0?',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-tune', 'zerolatency',
    '-pix_fmt', 'yuv420p',
    '-profile:v', 'main',
    '-level', '4.0',
    '-r', '30',
    '-g', '60',
    '-keyint_min', '60',
    '-b:v', '2500k',
    '-maxrate', '2800k',
    '-bufsize', '5000k',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '44100',
    '-ac', '2',
    '-f', 'flv',
    target
  ];
  return spawn('ffmpeg', args, {
    stdio: ['pipe', 'ignore', 'pipe'],
    windowsHide: true
  });
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, {'content-type': 'application/json', 'cache-control': 'no-store'});
    res.end(JSON.stringify({ok: true, service: 'wrkman-broadcast-relay'}));
    return;
  }
  res.writeHead(404, {'content-type': 'text/plain'});
  res.end('WRKMAN Broadcast Relay');
});

const wss = new WebSocketServer({ server, path: '/ingest', maxPayload: 8 * 1024 * 1024 });

wss.on('connection', ws => {
  let ffmpeg = null;
  let started = false;
  let ending = false;
  let pendingBytes = 0;
  let watchdog = null;

  function stop(reason = 'stopped', notify = true) {
    if (ending) return;
    ending = true;
    clearTimeout(watchdog);

    if (ffmpeg) {
      try { ffmpeg.stdin.end(); } catch {}
      const proc = ffmpeg;
      setTimeout(() => {
        if (!proc.killed) {
          try { proc.kill('SIGTERM'); } catch {}
        }
      }, 2500).unref();
      ffmpeg = null;
    }

    if (notify) send(ws, {type: 'relay-stopped', reason});
  }

  ws.on('message', (data, isBinary) => {
    try {
      if (!started) {
        if (isBinary) throw new Error('Start message required before media');
        const msg = JSON.parse(data.toString());
        if (msg.type !== 'start') throw new Error('Expected start message');
        if (msg.token !== RELAY_TOKEN) throw new Error('Relay token rejected');

        const target = buildTarget(msg.rtmpUrl, msg.streamKey);
        ffmpeg = startFfmpeg(target);
        started = true;

        ffmpeg.once('error', err => {
          send(ws, {type: 'relay-error', message: 'FFmpeg could not start'});
          stop('ffmpeg-start-failed', false);
          try { ws.close(1011, 'ffmpeg start failed'); } catch {}
          console.error('ffmpeg start error:', err.message);
        });

        ffmpeg.once('exit', code => {
          if (!ending) {
            send(ws, {type: 'relay-error', message: `FFmpeg exited (${code ?? 'signal'})`});
            stop('ffmpeg-exited', false);
            try { ws.close(1011, 'ffmpeg exited'); } catch {}
          }
        });

        ffmpeg.stderr.on('data', chunk => {
          const line = chunk.toString().trim();
          if (line) console.warn('ffmpeg:', line.slice(0, 800));
        });

        watchdog = setTimeout(() => {
          send(ws, {type: 'relay-error', message: 'Maximum relay session reached'});
          stop('session-limit', false);
          try { ws.close(1000, 'session limit'); } catch {}
        }, MAX_SESSION_MS);
        watchdog.unref();

        send(ws, {type: 'relay-ready'});
        return;
      }

      if (!isBinary) {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'stop') {
          stop('client-stop');
          return;
        }
        return;
      }

      if (!ffmpeg || !ffmpeg.stdin.writable) throw new Error('Relay encoder is not writable');

      pendingBytes += data.length;
      if (pendingBytes > MAX_BUFFERED_STDIN) {
        send(ws, {type: 'relay-error', message: 'Relay backpressure limit exceeded'});
        stop('backpressure', false);
        try { ws.close(1011, 'backpressure'); } catch {}
        return;
      }

      const ok = ffmpeg.stdin.write(data, () => {
        pendingBytes = Math.max(0, pendingBytes - data.length);
      });

      if (!ok && ws._socket && typeof ws._socket.pause === 'function') {
        ws._socket.pause();
        ffmpeg.stdin.once('drain', () => {
          try { ws._socket?.resume(); } catch {}
        });
      }
    } catch (err) {
      send(ws, {type: 'error', message: err.message || 'Relay error'});
      stop('protocol-error', false);
      try { ws.close(1008, 'protocol error'); } catch {}
    }
  });

  ws.on('close', () => stop('socket-closed', false));
  ws.on('error', err => {
    console.error('websocket error:', err.message);
    stop('socket-error', false);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`WRKMAN Broadcast Relay listening on :${PORT}`);
});
