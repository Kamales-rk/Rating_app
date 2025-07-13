const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ MySQL Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Kamal@420', // ✅ Replace with your actual DB password
  database: 'store_rating_app'
});

// ✅ JWT Secret Key
const SECRET = 'myjwtsecret';

// ✅ Optional Root Route
app.get('/', (req, res) => {
  res.send('✅ Store Rating API is running');
});

// ✅ Auth Middleware
const authMiddleware = (roles) => (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Invalid format' });

  try {
    const decoded = jwt.verify(token, SECRET);
    if (!roles.includes(decoded.role)) return res.status(403).json({ message: 'Access denied' });
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    res.status(403).json({ message: 'Invalid token' });
  }
};

// ✅ Signup Route
app.post('/api/signup', async (req, res) => {
  const { name, email, address, password } = req.body;

  if (!name || !email || !address || !password) {
    return res.status(400).json({ message: 'All fields required' });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    db.query(
      'INSERT INTO users (name, email, address, password, role) VALUES (?, ?, ?, ?, ?)',
      [name, email, address, hashed, 'user'],
      (err) => {
        if (err) {
          console.error('❌ Signup error:', err);
          return res.status(500).json({ message: 'Signup failed' });
        }
        res.json({ message: 'User registered' });
      }
    );
  } catch (err) {
    console.error('❌ Hashing error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Login Route
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err || results.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, SECRET);
    res.json({ token, role: user.role });
  });
});

// ✅ Get All Stores
app.get('/api/stores', (req, res) => {
  db.query(
    `SELECT s.id, s.name, s.address, AVG(r.rating) as avg_rating
     FROM stores s LEFT JOIN ratings r ON s.id = r.store_id
     GROUP BY s.id`,
    (err, rows) => {
      if (err) {
        console.error('Store fetch error:', err);
        return res.status(500).json({ message: 'Failed to get stores' });
      }
      res.json(rows);
    }
  );
});

// ✅ Rate a Store (User Only)
app.post('/api/rate', authMiddleware(['user']), (req, res) => {
  const { store_id, rating } = req.body;
  db.query(
    'INSERT INTO ratings (user_id, store_id, rating) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE rating = ?',
    [req.user.id, store_id, rating, rating],
    (err) => {
      if (err) {
        console.error('Rating error:', err);
        return res.status(500).json({ message: 'Rating failed' });
      }
      res.json({ message: 'Rating saved' });
    }
  );
});

// ✅ Admin Dashboard (Admin Only)
app.get('/api/admin/dashboard', authMiddleware(['admin']), (req, res) => {
  db.query(
    `SELECT 
       (SELECT COUNT(*) FROM users) AS users, 
       (SELECT COUNT(*) FROM stores) AS stores, 
       (SELECT COUNT(*) FROM ratings) AS ratings`,
    (err, results) => {
      if (err) {
        console.error('Dashboard error:', err);
        return res.status(500).json({ message: 'Dashboard query failed' });
      }
      res.json(results[0]);
    }
  );
});

// ✅ Start Server
app.listen(5001, () => {
  console.log('✅ Server running on http://localhost:5001');
});
