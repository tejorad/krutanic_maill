import React, { useState } from 'react';
import api from './api';
import { Mail, Lock, User, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

const Auth = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const response = await api.post(endpoint, formData);

      if (response.data.success) {
        const { user, token } = response.data.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        onLogin(user, token);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: 'var(--bg-main)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    },
    glow1: {
      position: 'absolute',
      top: '10%',
      left: '10%',
      width: '400px',
      height: '400px',
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      borderRadius: '50%',
      filter: 'blur(100px)',
      pointerEvents: 'none'
    },
    glow2: {
      position: 'absolute',
      bottom: '10%',
      right: '10%',
      width: '400px',
      height: '400px',
      backgroundColor: 'rgba(168, 85, 247, 0.1)',
      borderRadius: '50%',
      filter: 'blur(100px)',
      pointerEvents: 'none'
    },
    card: {
      width: '100%',
      maxW: '420px',
      position: 'relative',
      zIndex: 1,
    },
    header: {
      textAlign: 'center',
      marginBottom: '32px'
    },
    logoBox: {
      width: '64px',
      height: '64px',
      margin: '0 auto 16px',
      background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
      borderRadius: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 8px 16px rgba(0,0,0,0.3)'
    },
    formGroup: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '500',
      color: 'var(--text-muted)',
      marginBottom: '8px',
      marginLeft: '4px'
    },
    inputWrapper: {
      position: 'relative'
    },
    icon: {
      position: 'absolute',
      left: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: 'var(--text-dim)'
    },
    input: {
      width: '100%',
      padding: '12px 12px 12px 40px',
      backgroundColor: 'rgba(255,255,255,0.03)',
      border: '1px solid var(--border-glass)',
      borderRadius: '12px',
      color: 'white',
      fontSize: '15px',
      outline: 'none',
      transition: 'all 0.2s ease'
    },
    errorBox: {
      padding: '12px',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      border: '1px solid rgba(239, 68, 68, 0.2)',
      borderRadius: '12px',
      color: 'var(--danger)',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '20px'
    },
    footer: {
      marginTop: '24px',
      paddingTop: '20px',
      borderTop: '1px solid var(--border-glass)',
      textAlign: 'center'
    },
    switchBtn: {
      background: 'none',
      border: 'none',
      color: 'var(--text-muted)',
      fontSize: '14px',
      cursor: 'pointer'
    },
    highlight: {
      color: 'var(--primary)',
      fontWeight: '600'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.glow1} />
      <div style={styles.glow2} />

      <div style={{ ...styles.card, maxWidth: '420px' }}>
        <div style={styles.header}>
          <div style={styles.logoBox}>
            <Mail size={32} color="white" />
          </div>
          <h1 className="title-gradient" style={{ fontSize: '32px', fontWeight: '800', margin: '0 0 8px' }}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
            {isLogin ? 'Manage your campaigns with ease' : 'Start your email marketing journey today'}
          </p>
        </div>

        <div className="glass-card" style={{ padding: '32px' }}>
          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Full Name</label>
                <div style={styles.inputWrapper}>
                  <User size={18} style={styles.icon} />
                  <input
                    type="text"
                    name="name"
                    required
                    style={styles.input}
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={handleChange}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--primary)';
                      e.target.style.backgroundColor = 'rgba(255,255,255,0.05)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--border-glass)';
                      e.target.style.backgroundColor = 'rgba(255,255,255,0.03)';
                    }}
                  />
                </div>
              </div>
            )}

            <div style={styles.formGroup}>
              <label style={styles.label}>Email Address</label>
              <div style={styles.inputWrapper}>
                <Mail size={18} style={styles.icon} />
                <input
                  type="email"
                  name="email"
                  required
                  style={styles.input}
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--primary)';
                    e.target.style.backgroundColor = 'rgba(255,255,255,0.05)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border-glass)';
                    e.target.style.backgroundColor = 'rgba(255,255,255,0.03)';
                  }}
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Password</label>
              <div style={styles.inputWrapper}>
                <Lock size={18} style={styles.icon} />
                <input
                  type="password"
                  name="password"
                  required
                  style={styles.input}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--primary)';
                    e.target.style.backgroundColor = 'rgba(255,255,255,0.05)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border-glass)';
                    e.target.style.backgroundColor = 'rgba(255,255,255,0.03)';
                  }}
                />
              </div>
            </div>

            {error && (
              <div style={styles.errorBox}>
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '16px',
                marginTop: '12px',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? (
                <Loader2 size={20} className="spin" />
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div style={styles.footer}>
            <button
              onClick={() => setIsLogin(!isLogin)}
              style={styles.switchBtn}
            >
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <span style={styles.highlight}>
                {isLogin ? 'Sign up' : 'Log in'}
              </span>
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px', marginTop: '32px' }}>
          &copy; 2026 Krutanic Mail. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Auth;
