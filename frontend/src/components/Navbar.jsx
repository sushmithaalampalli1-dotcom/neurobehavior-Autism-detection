import React from 'react';

export default function Navbar({ currentRoute, setCurrentRoute, user, onLogout }) {
  const navItems = user
    ? [
        { id: 'mri', label: '🧠 MRI Analysis', path: '/mri' },
        { id: 'questionnaire', label: '📋 Questionnaire Analysis', path: '/questionnaire' },
        { id: 'centres', label: '📍 Location Based Personalized Support', path: '/centres' },
        { id: 'report', label: '📄 Report', path: '/report' },
        ...(user.role === 'admin' ? [{ id: 'admin', label: '⚙️ Admin', path: '/admin' }] : []),
      ]
    : [
        { id: 'auth', label: 'Sign In / Register', path: '/login' },
      ];

  const handleBrandClick = (e) => {
    e.preventDefault();
    if (user) {
      setCurrentRoute('mri');
    } else {
      setCurrentRoute('auth');
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <a 
          href="#/" 
          className="brand-link" 
          onClick={handleBrandClick}
        >
          <div className="brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a9 9 0 0 0-9 9c0 3.6 2.1 6.7 5.2 8.1.5.2.8.8.8 1.4v.5c0 .6.4 1 1 1h4c.6 0 1-.4 1-1v-.5c0-.6.3-1.2.8-1.4 3.1-1.4 5.2-4.5 5.2-8.1a9 9 0 0 0-9-9z"/>
              <path d="M9 10h6"/>
              <path d="M12 7v6"/>
            </svg>
          </div>
          <div className="brand-text">
            <h1>NeuroBehavior-ASD</h1>
            <span>Deep Learning-Based Autism Detection Using Brain Imaging Biomarkers and Behavioral Features</span>
          </div>
        </a>

        <div>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div className="user-badge-chip">
                <div className="user-avatar-circle">
                  {getInitials(user.full_name)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--navy)' }}>
                    {user.full_name}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--slate-500)', textTransform: 'capitalize' }}>
                    {user.role} Account
                  </span>
                </div>
              </div>

              <button 
                className="btn btn-secondary" 
                style={{ padding: '6px 14px', fontSize: '0.82rem' }} 
                onClick={onLogout}
                title="Sign out of your session"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button 
              className="btn btn-primary" 
              style={{ padding: '8px 20px', fontSize: '0.88rem' }}
              onClick={() => setCurrentRoute('auth')}
            >
              Sign In / Register
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
