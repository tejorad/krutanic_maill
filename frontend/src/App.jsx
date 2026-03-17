import React, { useState, useEffect } from 'react';
import Dashboard from './Dashboard';
import Auth from './Auth';
import api from './api';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
  }, [token]);

  const handleLogin = (userData, userToken) => {
    // Interceptor will pick up the token from localStorage automatically
    localStorage.setItem('token', userToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setToken(userToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    // Force a page reload to clear any cached states/interceptors if needed, 
    // but just state update is usually enough.
  };

  if (!token) {
    return <Auth onLogin={handleLogin} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}

export default App;
