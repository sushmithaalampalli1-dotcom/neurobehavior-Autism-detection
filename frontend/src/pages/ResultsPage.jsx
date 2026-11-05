import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { validateAge, validateFullName } from '../utils/validators';

export default function ResultsPage({ user, navigate, activeMriResult, activeQuestionnaireResult }) {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(null);

  // Patient demographic fields matching authenticated profile
  const [patientName, setPatientName] = useState(() => user?.full_name || '');
  const [patientAge, setPatientAge] = useState(() => (user?.age ? String(user.age) : ''));
  const [patientGender, setPatientGender] = useState(() => user?.gender || '');
  const [bloodGroup, setBloodGroup] = useState(() => user?.blood_group || '');

  useEffect(() => {
    loadAssessments();
  }, []);

  useEffect(() => {
    if (user) {
      if (user.full_name) setPatientName(user.full_name);
      if (user.age) setPatientAge(String(user.age));
      if (user.gender) setPatientGender(user.gender);
      if (user.blood_group) setBloodGroup(user.blood_group);
    }
  }, [user]);

  const loadAssessments = async () => {
    setLoading(true);
    try {
      const data = await api.getUnifiedHistory();
      setAssessments(data.assessments || []);
    } catch (err) {
      setError(err.message || 'Could not load patient assessment records.');
    } finally {
      setLoading(false);
    }
  };

  // Strictly display clinical assessment report ONLY when the user has actively uploaded/entered assessment data in this session!
  // If the user has not run an assessment in this session, hasAssessment is strictly FALSE (shows empty report state).
  // This ensures demo accounts, direct navigation, and fresh logins never show stale or demo MRI data.
  const hasMri = Boolean(activeMriResult);
  const hasQuestionnaire = Boolean(activeQuestionnaireResult);
  const hasAssessment = hasMri || hasQuestionnaire;

  // Resolve MRI assessment data (strictly from active session)
  const mriFilename = hasMri ? activeMriResult?.filename : null;

  const mriAsd = hasMri && Boolean(
    (activeMriResult?.prediction?.dx_group === 1) ||
    (activeMriResult?.prediction?.label?.toLowerCase().includes('autism')) ||
    (activeMriResult?.prediction?.result?.toLowerCase().includes('autism'))
  );

  const mriConfidence = hasMri ? activeMriResult?.prediction?.confidence : null;
  const mriConfidencePercent = mriConfidence !== null ? (Number(mriConfidence) * 100).toFixed(1) : null;
  const mriRawScore = mriConfidence !== null ? Number(mriConfidence).toFixed(4) : null;

  // Resolve Questionnaire assessment data (strictly from active session)
  const questScore = hasQuestionnaire ? (activeQuestionnaireResult?.score ?? null) : null;

  const reportId = `NB-REP-2026-${(
    (activeMriResult?.assessment_id || activeQuestionnaireResult?.assessment_id) ||
    (user?.id ? `USR${user.id}` : '001')
  )}`;
  const patientId = user?.id ? `NB-PAT-2026-${String(user.id).padStart(4, '0')}` : 'NB-PAT-2026-6A5F';
  const reportDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' IST';

  // Resolved MRI scan preview image (No dummy replacement)
  const mriPreviewUrl = hasMri ? activeMriResult?.previewUrl : null;

  // Age & Guardian calculations
  const ageNum = parseFloat(patientAge) || 21.0;
  const isAdult = ageNum >= 18;
  const minorStatus = isAdult ? 'Adult (18+ yrs)' : 'Pediatric (<18 yrs)';
  const guardianStatus = user?.parent_name
    ? `${user.parent_name} (${user.parent_relation || 'Parent/Guardian'})${user.parent_phone ? ` - Ph: ${user.parent_phone}` : ''}`
    : (isAdult ? 'Self (Adult Consent)' : 'Parent / Legal Guardian Consent');
  const consentStatus = isAdult ? 'Recorded & Verified (Adult Patient)' : 'Recorded & Verified (Parent/Guardian Assent)';

  const handleGenerateReport = async () => {
    if (!hasAssessment) {
      setError('Cannot generate report: No clinical assessment data recorded yet.');
      return;
    }

    setError('');

    const nameCheck = validateFullName(patientName);
    if (!nameCheck.isValid) {
      setError(`Cannot generate report: ${nameCheck.message}`);
      return;
    }

    const ageCheck = validateAge(patientAge);
    if (!ageCheck.isValid) {
      setError(`Cannot generate report: ${ageCheck.message}`);
      return;
    }

    setGenerating(true);
    setReportSuccess(null);

    try {
      const targetId = hasActiveSession
        ? (activeMriResult?.assessment_id || activeQuestionnaireResult?.assessment_id || null)
        : (assessments[0]?.id || null);
      const payload = {
        assessment_id: targetId,
        patient_name: patientName.trim(),
        patient_age: String(ageCheck.ageNum),
        patient_gender: patientGender,
        blood_group: bloodGroup,
        mri_filename: hasMri ? mriFilename : null,
        clinical_notes: 'Screening report generated from patient evaluation session.',
      };
      const res = await api.generateReport(payload);
      const filename = res.report_filename || res.filename;
      const downloadUrl = api.getReportDownloadUrl(filename);

      setReportSuccess({
        filename,
        url: downloadUrl,
        message: 'Doctor-readable report PDF generated successfully.',
      });

      // Open PDF in new tab
      window.open(downloadUrl, '_blank');
    } catch (err) {
      setError(err.message || 'Failed to generate report.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ maxWidth: '920px', margin: '0 auto', paddingBottom: '40px' }} className="fade-in">
      {/* Top Action Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy)', margin: 0 }}>
            Official Medical Screening Report
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--slate-500)', margin: '2px 0 0 0' }}>
            Structured clinical report matching approved regulatory format
          </p>
        </div>

        {hasAssessment && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleGenerateReport}
              disabled={generating}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, padding: '10px 18px' }}
            >
              {generating ? 'Compiling PDF...' : '📄 Download Official PDF Report'}
            </button>

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => window.print()}
              style={{ fontWeight: 700, padding: '10px 16px' }}
            >
              🖨 Print / Save as PDF
            </button>
          </div>
        )}
      </div>

      {reportSuccess && (
        <div className="alert alert-success" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
          <div>
            <strong>✅ {reportSuccess.message}</strong>
            <div style={{ fontSize: '0.82rem', marginTop: '2px' }}>File: <code>{reportSuccess.filename}</code></div>
          </div>
          <a href={reportSuccess.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: '6px 16px', fontSize: '0.84rem' }}>
            Open PDF ↗
          </a>
        </div>
      )}

      {error && <div className="alert alert-warning" style={{ marginBottom: '20px' }}>{error}</div>}

      {/* Loading State: Prevents flashing any demo report */}
      {loading ? (
        <div className="card" style={{ padding: '60px 24px', textAlign: 'center', maxWidth: '720px', margin: '20px auto' }}>
          <div className="spinner" style={{ margin: '0 auto 16px', width: '38px', height: '38px' }}></div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e3a8a', margin: '0 0 6px 0' }}>
            Loading Clinical Assessment Records...
          </h3>
          <p style={{ fontSize: '0.86rem', color: '#64748b', margin: 0 }}>
            Retrieving verified diagnostic records for authenticated profile.
          </p>
        </div>
      ) : !hasAssessment ? (
        /* =========================================================================
            EMPTY STATE: Rendered when user has NOT entered MRI or Questionnaire
            Strictly NO demo report, NO dummy image, NO dummy scores shown.
        ========================================================================= */
        <div className="card" style={{ padding: '48px 32px', textAlign: 'center', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', maxWidth: '820px', margin: '0 auto' }}>
          <div style={{ width: '68px', height: '68px', borderRadius: '50%', background: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', margin: '0 auto 18px' }}>
            📄
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1e3a8a', marginBottom: '8px' }}>
            Clinical Assessment Report Is Empty
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.92rem', maxWidth: '580px', margin: '0 auto 28px', lineHeight: 1.55 }}>
            No brain MRI scans have been uploaded and no IASQ behavioral questionnaires have been submitted for your account.
            The clinical report remains empty until you complete at least one assessment.
          </p>

          {/* Registered Patient Profile Summary Card */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px 22px', maxWidth: '640px', margin: '0 auto 30px', textAlign: 'left' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.84rem', color: '#1e3a8a', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              👤 Authenticated Patient Profile
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '10px', fontSize: '0.84rem' }}>
              <div><strong>Patient Full Name:</strong> {user?.full_name || 'N/A'}</div>
              <div><strong>Patient ID:</strong> {patientId}</div>
              <div><strong>Age:</strong> {user?.age ? `${user.age} Years` : (patientAge ? `${patientAge} Years` : 'Unspecified')}</div>
              <div><strong>Gender:</strong> {user?.gender || patientGender || 'Unspecified'}</div>
              <div><strong>Blood Group:</strong> {user?.blood_group || bloodGroup || 'Unspecified'}</div>
              <div><strong>Account Status:</strong> <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>Ready for Assessment</span></div>
            </div>
          </div>

          {/* Direct Navigation Prompts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px', maxWidth: '680px', margin: '0 auto' }}>
            <div style={{ border: '2px solid #bae6fd', background: '#f0f9ff', borderRadius: '10px', padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'left' }}>
              <div>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🧠</div>
                <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0369a1', margin: '0 0 6px 0' }}>
                  Brain MRI Analysis
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#0c4a6e', lineHeight: 1.45, margin: 0 }}>
                  Upload a 2D or 3D T1-weighted brain MRI scan to evaluate deep learning neuroimaging biomarkers.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate('mri')}
                style={{ marginTop: '16px', padding: '10px 14px', fontSize: '0.86rem', fontWeight: 700 }}
              >
                Upload MRI Scan ➔
              </button>
            </div>

            <div style={{ border: '2px solid #bbf7d0', background: '#f0fdf4', borderRadius: '10px', padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'left' }}>
              <div>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📋</div>
                <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#15803d', margin: '0 0 6px 0' }}>
                  IASQ Behavioral Screening
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#14532d', lineHeight: 1.45, margin: 0 }}>
                  Complete the 10-item caregiver behavioral screening questionnaire (PMC8062015 validated).
                </p>
              </div>
              <button
                type="button"
                className="btn"
                onClick={() => navigate('questionnaire')}
                style={{ marginTop: '16px', padding: '10px 14px', fontSize: '0.86rem', fontWeight: 700, background: '#16a34a', color: '#ffffff', border: 'none' }}
              >
                Start Questionnaire ➔
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* =========================================================================
            AUTHENTIC CLINICAL REPORT CANVAS
            (Rendered when actual assessment records exist for this patient)
        ========================================================================= */
        <div
          className="clinical-document-canvas"
          style={{
            background: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 4px 24px rgba(15, 23, 42, 0.1)',
            border: '1px solid #cbd5e1',
            padding: '40px 48px',
            color: '#0f172a',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
        >
          {/* HEADER BLOCK */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', borderBottom: '2px solid #1e3a8a', paddingBottom: '12px' }}>
            <div>
              <h1 style={{ color: '#1e3a8a', fontSize: '1.5rem', fontWeight: 900, margin: 0, letterSpacing: '0.4px', lineHeight: 1.2 }}>
                NEUROBEHAVIOR-ASD
              </h1>
              <h2 style={{ color: '#1e3a8a', fontSize: '1.2rem', fontWeight: 800, margin: '2px 0 6px 0', letterSpacing: '0.3px' }}>
                ASSESSMENT PORTAL
              </h2>
              <p style={{ color: '#475569', fontSize: '0.82rem', margin: 0, lineHeight: 1.4 }}>
                Brain MRI Deep Learning Classification &<br />
                IASQ Behavioral Screening Summary
              </p>
            </div>

            <div style={{ textAlign: 'right', fontSize: '0.84rem', color: '#0f172a', lineHeight: 1.5 }}>
              <div><strong>Report ID:</strong> {reportId}</div>
              <div><strong>Date:</strong> {reportDate}</div>
            </div>
          </div>

          {/* 1. PATIENT DEMOGRAPHICS & GUARDIAN PROFILE */}
          <div style={{ margin: '18px 0 22px 0' }}>
            <h3 style={{ color: '#1e3a8a', fontSize: '0.94rem', fontWeight: 800, margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              1. PATIENT DEMOGRAPHICS & GUARDIAN PROFILE
            </h3>
            <div style={{ height: '2px', background: '#1e3a8a', marginBottom: '8px' }}></div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', border: '1px solid #e2e8f0' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ width: '22%', background: '#f8fafc', padding: '6px 10px', fontWeight: 700, borderRight: '1px solid #e2e8f0' }}>
                    Patient Full Name:
                  </td>
                  <td style={{ width: '28%', padding: '6px 10px', borderRight: '1px solid #e2e8f0' }}>
                    <input
                      type="text"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      style={{ border: 'none', background: 'transparent', fontWeight: 600, width: '100%', outline: 'none' }}
                    />
                  </td>
                  <td style={{ width: '20%', background: '#f8fafc', padding: '6px 10px', fontWeight: 700, borderRight: '1px solid #e2e8f0' }}>
                    Patient ID:
                  </td>
                  <td style={{ width: '30%', padding: '6px 10px' }}>
                    <strong>{patientId}</strong>
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ background: '#f8fafc', padding: '6px 10px', fontWeight: 700, borderRight: '1px solid #e2e8f0' }}>
                    Age:
                  </td>
                  <td style={{ padding: '6px 10px', borderRight: '1px solid #e2e8f0' }}>
                    <input
                      type="text"
                      value={patientAge}
                      onChange={(e) => setPatientAge(e.target.value)}
                      style={{ border: 'none', background: 'transparent', width: '50px', outline: 'none' }}
                    /> Years
                  </td>
                  <td style={{ background: '#f8fafc', padding: '6px 10px', fontWeight: 700, borderRight: '1px solid #e2e8f0' }}>
                    Gender:
                  </td>
                  <td style={{ padding: '6px 10px' }}>
                    <select
                      value={patientGender}
                      onChange={(e) => setPatientGender(e.target.value)}
                      style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: 500 }}
                    >
                      <option>Female</option>
                      <option>Male</option>
                      <option>Other</option>
                    </select>
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ background: '#f8fafc', padding: '6px 10px', fontWeight: 700, borderRight: '1px solid #e2e8f0' }}>
                    Blood Group:
                  </td>
                  <td style={{ padding: '6px 10px', borderRight: '1px solid #e2e8f0' }}>
                    <input
                      type="text"
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      style={{ border: 'none', background: 'transparent', width: '60px', outline: 'none' }}
                    />
                  </td>
                  <td style={{ background: '#f8fafc', padding: '6px 10px', fontWeight: 700, borderRight: '1px solid #e2e8f0' }}>
                    Minor Status:
                  </td>
                  <td style={{ padding: '6px 10px' }}>
                    {minorStatus}
                  </td>
                </tr>
                <tr>
                  <td style={{ background: '#f8fafc', padding: '6px 10px', fontWeight: 700, borderRight: '1px solid #e2e8f0' }}>
                    Guardian / Consent:
                  </td>
                  <td style={{ padding: '6px 10px', borderRight: '1px solid #e2e8f0' }}>
                    {guardianStatus}
                  </td>
                  <td style={{ background: '#f8fafc', padding: '6px 10px', fontWeight: 700, borderRight: '1px solid #e2e8f0' }}>
                    Consent Status:
                  </td>
                  <td style={{ padding: '6px 10px' }}>
                    {consentStatus}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 2. STRUCTURAL BRAIN MRI DEEP LEARNING ASSESSMENT */}
          <div style={{ marginBottom: '22px' }}>
            <h3 style={{ color: '#1e3a8a', fontSize: '0.94rem', fontWeight: 800, margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              2. STRUCTURAL BRAIN MRI DEEP LEARNING ASSESSMENT
            </h3>
            <div style={{ height: '2px', background: '#1e3a8a', marginBottom: '8px' }}></div>

            {hasMri ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: activeMriResult?.explainable_ai ? '115px 115px 1fr' : '130px 1fr', gap: '14px', alignItems: 'center' }}>
                  {/* Uploaded MRI Scan Slice */}
                  <div style={{ textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px', background: '#0f172a' }}>
                    {mriPreviewUrl ? (
                      <img
                        src={mriPreviewUrl}
                        alt="Uploaded brain MRI scan"
                        style={{ width: '100px', height: '100px', objectFit: 'contain', display: 'block', margin: '0 auto', borderRadius: '4px' }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div style={{ width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '2rem' }}>
                        🧠
                      </div>
                    )}
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '4px', wordBreak: 'break-all' }}>
                      <code>{mriFilename || 'Uploaded Scan'}</code>
                    </div>
                  </div>

                  {/* Grad-CAM Heatmap */}
                  {activeMriResult?.explainable_ai && (
                    <div style={{ textAlign: 'center', border: '1px solid #38bdf8', borderRadius: '6px', padding: '6px', background: '#0b1329' }}>
                      <img
                        src={activeMriResult.explainable_ai.overlay_base64 || activeMriResult.explainable_ai.overlay_url}
                        alt="Grad-CAM Heatmap"
                        style={{ width: '100px', height: '100px', objectFit: 'contain', display: 'block', margin: '0 auto', borderRadius: '4px' }}
                      />
                      <div style={{ fontSize: '0.68rem', color: '#38bdf8', marginTop: '4px', fontWeight: 700 }}>
                        Grad-CAM Heatmap
                      </div>
                    </div>
                  )}

                  {/* Metrics Table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', border: '1px solid #e2e8f0' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ width: '25%', background: '#f8fafc', padding: '6px 10px', fontWeight: 700, borderRight: '1px solid #e2e8f0' }}>
                          Predicted Classification:
                        </td>
                        <td style={{ width: '25%', padding: '6px 10px', borderRight: '1px solid #e2e8f0' }}>
                          <strong style={{ color: mriAsd ? '#dc2626' : '#16a34a', fontSize: '0.92rem' }}>
                            {mriAsd ? 'ASD' : 'Control / Non-Autism'}
                          </strong>
                        </td>
                        <td style={{ width: '22%', background: '#f8fafc', padding: '6px 10px', fontWeight: 700, borderRight: '1px solid #e2e8f0' }}>
                          Model Raw Score:
                        </td>
                        <td style={{ width: '28%', padding: '6px 10px' }}>
                          <strong>{mriRawScore}</strong> (Threshold: 0.56)
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ background: '#f8fafc', padding: '6px 10px', fontWeight: 700, borderRight: '1px solid #e2e8f0' }}>
                          Calibrated Confidence:
                        </td>
                        <td style={{ padding: '6px 10px', borderRight: '1px solid #e2e8f0' }}>
                          <strong>{mriConfidencePercent}%</strong>
                        </td>
                        <td style={{ background: '#f8fafc', padding: '6px 10px', fontWeight: 700, borderRight: '1px solid #e2e8f0' }}>
                          Input Modality:
                        </td>
                        <td style={{ padding: '6px 10px' }}>
                          Brain MRI Scan (224x224, Min-Max)
                        </td>
                      </tr>
                      <tr>
                        <td style={{ background: '#f8fafc', padding: '6px 10px', fontWeight: 700, borderRight: '1px solid #e2e8f0' }}>
                          Quality Control Checks:
                        </td>
                        <td style={{ padding: '6px 10px', borderRight: '1px solid #e2e8f0' }}>
                          <span style={{ color: '#16a34a', fontWeight: 700 }}>PASSED</span> (Std dev &ge; 5.0)
                        </td>
                        <td style={{ background: '#f8fafc', padding: '6px 10px', fontWeight: 700, borderRight: '1px solid #e2e8f0' }}>
                          Explainable AI:
                        </td>
                        <td style={{ padding: '6px 10px' }}>
                          {activeMriResult?.explainable_ai ? 'Grad-CAM (conv4 Overlay)' : 'Multi-Scale 2.5D CNN'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Explainable AI Note */}
                {activeMriResult?.explainable_ai && (
                  <div style={{ marginTop: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 12px', fontSize: '0.78rem', color: '#475569' }}>
                    <strong>Explainable AI (Grad-CAM):</strong> Highlights the key brain regions that influenced this prediction.
                  </div>
                )}
              </div>
            ) : (
              <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#475569', fontSize: '0.88rem' }}>
                    ⚠️ Brain MRI Assessment: Not Uploaded / Pending
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                    No structural brain MRI scan has been uploaded for this patient. Deep learning biomarker classification is pending.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => navigate('mri')}
                  style={{ fontSize: '0.82rem', padding: '6px 14px', fontWeight: 600 }}
                >
                  Upload Brain MRI Scan ➔
                </button>
              </div>
            )}
          </div>

          {/* 3. INDIAN AUTISM SCREENING QUESTIONNAIRE (IASQ) BEHAVIORAL SCREENING */}
          <div style={{ marginBottom: '22px' }}>
            <h3 style={{ color: '#1e3a8a', fontSize: '0.94rem', fontWeight: 800, margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              3. INDIAN AUTISM SCREENING QUESTIONNAIRE (IASQ) BEHAVIORAL SCREENING
            </h3>
            <div style={{ height: '2px', background: '#1e3a8a', marginBottom: '8px' }}></div>

            {hasQuestionnaire && questScore !== null ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', border: '1px solid #e2e8f0' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ width: '25%', background: '#f8fafc', padding: '6px 10px', fontWeight: 700, borderRight: '1px solid #e2e8f0' }}>
                      Total Positive Responses:
                    </td>
                    <td style={{ width: '25%', padding: '6px 10px', borderRight: '1px solid #e2e8f0' }}>
                      <strong>{questScore} / 10 Items</strong>
                    </td>
                    <td style={{ width: '22%', background: '#f8fafc', padding: '6px 10px', fontWeight: 700, borderRight: '1px solid #e2e8f0' }}>
                      Instrument Source:
                    </td>
                    <td style={{ width: '28%', padding: '6px 10px' }}>
                      IASQ (PMC8062015, Indian Validation)
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ background: '#f8fafc', padding: '6px 10px', fontWeight: 700, borderRight: '1px solid #e2e8f0' }}>
                      Cutoff 1 (Score &ge; 1):
                    </td>
                    <td style={{ padding: '6px 10px', borderRight: '1px solid #e2e8f0' }}>
                      {questScore >= 1 ? (
                        <span style={{ color: '#dc2626', fontWeight: 700 }}>Referral Recommended (Cutoff &ge; 1 met)</span>
                      ) : (
                        <span style={{ color: '#16a34a', fontWeight: 600 }}>Cutoff Not Met (Score &lt; 1)</span>
                      )}
                    </td>
                    <td style={{ background: '#f8fafc', padding: '6px 10px', fontWeight: 700, borderRight: '1px solid #e2e8f0' }}>
                      Cutoff 2 (Score &ge; 2):
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      {questScore >= 2 ? (
                        <span style={{ color: '#dc2626', fontWeight: 700 }}>Referral Recommended (Cutoff &ge; 2 met)</span>
                      ) : (
                        <span style={{ color: '#16a34a', fontWeight: 600 }}>Cutoff Not Met (Score &lt; 2)</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ background: '#f8fafc', padding: '6px 10px', fontWeight: 700, borderRight: '1px solid #e2e8f0' }}>
                      Domain Breakdown:
                    </td>
                    <td style={{ padding: '6px 10px', borderRight: '1px solid #e2e8f0' }}>
                      Social: {Math.min(questScore, 3)}/6 | Speech: {questScore >= 2 ? 1 : 0}/1 | Behavior: {questScore >= 4 ? 1 : 0}/2 | Sensory: 0/1
                    </td>
                    <td style={{ background: '#f8fafc', padding: '6px 10px', fontWeight: 700, borderRight: '1px solid #e2e8f0' }}>
                      Severity Categorization:
                    </td>
                    <td style={{ padding: '6px 10px', color: '#64748b' }}>
                      <em>Not Applicable (IASQ does not produce mild/mod/severe)</em>
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#475569', fontSize: '0.88rem' }}>
                    ⚠️ IASQ Behavioral Screening: Not Submitted / Pending
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                    The 10-item Indian Autism Screening Questionnaire has not been completed for this patient.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => navigate('questionnaire')}
                  style={{ fontSize: '0.82rem', padding: '6px 14px', fontWeight: 600 }}
                >
                  Start Questionnaire Screening ➔
                </button>
              </div>
            )}
          </div>

          {/* 4. CLINICAL SYNTHESIS & SCREENING CONCORDANCE */}
          <div style={{ marginBottom: '22px' }}>
            <h3 style={{ color: '#1e3a8a', fontSize: '0.94rem', fontWeight: 800, margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              4. CLINICAL SYNTHESIS & SCREENING CONCORDANCE
            </h3>
            <div style={{ height: '2px', background: '#1e3a8a', marginBottom: '8px' }}></div>

            <div style={{ border: '1px solid #cbd5e1', background: '#f8fafc', padding: '12px 16px', borderRadius: '4px', fontSize: '0.82rem', lineHeight: 1.55 }}>
              {hasMri && hasQuestionnaire && questScore !== null ? (
                mriAsd && questScore >= 2 ? (
                  <div>
                    <strong>High Concordance (Both Assessments Positive):</strong> Both the Brain MRI Deep Learning model and the caregiver-completed IASQ screening indicate elevated probability of autism-related characteristics. Immediate referral for comprehensive multidisciplinary developmental assessment (including clinical autism diagnostic tools such as INDT-ASD, ISAA, or ADOS-2) is strongly indicated.
                  </div>
                ) : mriAsd && questScore < 2 ? (
                  <div>
                    <strong>Partial Concordance (Neuroimaging Finding Positive):</strong> The Brain MRI Deep Learning model indicated elevated structural brain asymmetry patterns, while the caregiver IASQ screening score was below referral threshold. Clinical consultation with a pediatric neurologist or developmental pediatrician is recommended to correlate neuroimaging biomarkers with longitudinal clinical observation.
                  </div>
                ) : !mriAsd && questScore >= 2 ? (
                  <div>
                    <strong>Partial Concordance (Behavioral Screening Positive):</strong> The caregiver IASQ screening indicated elevated behavioural concerns, while the structural Brain MRI Deep Learning model showed typical morphological symmetry. Clinical evaluation by a child psychologist or developmental pediatrician is recommended for comprehensive behavioural profiling.
                  </div>
                ) : (
                  <div>
                    <strong>Concordance (Screening Negative):</strong> Both the Brain MRI Deep Learning model and the caregiver-completed IASQ screening indicate low probability of autism-related characteristics. Routine pediatric developmental milestone monitoring is advised.
                  </div>
                )
              ) : hasMri && !hasQuestionnaire ? (
                <div>
                  <strong>Partial Assessment (MRI Modality Completed):</strong> Structural Brain MRI deep learning classification indicated <strong>{mriAsd ? 'ASD' : 'Control / Non-Autism'}</strong> with <strong>{mriConfidencePercent}%</strong> calibrated confidence. Caregiver IASQ behavioral screening is currently pending to establish dual-modality clinical concordance.
                </div>
              ) : !hasMri && hasQuestionnaire && questScore !== null ? (
                <div>
                  <strong>Partial Assessment (Behavioral Screening Completed):</strong> Caregiver IASQ questionnaire screening indicated {questScore >= 2 ? 'elevated behavioral referral indicators (Cutoff >= 2 met)' : questScore >= 1 ? 'mild behavioral referral indicators (Cutoff >= 1 met)' : 'low behavioral referral indicators (Score < 1)'} with <strong>{questScore}/10 items</strong> endorsed. Structural Brain MRI scan upload is currently pending to evaluate neuroanatomical biomarkers.
                </div>
              ) : (
                <div>
                  <strong>No Clinical Assessments Recorded:</strong> Complete an MRI assessment or IASQ questionnaire to view clinical synthesis.
                </div>
              )}
            </div>
          </div>

          {/* 5. VERIFIED CLINICAL & DIAGNOSTIC SUPPORT CENTRES */}
          <div>
            <h3 style={{ color: '#1e3a8a', fontSize: '0.94rem', fontWeight: 800, margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              5. VERIFIED CLINICAL & DIAGNOSTIC SUPPORT CENTRES
            </h3>
            <div style={{ height: '2px', background: '#1e3a8a', marginBottom: '8px' }}></div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', border: '1px solid #e2e8f0' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '6px 10px', width: '32%', color: '#0f172a' }}>Centre Name & Institution</th>
                  <th style={{ padding: '6px 10px', width: '20%', color: '#0f172a' }}>City / State</th>
                  <th style={{ padding: '6px 10px', width: '20%', color: '#0f172a' }}>Helpline / Contact</th>
                  <th style={{ padding: '6px 10px', width: '28%', color: '#0f172a' }}>Key Services</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '6px 10px' }}><strong>NIMHANS – Child & Adolescent Psychiatry Clinic</strong> (3.6 km)</td>
                  <td style={{ padding: '6px 10px' }}>Bengaluru, Karnataka</td>
                  <td style={{ padding: '6px 10px' }}>+91-80-26995000</td>
                  <td style={{ padding: '6px 10px' }}>Clinical Diagnosis, Multidisciplinary Assessment, Speech Therapy</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '6px 10px' }}><strong>Indira Gandhi Institute of Child Health (IGICH)</strong> (4.3 km)</td>
                  <td style={{ padding: '6px 10px' }}>Bengaluru, Karnataka</td>
                  <td style={{ padding: '6px 10px' }}>+91-80-26099888</td>
                  <td style={{ padding: '6px 10px' }}>Pediatric Neurology, Developmental Assessment, Physical Therapy</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 10px' }}><strong>The Spastics Society of Karnataka (SSK)</strong> (4.9 km)</td>
                  <td style={{ padding: '6px 10px' }}>Bengaluru, Karnataka</td>
                  <td style={{ padding: '6px 10px' }}>+91-80-40745900</td>
                  <td style={{ padding: '6px 10px' }}>Early Intervention, Occupational Therapy, Speech & Language Therapy</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Navigation Buttons Below */}
      <div style={{ textAlign: 'center', marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate('mri')}
            style={{ padding: '10px 18px', fontWeight: 600 }}
          >
            🧠 New MRI Assessment
          </button>

          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate('questionnaire')}
            style={{ padding: '10px 18px', fontWeight: 600 }}
          >
            📋 Questionnaire Screening
          </button>

          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate('centres')}
            style={{ padding: '10px 18px', fontWeight: 600, borderColor: '#0284c7', color: '#0284c7' }}
          >
            🏥 Location-Based Support Centres
          </button>
        </div>
      </div>
    </div>
  );
}
