import React, { useState } from 'react';
import { api } from '../api/client';

export default function AuthPage({ onLoginSuccess, navigate }) {
  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('patient');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        const res = await api.register(fullName, email, password, role);
        onLoginSuccess(res.user);
        navigate('mri');
      } else {
        const res = await api.login(email, password);
        onLoginSuccess(res.user);
        navigate('mri');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const loginWithDemo = async (demoRole) => {
    setError('');
    setLoading(true);
    let demoEmail = 'patient@demo.neurobehavior.org';
    let demoPass = 'password123';

    if (demoRole === 'clinician') {
      demoEmail = 'clinician@demo.neurobehavior.org';
      demoPass = 'password123';
    } else if (demoRole === 'admin') {
      demoEmail = 'admin@demo.neurobehavior.org';
      demoPass = 'admin123';
    }

    try {
      const res = await api.login(demoEmail, demoPass);
      onLoginSuccess(res.user);
      navigate('mri');
    } catch (err) {
      setError('Could not sign in with demo account: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '720px', margin: '20px auto 40px' }} className="fade-in">
      {/* Project Title Card */}
      <div className="card" style={{ textAlign: 'center', marginBottom: '22px', borderTop: '5px solid var(--primary)', padding: '28px 24px' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', margin: '0 auto 14px' }}>
          🧠
        </div>
        <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--navy)', lineHeight: 1.38, marginBottom: '8px', letterSpacing: '-0.01em' }}>
          NeuroBehavior-ASD: Deep Learning-Based Autism Detection Using Brain Imaging Biomarkers and Behavioral Features with personalized support system
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--slate-500)', margin: 0 }}>
          Clinical Neuroimaging Biomarker Screening, Standardized Behavioral Screening & Location-Based Support
        </p>
      </div>

      {/* Authentication Card */}
      <div className="card" style={{ padding: '28px' }}>
        {/* Sign In / Register Switcher */}
        <div style={{ display: 'flex', background: 'var(--slate-100)', borderRadius: 'var(--radius-lg)', padding: '5px', marginBottom: '22px' }}>
          <button
            type="button"
            className="btn"
            style={{
              flex: 1,
              background: !isRegister ? 'var(--white)' : 'transparent',
              color: !isRegister ? 'var(--primary-dark)' : 'var(--slate-600)',
              fontWeight: !isRegister ? 700 : 500,
              boxShadow: !isRegister ? 'var(--shadow-xs)' : 'none',
              borderRadius: 'var(--radius-md)',
              padding: '10px',
              border: 'none',
              cursor: 'pointer'
            }}
            onClick={() => { setIsRegister(false); setError(''); }}
          >
            Sign In
          </button>
          <button
            type="button"
            className="btn"
            style={{
              flex: 1,
              background: isRegister ? 'var(--white)' : 'transparent',
              color: isRegister ? 'var(--primary-dark)' : 'var(--slate-600)',
              fontWeight: isRegister ? 700 : 500,
              boxShadow: isRegister ? 'var(--shadow-xs)' : 'none',
              borderRadius: 'var(--radius-md)',
              padding: '10px',
              border: 'none',
              cursor: 'pointer'
            }}
            onClick={() => { setIsRegister(true); setError(''); }}
          >
            Register
          </button>
        </div>

        <div style={{ marginBottom: '18px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy)', margin: 0 }}>
            {isRegister ? 'Register Patient Account' : 'Sign In to Your Account'}
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--slate-500)', marginTop: '4px' }}>
            {isRegister
              ? 'Create your account to start MRI analysis, questionnaire screening, and view support centers.'
              : 'Sign in to access your assessment records or click a demo account below.'}
          </p>
        </div>

        {error && <div className="alert alert-warning" style={{ padding: '12px 16px', fontSize: '0.85rem' }}>{error}</div>}

        {/* Form */}
        <form onSubmit={handleAuthSubmit}>
          {isRegister && (
            <div className="form-group">
              <label className="form-label" htmlFor="regFullName">Full Legal Name</label>
              <input
                id="regFullName"
                type="text"
                className="form-input"
                placeholder="e.g. John Doe / Caregiver Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="authEmail">Email Address</label>
            <input
              id="authEmail"
              type="email"
              className="form-input"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="authPass">Password</label>
            <input
              id="authPass"
              type="password"
              className="form-input"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {isRegister && (
            <div className="form-group">
              <label className="form-label" htmlFor="regRole">Account Type</label>
              <select
                id="regRole"
                className="form-select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="patient">Patient / Parent / Guardian</option>
                <option value="clinician">Pediatrician / Clinical Specialist</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '0.96rem', marginTop: '4px' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : (isRegister ? 'Register & Continue ➔' : 'Sign In ➔')}
          </button>
        </form>

        {/* 1-Click Demo Profiles */}
        <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid var(--slate-200)' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', textAlign: 'center', marginBottom: '10px' }}>
            Or Instant 1-Click Demo Access
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.82rem', padding: '10px 8px', flexDirection: 'column', gap: '4px' }}
              onClick={() => loginWithDemo('patient')}
              disabled={loading}
            >
              <span style={{ fontSize: '1.2rem' }}>👤</span>
              <strong>Patient</strong>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.82rem', padding: '10px 8px', flexDirection: 'column', gap: '4px' }}
              onClick={() => loginWithDemo('clinician')}
              disabled={loading}
            >
              <span style={{ fontSize: '1.2rem' }}>🩺</span>
              <strong>Clinician</strong>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.82rem', padding: '10px 8px', flexDirection: 'column', gap: '4px' }}
              onClick={() => loginWithDemo('admin')}
              disabled={loading}
            >
              <span style={{ fontSize: '1.2rem' }}>⚙️</span>
              <strong>Admin</strong>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
