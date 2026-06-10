const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const dbPath = process.env.DB_PATH || path.join(__dirname, 'events.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    date TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    paid INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS companions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    participant_id INTEGER NOT NULL,
    paid INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
  );
`);

// Migrations for existing DBs
try { db.exec('ALTER TABLE participants ADD COLUMN companions INTEGER DEFAULT 0'); } catch (_) {}

const getCompanionsStmt = db.prepare('SELECT * FROM companions WHERE participant_id = ? ORDER BY id ASC');

function withCompanions(participant) {
  return { ...participant, companion_list: getCompanionsStmt.all(participant.id) };
}

// Events
app.get('/api/events', (req, res) => {
  const events = db.prepare(`
    SELECT e.*,
      COUNT(DISTINCT p.id) + COUNT(c.id) as total,
      SUM(CASE WHEN p.paid = 1 THEN 1 ELSE 0 END) + SUM(CASE WHEN c.paid = 1 THEN 1 ELSE 0 END) as paid_count
    FROM events e
    LEFT JOIN participants p ON p.event_id = e.id
    LEFT JOIN companions c ON c.participant_id = p.id
    GROUP BY e.id
    ORDER BY e.created_at DESC
  `).all();
  res.json(events);
});

app.post('/api/events', (req, res) => {
  const { name, date } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });
  const result = db.prepare('INSERT INTO events (name, date) VALUES (?, ?)').run(name.trim(), date || null);
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(event);
});

app.delete('/api/events/:id', (req, res) => {
  db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// Participants
app.get('/api/events/:id/participants', (req, res) => {
  const participants = db.prepare(
    'SELECT * FROM participants WHERE event_id = ? ORDER BY name ASC'
  ).all(req.params.id);
  res.json(participants.map(withCompanions));
});

app.post('/api/events/:id/participants', (req, res) => {
  const { name, companions } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });
  const companionsCount = Math.max(0, parseInt(companions) || 0);

  const result = db.prepare(
    'INSERT INTO participants (event_id, name) VALUES (?, ?)'
  ).run(req.params.id, name.trim());

  const participantId = result.lastInsertRowid;
  const insertCompanion = db.prepare('INSERT INTO companions (participant_id) VALUES (?)');
  for (let i = 0; i < companionsCount; i++) {
    insertCompanion.run(participantId);
  }

  const participant = db.prepare('SELECT * FROM participants WHERE id = ?').get(participantId);
  res.status(201).json(withCompanions(participant));
});

app.patch('/api/participants/:id/paid', (req, res) => {
  const { paid } = req.body;
  db.prepare('UPDATE participants SET paid = ? WHERE id = ?').run(paid ? 1 : 0, req.params.id);
  const participant = db.prepare('SELECT * FROM participants WHERE id = ?').get(req.params.id);
  res.json(withCompanions(participant));
});

app.delete('/api/participants/:id', (req, res) => {
  db.prepare('DELETE FROM participants WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// Companions
app.patch('/api/companions/:id/paid', (req, res) => {
  const { paid } = req.body;
  db.prepare('UPDATE companions SET paid = ? WHERE id = ?').run(paid ? 1 : 0, req.params.id);
  const companion = db.prepare('SELECT * FROM companions WHERE id = ?').get(req.params.id);
  res.json(companion);
});

// Servir build de Angular en producción
const frontendDist = path.join(__dirname, '../frontend/dist/frontend');
if (require('fs').existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => res.sendFile(path.join(frontendDist, 'index.html')));
}

app.listen(PORT, () => console.log(`Backend corriendo en http://localhost:${PORT}`));
