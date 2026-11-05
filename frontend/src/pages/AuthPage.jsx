import React, { useState } from 'react';
import { api } from '../api/client';
import {
  validateEmail,
  evaluatePasswordStrength,
  validatePhoneNumber,
  validateAge,
  validateFullName,
} from '../utils/validators';

export default function AuthPage({ onLoginSuccess, navigate }) {
  // Mode: 'signin', 'register', 'forgot'
  const [authMode, setAuthMode] = useState('signin');

  // Common credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');

  // Register demographic & parent/guardian fields
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('21.0');
  const [gender, setGender] = useState('Female');
  const [bloodGroup, setBloodGroup] = useState('B-');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Parent / Guardian details for security and pediatric safety
  const [parentName, setParentName] = useState('');
  const [parentRelation, setParentRelation] = useState('Parent / Legal Guardian');
  const [parentPhone, setParentPhone] = useState('');

  // Touched state for professional on-the-fly validation feedback
  const [touched, setTouched] = useState({});

  // Forgot password flow state
  const [forgotStep, setForgotStep] = useState(1); // 1: request code, 2: verify & reset
  const [resetEmail, setResetEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [devCodeNotice, setDevCodeNotice] = useState(null);

  // Status feedback
  const [error, setError] = useState('');
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const markTouched = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // Live validation calculations
  const emailVal = validateEmail(email);
  const passStrength = evaluatePasswordStrength(password);
  const ageVal = validateAge(age);
  const nameVal = validateFullName(fullName);
  const phoneVal = validatePhoneNumber(phoneNumber);
  const parentNameVal = validateFullName(parentName);
  const parentPhoneVal = validatePhoneNumber(parentPhone);

  const isPasswordMatch = password && registerConfirmPassword && password === registerConfirmPassword;

  // Handle Login & Registration Submit with strict pre-submission validation
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsAlreadyRegistered(false);
    setSuccessMsg('');

    // Mark all relevant fields as touched
    if (authMode === 'register') {
      setTouched({
        fullName: true,
        age: true,
        phoneNumber: true,
        parentName: true,
        parentPhone: true,
        email: true,
        password: true,
        registerConfirmPassword: true,
      });

      // Validation assertions
      if (!nameVal.isValid) {
        setError(nameVal.message);
        return;
      }
      if (!ageVal.isValid) {
        setError(ageVal.message);
        return;
      }
      if (!phoneVal.isValid) {
        setError(phoneVal.message);
        return;
      }
      if (ageVal.isPediatric && !parentNameVal.isValid) {
        setError('Pediatric assent requires a valid Parent / Guardian Full Name.');
        return;
      }
      if (ageVal.isPediatric && !parentPhoneVal.isValid) {
        setError('Pediatric assent requires a valid Parent / Guardian Contact Number.');
        return;
      }
      if (!emailVal.isValid) {
        setError(emailVal.message);
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== registerConfirmPassword) {
        setError('Passwords do not match. Please re-enter.');
        return;
      }
    } else {
      setTouched({ email: true, password: true });
      if (!emailVal.isValid) {
        setError(emailVal.message);
        return;
      }
      if (!password) {
        setError('Password is required to sign in.');
        return;
      }
    }

    setLoading(true);

    try {
      if (authMode === 'register') {
        const payload = {
          full_name: fullName.trim(),
          email: email.trim(),
          password,
          age: ageVal.ageNum,
          gender,
          blood_group: bloodGroup,
          phone_number: phoneNumber.trim(),
          parent_name: parentName.trim(),
          parent_relation: parentRelation,
          parent_phone: parentPhone.trim(),
          role: 'patient',
        };

        const res = await api.register(payload);
        onLoginSuccess(res.user);
        navigate('mri');
      } else {
        const res = await api.login(email.trim(), password);
        onLoginSuccess(res.user);
        navigate('mri');
      }
    } catch (err) {
      const msg = err.message || 'Authentication failed. Please verify credentials.';
      setError(msg);

      if (
        msg.toLowerCase().includes('already registered') ||
        msg.toLowerCase().includes('already exists') ||
        err.status === 409
      ) {
        setIsAlreadyRegistered(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Forgot Password - Step 1: Send verification code to mail
  const handleSendVerificationCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setDevCodeNotice(null);

    const emailCheck = validateEmail(resetEmail);
    if (!emailCheck.isValid) {
      setError(emailCheck.message);
      return;
    }

    setLoading(true);

    try {
      const res = await api.forgotPassword(resetEmail.trim());
      setSuccessMsg(res.message || `Verification code sent to ${resetEmail}. Check your inbox.`);
      if (res.dev_code) {
        setDevCodeNotice(res.dev_code);
        setVerificationCode(res.dev_code);
      }
      setForgotStep(2);
    } catch (err) {
      setError(err.message || 'Could not send verification code. Please check the email entered.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Forgot Password - Step 2: Verify code & update password
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (verificationCode.trim().length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match. Please verify both fields.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.resetPassword(resetEmail.trim(), verificationCode.trim(), newPassword);
      setSuccessMsg(res.message || 'Password successfully updated! Please sign in with your new credentials.');
      setEmail(resetEmail);
      setPassword('');
      setAuthMode('signin');
      setForgotStep(1);
      setDevCodeNotice(null);
    } catch (err) {
      setError(err.message || 'Password reset failed. Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Demo Login Quick-Switcher
  const loginWithDemo = async (demoRole) => {
    setError('');
    setIsAlreadyRegistered(false);
    setSuccessMsg('');
    setLoading(true);

    let demoEmail = 'patient@demo.neurobehavior.org';
    let demoPass = 'password123';

    if (demoRole === 'admin') {
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
    <div style={{ maxWidth: '820px', margin: '20px auto 40px' }} className="fade-in">
      {/* Project Title Card */}
      <div className="card" style={{ textAlign: 'center', marginBottom: '22px', borderTop: '5px solid var(--primary)', padding: '26px 24px' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', margin: '0 auto 12px' }}>
          🧠
        </div>
        <h1 style={{ fontSize: '1.38rem', fontWeight: 800, color: 'var(--navy)', lineHeight: 1.38, marginBottom: '8px', letterSpacing: '-0.01em' }}>
          NeuroBehavior-ASD: Deep Learning-Based Autism Detection Using Brain Imaging Biomarkers and Behavioral Features
        </h1>
        <p style={{ fontSize: '0.86rem', color: 'var(--slate-500)', margin: 0 }}>
          Clinical Neuroimaging Biomarker Screening, Standardized IASQ Behavioral Intake & Geographic Care Navigation
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="card" style={{ padding: '30px' }}>
        {/* Navigation Switcher Tabs */}
        <div style={{ display: 'flex', background: 'var(--slate-100)', borderRadius: 'var(--radius-lg)', padding: '5px', marginBottom: '22px' }}>
          <button
            type="button"
            className="btn"
            style={{
              flex: 1,
              background: authMode === 'signin' ? 'var(--white)' : 'transparent',
              color: authMode === 'signin' ? 'var(--primary-dark)' : 'var(--slate-600)',
              fontWeight: authMode === 'signin' ? 700 : 500,
              boxShadow: authMode === 'signin' ? 'var(--shadow-xs)' : 'none',
              borderRadius: 'var(--radius-md)',
              padding: '10px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onClick={() => {
              setAuthMode('signin');
              setError('');
              setIsAlreadyRegistered(false);
              setSuccessMsg('');
            }}
          >
            Sign In
          </button>

          <button
            type="button"
            className="btn"
            style={{
              flex: 1,
              background: authMode === 'register' ? 'var(--white)' : 'transparent',
              color: authMode === 'register' ? 'var(--primary-dark)' : 'var(--slate-600)',
              fontWeight: authMode === 'register' ? 700 : 500,
              boxShadow: authMode === 'register' ? 'var(--shadow-xs)' : 'none',
              borderRadius: 'var(--radius-md)',
              padding: '10px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onClick={() => {
              setAuthMode('register');
              setError('');
              setIsAlreadyRegistered(false);
              setSuccessMsg('');
            }}
          >
            Register Patient Account
          </button>
        </div>

        {/* Header Title per Mode */}
        <div style={{ marginBottom: '18px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy)', margin: 0 }}>
            {authMode === 'register' && 'Register Patient & Clinical Profile'}
            {authMode === 'signin' && 'Sign In to Your Patient Portal'}
            {authMode === 'forgot' && 'Reset Your Account Password'}
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--slate-500)', marginTop: '4px' }}>
            {authMode === 'register' && 'Enter patient demographic profile and safety details for medical authentication.'}
            {authMode === 'signin' && 'Sign in to access your confidential assessment records and MRI evaluations.'}
            {authMode === 'forgot' && 'We will send a 6-digit verification code to your registered email address.'}
          </p>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="alert alert-info" style={{ padding: '12px 16px', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>✅</span>
            <div>{successMsg}</div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="alert alert-warning" style={{ padding: '12px 16px', fontSize: '0.85rem', marginBottom: '16px', borderLeft: '4px solid #ef4444' }}>
            <div style={{ fontWeight: 700, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>⚠️</span> {error}
            </div>
            {isAlreadyRegistered && (
              <div style={{ marginTop: '8px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  onClick={() => {
                    setAuthMode('signin');
                    setError('');
                    setIsAlreadyRegistered(false);
                  }}
                >
                  ➔ Go to Sign In
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  onClick={() => {
                    setResetEmail(email);
                    setAuthMode('forgot');
                    setForgotStep(1);
                    setError('');
                    setIsAlreadyRegistered(false);
                  }}
                >
                  🔑 Reset Password
                </button>
              </div>
            )}
          </div>
        )}

        {/* Developer / Presentation Code Banner */}
        {devCodeNotice && (
          <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', fontSize: '0.82rem', color: '#065f46' }}>
            <strong>🔑 Verification Code Sent to Email: </strong>
            <span style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '2px', background: '#ffffff', padding: '2px 8px', borderRadius: '4px', border: '1px solid #a7f3d0' }}>
              {devCodeNotice}
            </span>
            <div style={{ marginTop: '4px', fontSize: '0.76rem', color: '#047857' }}>
              (Dispatched to mail ID; code shown here for fast verification without external SMTP wait)
            </div>
          </div>
        )}

        {/* =========================================================================
            MODE 1 & 2: SIGN IN & REGISTER FORMS
        ========================================================================= */}
        {authMode !== 'forgot' && (
          <form onSubmit={handleAuthSubmit} noValidate>
            {authMode === 'register' && (
              <>
                {/* 1. PATIENT BASIC PROFILE */}
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label" htmlFor="regFullName" style={{ fontWeight: 700 }}>
                    Patient Full Legal Name <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    id="regFullName"
                    type="text"
                    className={`form-input ${touched.fullName ? (nameVal.isValid ? 'is-valid' : 'is-invalid') : ''}`}
                    placeholder="e.g. Aarav Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    onBlur={() => markTouched('fullName')}
                    required
                  />
                  {touched.fullName && !nameVal.isValid && (
                    <div className="field-error-msg">⚠️ {nameVal.message}</div>
                  )}
                  {touched.fullName && nameVal.isValid && (
                    <div className="field-success-msg">✓ Valid legal name</div>
                  )}
                </div>

                {/* Age, Gender, Blood Group */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label className="form-label" htmlFor="regAge" style={{ fontWeight: 700 }}>
                      Age (Years) <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      id="regAge"
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="120"
                      className={`form-input ${touched.age ? (ageVal.isValid ? 'is-valid' : 'is-invalid') : ''}`}
                      placeholder="e.g. 5.0 (0.1 for 1 mo)"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      onBlur={() => markTouched('age')}
                      required
                    />
                    {touched.age && !ageVal.isValid && (
                      <div className="field-error-msg">⚠️ {ageVal.message}</div>
                    )}
                    {touched.age && ageVal.isValid && (
                      <div className="field-success-msg">✓ {ageVal.categoryLabel}</div>
                    )}
                  </div>

                  <div>
                    <label className="form-label" htmlFor="regGender" style={{ fontWeight: 700 }}>
                      Gender <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <select
                      id="regGender"
                      className="form-input is-valid"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      required
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label" htmlFor="regBloodGroup" style={{ fontWeight: 700 }}>
                      Blood Group <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <select
                      id="regBloodGroup"
                      className="form-input is-valid"
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      required
                    >
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                </div>

                {/* Patient Phone Number */}
                <div className="form-group" style={{ marginBottom: '18px' }}>
                  <label className="form-label" htmlFor="regPhone" style={{ fontWeight: 700 }}>
                    Patient Contact Number <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    id="regPhone"
                    type="tel"
                    className={`form-input ${touched.phoneNumber ? (phoneVal.isValid ? 'is-valid' : 'is-invalid') : ''}`}
                    placeholder="e.g. +91 9876543210 (10 digits)"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    onBlur={() => markTouched('phoneNumber')}
                    required
                  />
                  {touched.phoneNumber && !phoneVal.isValid && (
                    <div className="field-error-msg">⚠️ {phoneVal.message}</div>
                  )}
                  {touched.phoneNumber && phoneVal.isValid && (
                    <div className="field-success-msg">✓ Valid contact number</div>
                  )}
                </div>

                {/* 2. PARENT / GUARDIAN DETAILS SECTION (Safety & Authentication) */}
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '18px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '1.25rem' }}>🛡️</span>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#1e3a8a' }}>
                        Parent / Guardian Profile (Pediatric Assent & Safety)
                      </h4>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                        Mandatory for minors and pediatric infants; optional verification for adults.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label className="form-label" htmlFor="parentName" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                        Guardian Full Name <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <input
                        id="parentName"
                        type="text"
                        className={`form-input ${touched.parentName ? (parentNameVal.isValid ? 'is-valid' : 'is-invalid') : ''}`}
                        placeholder="e.g. Rajesh Sharma"
                        value={parentName}
                        onChange={(e) => setParentName(e.target.value)}
                        onBlur={() => markTouched('parentName')}
                        required
                      />
                      {touched.parentName && !parentNameVal.isValid && (
                        <div className="field-error-msg">⚠️ {parentNameVal.message}</div>
                      )}
                    </div>

                    <div>
                      <label className="form-label" htmlFor="parentRelation" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                        Relationship to Patient <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <select
                        id="parentRelation"
                        className="form-input is-valid"
                        value={parentRelation}
                        onChange={(e) => setParentRelation(e.target.value)}
                        required
                      >
                        <option value="Mother">Mother</option>
                        <option value="Father">Father</option>
                        <option value="Parent / Legal Guardian">Parent / Legal Guardian</option>
                        <option value="Spouse">Spouse</option>
                        <option value="Self (Adult Consent)">Self (Adult Consent)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="form-label" htmlFor="parentPhone" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                      Guardian Contact Phone <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      id="parentPhone"
                      type="tel"
                      className={`form-input ${touched.parentPhone ? (parentPhoneVal.isValid ? 'is-valid' : 'is-invalid') : ''}`}
                      placeholder="e.g. +91 9123456789 (10 digits)"
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      onBlur={() => markTouched('parentPhone')}
                      required
                    />
                    {touched.parentPhone && !parentPhoneVal.isValid && (
                      <div className="field-error-msg">⚠️ {parentPhoneVal.message}</div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Email Address */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" htmlFor="authEmail" style={{ fontWeight: 700 }}>
                Email Address <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                id="authEmail"
                type="email"
                className={`form-input ${touched.email ? (emailVal.isValid ? 'is-valid' : 'is-invalid') : ''}`}
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => markTouched('email')}
                required
              />
              {touched.email && !emailVal.isValid && (
                <div className="field-error-msg">⚠️ {emailVal.message}</div>
              )}
              {touched.email && emailVal.isValid && (
                <div className="field-success-msg">✓ Valid clinical email format</div>
              )}
            </div>

            {/* Password */}
            <div className="form-group" style={{ marginBottom: authMode === 'signin' ? '8px' : '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" htmlFor="authPass" style={{ fontWeight: 700, margin: 0 }}>
                  Password <span style={{ color: '#dc2626' }}>*</span>
                </label>
                {authMode === 'signin' && (
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                    onClick={() => {
                      setResetEmail(email);
                      setAuthMode('forgot');
                      setForgotStep(1);
                      setError('');
                      setSuccessMsg('');
                    }}
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <input
                id="authPass"
                type="password"
                className={`form-input ${touched.password ? (password.length >= 6 ? 'is-valid' : 'is-invalid') : ''}`}
                placeholder={authMode === 'register' ? 'Choose a strong password (min 6 characters)' : 'Enter your password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => markTouched('password')}
                required
              />
              {authMode === 'register' && password && (
                <div className="password-meter-container">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                    <span style={{ color: 'var(--slate-600)' }}>Password Strength:</span>
                    <strong style={{ color: passStrength.color }}>{passStrength.label}</strong>
                  </div>
                  <div className="password-meter-track">
                    <div className="password-meter-segment" style={{ background: passStrength.score >= 1 ? passStrength.color : '#e2e8f0' }} />
                    <div className="password-meter-segment" style={{ background: passStrength.score >= 2 ? passStrength.color : '#e2e8f0' }} />
                    <div className="password-meter-segment" style={{ background: passStrength.score >= 3 ? passStrength.color : '#e2e8f0' }} />
                    <div className="password-meter-segment" style={{ background: passStrength.score >= 4 ? passStrength.color : '#e2e8f0' }} />
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--slate-500)' }}>{passStrength.feedback}</div>
                </div>
              )}
            </div>

            {/* Confirm Password (Register Mode only) */}
            {authMode === 'register' && (
              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label className="form-label" htmlFor="regConfirmPass" style={{ fontWeight: 700 }}>
                  Confirm Password <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="regConfirmPass"
                  type="password"
                  className={`form-input ${touched.registerConfirmPassword ? (isPasswordMatch ? 'is-valid' : 'is-invalid') : ''}`}
                  placeholder="Re-enter your chosen password"
                  value={registerConfirmPassword}
                  onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                  onBlur={() => markTouched('registerConfirmPassword')}
                  required
                />
                {touched.registerConfirmPassword && !isPasswordMatch && (
                  <div className="field-error-msg">⚠️ Passwords do not match.</div>
                )}
                {touched.registerConfirmPassword && isPasswordMatch && (
                  <div className="field-success-msg">✓ Passwords match successfully</div>
                )}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '13px', fontSize: '0.96rem', marginTop: '12px' }}
              disabled={loading}
            >
              {loading
                ? 'Authenticating & Verifying...'
                : (authMode === 'register' ? 'Register Secure Patient Account ➔' : 'Sign In ➔')}
            </button>
          </form>
        )}

        {/* =========================================================================
            MODE 3: FORGOT PASSWORD (VERIFY MAIL & SET NEW PASSWORD)
        ========================================================================= */}
        {authMode === 'forgot' && (
          <div className="fade-in">
            {forgotStep === 1 ? (
              <form onSubmit={handleSendVerificationCode} noValidate>
                <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '14px', marginBottom: '18px', fontSize: '0.84rem', color: '#0369a1' }}>
                  <strong>🔒 Secure Email Verification:</strong> Enter the email address linked to your account. We will dispatch a 6-digit verification code to confirm your identity.
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="resetEmailInput" style={{ fontWeight: 700 }}>
                    Registered Email Address <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    id="resetEmailInput"
                    type="email"
                    className="form-input"
                    placeholder="name@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px', fontSize: '0.94rem', marginTop: '10px' }}
                  disabled={loading}
                >
                  {loading ? 'Sending Code to Mail...' : 'Send Verification Code to Mail ➔'}
                </button>

                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--slate-600)', fontSize: '0.84rem', cursor: 'pointer', fontWeight: 600 }}
                    onClick={() => {
                      setAuthMode('signin');
                      setError('');
                      setSuccessMsg('');
                    }}
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPasswordSubmit} noValidate>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '0.84rem', color: '#166534' }}>
                  Verification code dispatched to <strong>{resetEmail}</strong>. Enter the 6-digit code below to set your new password.
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="verifyCodeInput" style={{ fontWeight: 700 }}>
                    6-Digit Verification Code <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    id="verifyCodeInput"
                    type="text"
                    maxLength="6"
                    className="form-input"
                    placeholder="Enter 6-digit code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    style={{ letterSpacing: '4px', fontSize: '1.1rem', fontWeight: 700, textAlign: 'center' }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="newPassInput" style={{ fontWeight: 700 }}>
                    New Password <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    id="newPassInput"
                    type="password"
                    className="form-input"
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="confirmPassInput" style={{ fontWeight: 700 }}>
                    Confirm New Password <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    id="confirmPassInput"
                    type="password"
                    className="form-input"
                    placeholder="Re-type new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px', fontSize: '0.94rem', marginTop: '10px' }}
                  disabled={loading}
                >
                  {loading ? 'Verifying & Updating Password...' : 'Verify Code & Set New Password ➔'}
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontSize: '0.82rem' }}>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                    onClick={() => setForgotStep(1)}
                  >
                    Resend Code
                  </button>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--slate-600)', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                    onClick={() => {
                      setAuthMode('signin');
                      setError('');
                      setSuccessMsg('');
                    }}
                  >
                    Cancel & Return to Sign In
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* 1-Click Demo Profiles (Only shown on Sign In) */}
        {authMode === 'signin' && (
          <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid var(--slate-200)' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', textAlign: 'center', marginBottom: '10px' }}>
              Or Instant 1-Click Demo Access
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '0.86rem', padding: '12px 10px', flexDirection: 'column', gap: '4px' }}
                onClick={() => loginWithDemo('patient')}
                disabled={loading}
              >
                <span style={{ fontSize: '1.3rem' }}>👤</span>
                <strong>Demo Patient</strong>
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '0.86rem', padding: '12px 10px', flexDirection: 'column', gap: '4px' }}
                onClick={() => loginWithDemo('admin')}
                disabled={loading}
              >
                <span style={{ fontSize: '1.3rem' }}>⚙️</span>
                <strong>Admin Account</strong>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
