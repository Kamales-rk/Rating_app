import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './app.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

function App() {
  const [stores, setStores] = useState([]);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // ✅ Login Handler with Validation
  const login = async () => {
  if (!email.trim() || !password.trim()) {
    alert('Email and password are required.');
    return;
  }

  await axios
    .post(
      `${API}/login`,
      { email, password },
      { headers: { 'Content-Type': 'application/json' } }
    )
    .then((res) => {
      const { token } = res.data;
      setToken(token);
      localStorage.setItem('token', token);
      alert('Logged in successfully!');
    })
    .catch(handleLoginError);
};

// ✅ Error handler extracted for clarity
const handleLoginError = (err) => {
  let message = 'Login failed. Please try again.';
  if (err.response?.data?.message) {
    message = err.response.data.message;
  } else if (err.message) {
    message = err.message;
  }
  console.error('Login error:', message);
  alert(message);
};


  // ✅ Get Store Data
  const getStores = async () => {
    try {
      const res = await axios.get(`${API}/stores`);
      setStores(res.data);
    } catch (err) {
      console.error('Store fetch error:', err.message || 'Error loading stores');
    }
  };

  // ✅ Submit Rating
  const rateStore = async (store_id, rating) => {
    try {
      await axios.post(
        `${API}/rate`,
        { store_id, rating },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      getStores(); // Refresh after rating
    } catch (err) {
      alert('You must be logged in as a user to rate.');
    }
  };

  useEffect(() => {
    getStores();
  }, []);

  return (
    <div className="App">
      <h2>Login</h2>
      <input
        placeholder="Email"
        type="email"
        onChange={(e) => setEmail(e.target.value)}
        value={email}
      />
      <input
        placeholder="Password"
        type="password"
        onChange={(e) => setPassword(e.target.value)}
        value={password}
      />
      <button onClick={login}>Login</button>

      <h2>Stores</h2>
      {stores.map((s) => (
        <div key={s.id} className="store-card">
          <h4>{s.name}</h4>
          <p>{s.address}</p>
          <p>Average Rating: {s.avg_rating ? s.avg_rating.toFixed(1) : 'No ratings'}</p>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => rateStore(s.id, n)}>
              {n}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

export default App;
