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

const timelinesDir = path.join(__dirname, 'timelines');
if (!fs.existsSync(timelinesDir)) fs.mkdirSync(timelinesDir, { recursive: true });

// Serve built client in production
app.use(express.static(path.join(__dirname, '../client/dist')));

// Timeline REST API
app.get('/api/timelines', (_req, res) => {
  try {
    const files = fs.readdirSync(timelinesDir).filter(f => f.endsWith('.json'));
    res.json(files.map(f => f.replace('.json', '')));
  } catch {
    res.json([]);
  }
});

app.get('/api/timelines/:name', (req, res) => {
  const file = path.join(timelinesDir, `${req.params.name}.json`);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Not found' });
  res.json(JSON.parse(fs.readFileSync(file, 'utf8')));
});

app.post('/api/timelines/:name', (req, res) => {
  const file = path.join(timelinesDir, `${req.params.name}.json`);
  fs.writeFileSync(file, JSON.stringify(req.body, null, 2));
  res.json({ ok: true });
});

app.delete('/api/timelines/:name', (req, res) => {
  const file = path.join(timelinesDir, `${req.params.name}.json`);
  if (fs.existsSync(file)) fs.unlinkSync(file);
  res.json({ ok: true });
});

// Socket.io — relay commands, remember last state for reconnections
let lastCommand = null;

io.on('connection', (socket) => {
  console.log(`[+] ${socket.id}`);

  // Send last known state to newly connected viewer
  if (lastCommand) socket.emit('command', lastCommand);

  socket.on('command', (data) => {
    lastCommand = data;
    socket.broadcast.emit('command', data);
  });

  socket.on('disconnect', () => {
    console.log(`[-] ${socket.id}`);
  });
});

// SPA fallback
app.get('*', (_req, res) => {
  const index = path.join(__dirname, '../client/dist/index.html');
  if (fs.existsSync(index)) res.sendFile(index);
  else res.status(404).send('Build client first: npm run build');
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Euronight server → http://localhost:${PORT}`));
