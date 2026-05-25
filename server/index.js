const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../client/dist')));

// ── Timeline REST API ────────────────────────────────────────────────────────

const timelinesDir = path.join(__dirname, 'timelines');
if (!fs.existsSync(timelinesDir)) fs.mkdirSync(timelinesDir, { recursive: true });

app.get('/api/timelines', (_req, res) => {
  try { res.json(fs.readdirSync(timelinesDir).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''))); }
  catch { res.json([]); }
});
app.get('/api/timelines/:name', (req, res) => {
  const file = path.join(timelinesDir, `${req.params.name}.json`);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Not found' });
  res.json(JSON.parse(fs.readFileSync(file, 'utf8')));
});
app.post('/api/timelines/:name', (req, res) => {
  fs.writeFileSync(path.join(timelinesDir, `${req.params.name}.json`), JSON.stringify(req.body, null, 2));
  res.json({ ok: true });
});
app.delete('/api/timelines/:name', (req, res) => {
  const file = path.join(timelinesDir, `${req.params.name}.json`);
  if (fs.existsSync(file)) fs.unlinkSync(file);
  res.json({ ok: true });
});

// ── Socket.io ────────────────────────────────────────────────────────────────

let state = { color: '#000000', effect: null, speed: 5, brightness: 1, text: '' };
const viewers = new Set();

function broadcastViewerCount() {
  io.emit('viewer_count', { count: viewers.size });
}

io.on('connection', (socket) => {
  console.log(`[+] ${socket.id}`);

  // Sync new connection with current state
  socket.emit('init_state', state);

  socket.on('register_viewer', () => {
    viewers.add(socket.id);
    broadcastViewerCount();
  });

  socket.on('register_admin', () => {
    // Admin not counted as viewer
  });

  socket.on('set_color', ({ color }) => {
    state.color = color;
    state.effect = null;
    io.emit('color_update', { color });
    io.emit('effect_stop');
  });

  socket.on('set_effect', ({ effect, speed }) => {
    state.effect = effect;
    if (speed !== undefined) state.speed = speed;
    io.emit('effect_update', { effect, speed: state.speed });
  });

  socket.on('stop_effect', () => {
    state.effect = null;
    io.emit('effect_stop');
  });

  socket.on('flash', () => {
    io.emit('flash');
  });

  socket.on('set_brightness', ({ value }) => {
    state.brightness = value;
    io.emit('brightness_update', { value });
  });

  socket.on('set_text', ({ text }) => {
    state.text = text ?? '';
    io.emit('text_update', { text: state.text });
  });

  socket.on('disconnect', () => {
    console.log(`[-] ${socket.id}`);
    const wasViewer = viewers.has(socket.id);
    viewers.delete(socket.id);
    if (wasViewer) broadcastViewerCount();
  });
});

app.get('*', (_req, res) => {
  const index = path.join(__dirname, '../client/dist/index.html');
  if (fs.existsSync(index)) res.sendFile(index);
  else res.status(404).send('Build client first: npm run build');
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Euronight server → http://localhost:${PORT}`));
