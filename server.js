const express = require('express');
const session = require('express-session');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();

const app = express();

app.use(express.static(__dirname));
app.use(express.json());

app.use(session({
  secret: 'hemlig-nyckel-123',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax'
  }
}));

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Not logged in" });
  }
  next();
}

/* =======================
   SQLITE INIT
======================= */
const db = new sqlite3.Database('./database.db');

db.serialize(() => {

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      password TEXT,
      role TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      email TEXT,
      personnummer TEXT,
      info TEXT,
      rules TEXT
    )
  `);

  db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
    if (row && row.count === 0) {

      const stmt = db.prepare(`
        INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run("admin", "admin123", "admin", "", "", "", "", "", "", "{}");
      stmt.run("erik", "123", "driver", "", "", "", "", "", "", "{}");
      stmt.run("anna", "123", "driver", "", "", "", "", "", "", "{}");

      stmt.finalize();
    }
  });
});

/* =======================
   LOGIN
======================= */
app.post('/login', (req, res) => {

  const username = (req.body.username || "").toLowerCase();
  const password = req.body.password || "";

  db.get(
    "SELECT * FROM users WHERE lower(username) = ? AND password = ?",
    [username, password],
    (err, user) => {

      if (err) return res.status(500).json(err);
      if (!user) return res.status(401).json({ error: "Fel inloggning" });

      req.session.user = {
        username: user.username,
        role: user.role
      };

      res.json({ message: "OK", role: user.role });
    }
  );
});

/* =======================
   SESSION
======================= */
app.get('/me', (req, res) => {
  res.json(req.session.user || null);
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

/* =======================
   USERS
======================= */

app.get('/users', requireLogin, (req, res) => {
  db.all("SELECT * FROM users", [], (err, rows) => {
    if (err) return res.status(500).json(err);

    rows.forEach(r => {
      try {
        r.rules = r.rules ? JSON.parse(r.rules) : {};
      } catch {
        r.rules = {};
      }
    });

    res.json(rows);
  });
});

app.get('/users/:username', requireLogin, (req, res) => {

  db.get(
    "SELECT * FROM users WHERE lower(username) = ?",
    [req.params.username.toLowerCase()],
    (err, row) => {
      if (err) return res.status(500).json(err);

      if (row) {
        try {
          row.rules = row.rules ? JSON.parse(row.rules) : {};
        } catch {
          row.rules = {};
        }
      }

      res.json(row || null);
    }
  );
});

app.post('/users', requireLogin, (req, res) => {

  const u = req.body;
  const username = (u.username || "").trim().toLowerCase();

  if (!username) {
    return res.status(400).json({ error: "Username saknas" });
  }

  db.run(
    `INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      username,
      u.password || "",
      u.role || "driver",
      u.phone || "",
      u.address || "",
      u.city || "",
      u.email || "",
      u.personnummer || "",
      u.info || "",
      JSON.stringify(u.rules || {})
    ],
    function (err) {
      if (err) return res.status(500).json(err);
      res.json({ ok: true });
    }
  );
});

app.put('/users/:username', requireLogin, (req, res) => {

  const oldUsername = req.params.username.toLowerCase();
  const u = req.body;

  const newUsername = (u.username || oldUsername).trim().toLowerCase();

  if (!newUsername) {
    return res.status(400).json({ error: "Username saknas" });
  }

  db.run(
    `UPDATE users SET
      username = ?,
      password = ?,
      role = ?,
      phone = ?,
      address = ?,
      city = ?,
      email = ?,
      personnummer = ?,
      info = ?,
      rules = ?
    WHERE lower(username) = ?`,
    [
      newUsername,
      u.password || "",
      u.role || "driver",
      u.phone || "",
      u.address || "",
      u.city || "",
      u.email || "",
      u.personnummer || "",
      u.info || "",
      JSON.stringify(u.rules || {}),
      oldUsername
    ],
    function (err) {
      if (err) return res.status(500).json(err);

      if (this.changes === 0) {
        return res.status(404).json({ error: "Användaren hittades inte" });
      }

      if (req.session.user && req.session.user.username.toLowerCase() === oldUsername) {
        req.session.user.username = newUsername;
        req.session.user.role = u.role || req.session.user.role;
      }

      res.json({ ok: true });
    }
  );
});

/* =======================
   SHIFTS
======================= */
let shifts = [];

app.get('/shifts', requireLogin, (req, res) => {
  res.json(shifts.filter(Boolean));
});

app.post('/shifts', requireLogin, (req, res) => {

  const driverName = (req.body.driver || "").toLowerCase();

  db.get(
    "SELECT phone FROM users WHERE lower(username) = ?",
    [driverName],
    (err, driverUser) => {

const newShift = {
  id: crypto.randomUUID(),
  date: req.body.date || "",
  shift: req.body.shift || "",
  driver: req.body.driver || "",
  driverPhone: driverUser?.phone || "",
  vehicle: req.body.vehicle || "",
  vehiclePhone: req.body.vehiclePhone || "",
  regNumber: req.body.regNumber || "",
  city: req.body.city || "",
  time: req.body.time || "",
  break: req.body.break || "",
  absence: req.body.absence || "",
  status: req.body.status || "Närvarande",
  substitute: req.body.substitute || "",
  parentId: null
};

      shifts.push(newShift);
      res.json(newShift);
    }
  );
});

app.put('/shifts/:id', requireLogin, (req, res) => {

  const id = req.params.id;
  let createdCopy = null;

  shifts = shifts.map(s => {

    if (!s || s.id !== id) return s;

    const updated = { ...s, ...req.body, id: s.id };

    if (req.body.substitute) {

      const exists = shifts.find(x =>
        x.parentId === s.id &&
        x.driver.toLowerCase() === req.body.substitute.toLowerCase()
      );

      if (!exists) {
        createdCopy = {
          id: crypto.randomUUID(),
          parentId: s.id,
          date: s.date,
          driver: req.body.substitute,
          vehicle: s.vehicle,
          time: s.time,
          break: s.break,
          absence: "",
          status: "Närvarande",
          substitute: ""
        };
      }
    }

    return updated;
  });

  if (createdCopy) shifts.push(createdCopy);

  res.json({ ok: true });
});

app.delete('/shifts/:id', requireLogin, (req, res) => {
  shifts = shifts.filter(s => s && s.id !== req.params.id);
  res.json({ ok: true });
});

/* =======================
   START
======================= */
app.listen(3000, () => {
  console.log('Server kör på http://localhost:3000');
});