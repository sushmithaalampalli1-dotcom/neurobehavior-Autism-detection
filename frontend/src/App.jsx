import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import StatusBanner from './components/StatusBanner';

// Core Pages
import AuthPage from './pages/AuthPage';
import MriAssessmentPage from './pages/MriAssessmentPage';
import QuestionnairePage from './pages/QuestionnairePage';
import SupportCentresPage from './pages/SupportCentresPage';
import ResultsPage from './pages/ResultsPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

import { api, authStorage } from './api/client';

export default function App() {
  const [user, setUser] = useState(() => authStorage.getUser());
  const [currentRoute, setCurrentRoute] = useState(() => {
    const existing = authStorage.getUser();
    return existing ? 'mri' : 'auth';
  });
  const [backendHealth, setBackendHealth] = useState(null);

  // Maintain active assessment states across routes and sessions
  const [activeMriResult, setActiveMriResult] = useState(() => {
    try {
      const saved = sessionStorage.getItem('neurobehavior_active_mri');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeQuestionnaireResult, setActiveQuestionnaireResult] = useState(() => {
    try {
      const saved = sessionStorage.getItem('neurobehavior_active_questionnaire');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleMriCompleted = (result) => {
    setActiveMriResult(result);
    try {
      sessionStorage.setItem('neurobehavior_active_mri', JSON.stringify(result));
    } catch (e) {
      console.warn('Storage error:', e);
    }
  };

  const handleQuestionnaireCompleted = (result) => {
    setActiveQuestionnaireResult(result);
    try {
      sessionStorage.setItem('neurobehavior_active_questionnaire', JSON.stringify(result));
    } catch (e) {
      console.warn('Storage error:', e);
    }
  };

  // Sync route with URL hash for browser navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '').replace('#', '');
      const currentUser = authStorage.getUser();

      if (!currentUser) {
        setCurrentRoute('auth');
        return;
      }

      let target = 'mri';
      if (hash === 'assessments/mri' || hash === 'mri') target = 'mri';
      else if (hash === 'assessments/questionnaire' || hash === 'questionnaire') target = 'questionnaire';
      else if (hash === 'support-centres' || hash === 'centres') target = 'centres';
      else if (hash === 'report' || hash === 'results' || hash === 'reports') target = 'report';
      else if (hash === 'admin' && currentUser.role === 'admin') target = 'admin';
      else target = 'mri';

      setCurrentRoute(target);
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [user]);

  // Handle auto-logout when token expires
  useEffect(() => {
    const handleAuthExpired = () => {
      setUser(null);
      setCurrentRoute('auth');
    };
    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, []);

  const navigate = (routeId) => {
    const currentUser = authStorage.getUser();
    if (!currentUser) {
      setCurrentRoute('auth');
      window.location.hash = '#/login';
      return;
    }

    let target = routeId;
    if (routeId === 'results' || routeId === 'reports') target = 'report';
    if (routeId === 'dashboard') target = 'mri';

    setCurrentRoute(target);
    window.location.hash = `#/${target}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Poll backend health on mount
  useEffect(() => {
    const checkConnection = () => {
      api.checkHealth()
        .then((data) => setBackendHealth(data))
        .catch((err) => {
          setBackendHealth({ status: 'offline', error: err.message });
        });
    };

    checkConnection();
    const interval = setInterval(checkConnection, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleLoginSuccess = (loggedInUser) => {
    // Ensure clean state for new user: never carry over previous user assessments
    setActiveMriResult(null);
    setActiveQuestionnaireResult(null);
    try {
      sessionStorage.removeItem('neurobehavior_active_mri');
      sessionStorage.removeItem('neurobehavior_active_questionnaire');
    } catch (e) {
      console.warn(e);
    }
    setUser(loggedInUser);
    navigate('mri');
  };

  const handleLogout = async () => {
    setActiveMriResult(null);
    setActiveQuestionnaireResult(null);
    try {
      sessionStorage.removeItem('neurobehavior_active_mri');
      sessionStorage.removeItem('neurobehavior_active_questionnaire');
    } catch (e) {
      console.warn(e);
    }
    await api.logout();
    setUser(null);
    setCurrentRoute('auth');
    window.location.hash = '#/login';
  };

  const renderActiveContent = () => {
    if (!user) {
      return <AuthPage onLoginSuccess={handleLoginSuccess} navigate={navigate} />;
    }

    switch (currentRoute) {
      case 'mri':
        return (
          <MriAssessmentPage
            user={user}
            navigate={navigate}
            activeMriResult={activeMriResult}
            onMriCompleted={handleMriCompleted}
          />
        );
      case 'questionnaire':
        return (
          <QuestionnairePage
            user={user}
            navigate={navigate}
            activeQuestionnaireResult={activeQuestionnaireResult}
            onQuestionnaireCompleted={handleQuestionnaireCompleted}
          />
        );
      case 'centres':
        return <SupportCentresPage user={user} navigate={navigate} />;
      case 'report':
      case 'results':
        return (
          <ResultsPage
            user={user}
            navigate={navigate}
            activeMriResult={activeMriResult}
            activeQuestionnaireResult={activeQuestionnaireResult}
          />
        );
      case 'admin':
        return user.role === 'admin' ? (
          <AdminDashboardPage user={user} navigate={navigate} />
        ) : (
          <MriAssessmentPage
            user={user}
            navigate={navigate}
            activeMriResult={activeMriResult}
            onMriCompleted={handleMriCompleted}
          />
        );
      default:
        return (
          <MriAssessmentPage
            user={user}
            navigate={navigate}
            activeMriResult={activeMriResult}
            onMriCompleted={handleMriCompleted}
          />
        );
    }
  };

  return (
    <div className="app-container">
      <StatusBanner backendStatus={backendHealth} />
      <Navbar
        currentRoute={currentRoute}
        setCurrentRoute={navigate}
        user={user}
        onLogout={handleLogout}
      />

      <main className="main-content">
        {/* 2-line layout: First line (MRI & Questionnaire side-by-side); Second line (Location Support & Report below) */}
        {user && (
          <div style={{ marginBottom: '26px' }}>
            {/* First Line: MRI Analysis and Questionnaire Analysis side-by-side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <button
                type="button"
                className={`workflow-nav-btn ${currentRoute === 'mri' ? 'active' : ''}`}
                onClick={() => navigate('mri')}
                title="Navigate to Brain MRI Biomarker Screening"
              >
                <span style={{ fontSize: '1.2rem' }}>🧠</span>
                <span>MRI Analysis {currentRoute === 'mri' && <span style={{ fontSize: '0.72rem', opacity: 0.9, marginLeft: '6px', background: 'rgba(255,255,255,0.25)', padding: '2px 8px', borderRadius: '999px' }}>Active</span>}</span>
              </button>
              <button
                type="button"
                className={`workflow-nav-btn ${currentRoute === 'questionnaire' ? 'active' : ''}`}
                onClick={() => navigate('questionnaire')}
                title="Navigate to 10-Item IASQ Behavioral Screening"
              >
                <span style={{ fontSize: '1.2rem' }}>📋</span>
                <span>Questionnaire Analysis {currentRoute === 'questionnaire' && <span style={{ fontSize: '0.72rem', opacity: 0.9, marginLeft: '6px', background: 'rgba(255,255,255,0.25)', padding: '2px 8px', borderRadius: '999px' }}>Active</span>}</span>
              </button>
            </div>

            {/* Second Line: Location Based Support and Report down below */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <button
                type="button"
                className={`workflow-nav-btn ${currentRoute === 'centres' ? 'active' : ''}`}
                onClick={() => navigate('centres')}
                title="Navigate to Location Based Healthcare Support Directory"
              >
                <span style={{ fontSize: '1.2rem' }}>📍</span>
                <span>Location Based Personalized Support {currentRoute === 'centres' && <span style={{ fontSize: '0.72rem', opacity: 0.9, marginLeft: '6px', background: 'rgba(255,255,255,0.25)', padding: '2px 8px', borderRadius: '999px' }}>Active</span>}</span>
              </button>
              <button
                type="button"
                className={`workflow-nav-btn ${currentRoute === 'report' || currentRoute === 'results' ? 'active' : ''}`}
                onClick={() => navigate('report')}
                title="Navigate to Unified Clinical Assessment Report"
              >
                <span style={{ fontSize: '1.2rem' }}>📄</span>
                <span>Report {(currentRoute === 'report' || currentRoute === 'results') && <span style={{ fontSize: '0.72rem', opacity: 0.9, marginLeft: '6px', background: 'rgba(255,255,255,0.25)', padding: '2px 8px', borderRadius: '999px' }}>Active</span>}</span>
              </button>
            </div>
          </div>
        )}

        {renderActiveContent()}
      </main>

      <Footer />
    </div>
  );
}
