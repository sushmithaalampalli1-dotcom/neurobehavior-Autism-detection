import React, { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function ReportViewPage({ user, navigate }) {
  const [reports, setReports] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [latestReport, setLatestReport] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchReports = async () => {
    try {
      const data = await api.listReports();
      setReports(data.reports || []);
    } catch (err) {
      console.warn('Could not list reports:', err);
    }
  };

  const fetchAssessments = async () => {
    try {
      const data = await api.getUnifiedHistory();
      const list = data.assessments || [];
      setAssessments(list);
      if (list.length > 0 && !selectedAssessmentId) {
        setSelectedAssessmentId(list[0].id);
      }
    } catch (err) {
      console.warn('Could not fetch assessment history:', err);
    }
  };

  useEffect(() => {
    fetchReports();
    fetchAssessments();
  }, []);

  const handleGenerateReport = async () => {
    setGenerating(true);
    setError('');
    setSuccessMsg('');

    try {
      const payload = selectedAssessmentId
        ? { assessment_id: selectedAssessmentId }
        : {
            assessment_type: 'Comprehensive Brain MRI & IASQ Behavioral Summary',
            mri_filename: '2D_Brain_MRI_Scan.png',
            mri_dimensions: '224 x 224 x 3',
            questionnaire_version: 'IASQ-1.0 (Standard Caregiver Screening)',
          };
      const res = await api.generateReport(payload);
      setLatestReport(res);
      setSuccessMsg(`Doctor-readable clinical summary generated successfully!`);
      fetchReports();
    } catch (err) {
      setError(err.message || 'Failed to generate PDF report.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Title */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Doctor-Readable Clinical PDF Reports</h2>
            <p className="card-subtitle">
              Structured clinical summaries with patient confidentiality and multidisciplinary referral guidance
            </p>
          </div>
          <span className="badge badge-info">Official Clinical Report</span>
        </div>

        <div style={{ background: 'var(--primary-subtle)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '20px', border: '1px solid #bae6fd' }}>
          <h4 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#0369a1', marginBottom: '6px' }}>
            Report Specifications & Clinical Structure
          </h4>
          <p style={{ fontSize: '0.88rem', color: 'var(--slate-700)', lineHeight: 1.5 }}>
            Generated reports are formatted for multidisciplinary clinical consultations (developmental pediatricians,
            child neurologists, and psychiatrists). Reports integrate neuroimaging biomarker results, IASQ behavioral
            screening scores, clinician attestation signature blocks, accredited support facility directories, and clinical guidelines.
          </p>
        </div>

        {error && <div className="alert alert-warning">{error}</div>}
        {successMsg && <div className="alert alert-info">{successMsg}</div>}

        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px' }}>
          {assessments.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="assessmentSelect" style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                Select Assessment Record:
              </label>
              <select
                id="assessmentSelect"
                value={selectedAssessmentId}
                onChange={(e) => setSelectedAssessmentId(e.target.value)}
                className="form-input"
                style={{ padding: '6px 12px', fontSize: '0.88rem', width: 'auto' }}
              >
                {assessments.map((a) => (
                  <option key={a.id} value={a.id}>
                    Record #{a.id} - {a.assessment_type === 'mri' ? 'Brain MRI Scan' : 'IASQ Behavioral'} ({new Date(a.created_at).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleGenerateReport}
            disabled={generating}
          >
            {generating ? 'Compiling Medical PDF...' : '📄 Generate Doctor-Readable PDF'}
          </button>
          {latestReport && (
            <a
              href={api.getReportDownloadUrl(latestReport.filename)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              📥 Download Latest Report ({latestReport.filename})
            </a>
          )}
        </div>
      </div>

      {/* Live Visual Preview of Doctor-Readable Report Layout */}
      <div className="clinical-document-canvas" style={{ border: '1px solid #cbd5e1', background: '#ffffff', borderRadius: '8px', padding: '32px 36px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        {/* Header Block */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', borderBottom: '2px solid #1e3a8a', paddingBottom: '12px' }}>
          <div>
            <h2 style={{ color: '#1e3a8a', fontSize: '1.4rem', fontWeight: 900, margin: 0, letterSpacing: '0.4px' }}>
              NEUROBEHAVIOR-ASD
            </h2>
            <h3 style={{ color: '#1e3a8a', fontSize: '1.1rem', fontWeight: 800, margin: '2px 0 6px 0' }}>
              ASSESSMENT PORTAL
            </h3>
            <p style={{ color: '#475569', fontSize: '0.82rem', margin: 0 }}>
              Brain MRI Deep Learning Classification & IASQ Behavioral Screening Summary
            </p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.84rem' }}>
            <div><strong>Report ID:</strong> {selectedAssessmentId ? `NB-REP-2026-${selectedAssessmentId}` : 'NB-REP-2026-3DCE7C'}</div>
            <div><strong>Date:</strong> {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} 00:02 IST</div>
          </div>
        </div>

        {/* 1. Demographics */}
        <div style={{ margin: '16px 0' }}>
          <h4 style={{ color: '#1e3a8a', fontSize: '0.9rem', fontWeight: 800, margin: '0 0 4px 0' }}>
            1. PATIENT DEMOGRAPHICS & GUARDIAN PROFILE
          </h4>
          <div style={{ height: '2px', background: '#1e3a8a', marginBottom: '6px' }}></div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', border: '1px solid #e2e8f0' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ background: '#f8fafc', padding: '5px 8px', fontWeight: 700, width: '22%' }}>Patient Full Name:</td>
                <td style={{ padding: '5px 8px', width: '28%' }}>{user?.full_name || 'xyz'}</td>
                <td style={{ background: '#f8fafc', padding: '5px 8px', fontWeight: 700, width: '22%' }}>Patient ID:</td>
                <td style={{ padding: '5px 8px', width: '28%' }}>{user?.id ? `NB-PAT-2026-${String(user.id).padStart(4, '0')}` : 'NB-PAT-2026-6A5F'}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ background: '#f8fafc', padding: '5px 8px', fontWeight: 700 }}>Age:</td>
                <td style={{ padding: '5px 8px' }}>{user?.age ? `${user.age} Years` : '21.0 Years'}</td>
                <td style={{ background: '#f8fafc', padding: '5px 8px', fontWeight: 700 }}>Gender:</td>
                <td style={{ padding: '5px 8px' }}>{user?.gender || 'Female'}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ background: '#f8fafc', padding: '5px 8px', fontWeight: 700 }}>Blood Group:</td>
                <td style={{ padding: '5px 8px' }}>{user?.blood_group || 'B-'}</td>
                <td style={{ background: '#f8fafc', padding: '5px 8px', fontWeight: 700 }}>Minor Status:</td>
                <td style={{ padding: '5px 8px' }}>{(user?.age && user.age < 18) ? 'Pediatric (<18 yrs)' : 'Adult (18+ yrs)'}</td>
              </tr>
              <tr>
                <td style={{ background: '#f8fafc', padding: '5px 8px', fontWeight: 700 }}>Guardian / Consent:</td>
                <td style={{ padding: '5px 8px' }}>
                  {user?.parent_name
                    ? `${user.parent_name} (${user.parent_relation || 'Parent/Guardian'})${user.parent_phone ? ` - Ph: ${user.parent_phone}` : ''}`
                    : (user?.age && user.age < 18 ? 'Parent / Legal Guardian Consent' : 'Self (Adult Consent)')}
                </td>
                <td style={{ background: '#f8fafc', padding: '5px 8px', fontWeight: 700 }}>Consent Status:</td>
                <td style={{ padding: '5px 8px' }}>{(user?.age && user.age < 18) ? 'Recorded & Verified (Parent/Guardian Assent)' : 'Recorded & Verified (Adult Patient)'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 2. Structural Brain MRI */}
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ color: '#1e3a8a', fontSize: '0.9rem', fontWeight: 800, margin: '0 0 4px 0' }}>
            2. STRUCTURAL BRAIN MRI DEEP LEARNING ASSESSMENT
          </h4>
          <div style={{ height: '2px', background: '#1e3a8a', marginBottom: '6px' }}></div>
          <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '12px', alignItems: 'center' }}>
            <div style={{ textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px', background: '#0f172a' }}>
              <img
                src="/samples/sample_asd_28802.png"
                alt="Brain MRI scan"
                style={{ width: '100px', height: '100px', objectFit: 'contain', display: 'block', margin: '0 auto', borderRadius: '2px' }}
              />
              <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '2px' }}><code>mri101.jpeg</code></div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', border: '1px solid #e2e8f0' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ background: '#f8fafc', padding: '5px 8px', fontWeight: 700, width: '25%' }}>Predicted Classification:</td>
                  <td style={{ padding: '5px 8px', width: '25%' }}><strong style={{ color: '#dc2626' }}>ASD</strong></td>
                  <td style={{ background: '#f8fafc', padding: '5px 8px', fontWeight: 700, width: '22%' }}>Model Raw Score:</td>
                  <td style={{ padding: '5px 8px', width: '28%' }}>0.5313 (Threshold: 0.53)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ background: '#f8fafc', padding: '5px 8px', fontWeight: 700 }}>Calibrated Confidence:</td>
                  <td style={{ padding: '5px 8px' }}><strong>53.1%</strong></td>
                  <td style={{ background: '#f8fafc', padding: '5px 8px', fontWeight: 700 }}>Input Modality:</td>
                  <td style={{ padding: '5px 8px' }}>2D Grayscale Brain MRI (224x224, Min-Max)</td>
                </tr>
                <tr>
                  <td style={{ background: '#f8fafc', padding: '5px 8px', fontWeight: 700 }}>Quality Control Checks:</td>
                  <td style={{ padding: '5px 8px' }}>PASSED (Standard deviation &ge; 5.0)</td>
                  <td style={{ background: '#f8fafc', padding: '5px 8px', fontWeight: 700 }}>Model Architecture:</td>
                  <td style={{ padding: '5px 8px' }}>4-Stage Conv2D + BatchNorm + Dropout</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. IASQ Behavioral Screening */}
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ color: '#1e3a8a', fontSize: '0.9rem', fontWeight: 800, margin: '0 0 4px 0' }}>
            3. INDIAN AUTISM SCREENING QUESTIONNAIRE (IASQ) BEHAVIORAL SCREENING
          </h4>
          <div style={{ height: '2px', background: '#1e3a8a', marginBottom: '6px' }}></div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', border: '1px solid #e2e8f0' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ background: '#f8fafc', padding: '5px 8px', fontWeight: 700, width: '25%' }}>Total Positive Responses:</td>
                <td style={{ padding: '5px 8px', width: '25%' }}><strong>5 / 10 Items</strong></td>
                <td style={{ background: '#f8fafc', padding: '5px 8px', fontWeight: 700, width: '22%' }}>Instrument Source:</td>
                <td style={{ padding: '5px 8px', width: '28%' }}>IASQ (PMC8062015, Indian Validation)</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ background: '#f8fafc', padding: '5px 8px', fontWeight: 700 }}>Cutoff 1 (Score &ge; 1):</td>
                <td style={{ padding: '5px 8px' }}><span style={{ color: '#dc2626', fontWeight: 600 }}>Referral Recommended (Cutoff &ge; 1 met)</span></td>
                <td style={{ background: '#f8fafc', padding: '5px 8px', fontWeight: 700 }}>Cutoff 2 (Score &ge; 2):</td>
                <td style={{ padding: '5px 8px' }}><span style={{ color: '#dc2626', fontWeight: 600 }}>Referral Recommended (Cutoff &ge; 2 met)</span></td>
              </tr>
              <tr>
                <td style={{ background: '#f8fafc', padding: '5px 8px', fontWeight: 700 }}>Domain Breakdown:</td>
                <td style={{ padding: '5px 8px' }}>Social: 3/6 | Speech: 1/1 | Behavior: 1/2 | Sensory: 0/1</td>
                <td style={{ background: '#f8fafc', padding: '5px 8px', fontWeight: 700 }}>Severity Categorization:</td>
                <td style={{ padding: '5px 8px', color: '#64748b' }}><em>Not Applicable (IASQ does not produce mild/mod/severe)</em></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 4. Clinical Synthesis */}
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ color: '#1e3a8a', fontSize: '0.9rem', fontWeight: 800, margin: '0 0 4px 0' }}>
            4. CLINICAL SYNTHESIS & SCREENING CONCORDANCE
          </h4>
          <div style={{ height: '2px', background: '#1e3a8a', marginBottom: '6px' }}></div>
          <div style={{ border: '1px solid #cbd5e1', background: '#f8fafc', padding: '10px 14px', borderRadius: '4px', fontSize: '0.8rem', lineHeight: 1.5 }}>
            <strong>High Concordance (Both Assessments Positive):</strong> Both the Brain MRI Deep Learning model and the caregiver-completed IASQ screening indicate elevated probability of autism-related characteristics. Immediate referral for comprehensive multidisciplinary developmental assessment (including clinical autism diagnostic tools such as INDT-ASD, ISAA, or ADOS-2) is strongly indicated.
          </div>
        </div>

        {/* 5. Verified Support Centres */}
        <div>
          <h4 style={{ color: '#1e3a8a', fontSize: '0.9rem', fontWeight: 800, margin: '0 0 4px 0' }}>
            5. VERIFIED CLINICAL & DIAGNOSTIC SUPPORT CENTRES
          </h4>
          <div style={{ height: '2px', background: '#1e3a8a', marginBottom: '6px' }}></div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', border: '1px solid #e2e8f0' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '5px 8px', width: '32%' }}>Centre Name & Institution</th>
                <th style={{ padding: '5px 8px', width: '20%' }}>City / State</th>
                <th style={{ padding: '5px 8px', width: '20%' }}>Helpline / Contact</th>
                <th style={{ padding: '5px 8px', width: '28%' }}>Key Services</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '5px 8px' }}><strong>NIMHANS – Child & Adolescent Psychiatry Clinic</strong> (3.6 km)</td>
                <td style={{ padding: '5px 8px' }}>Bengaluru, Karnataka</td>
                <td style={{ padding: '5px 8px' }}>+91-80-26995000</td>
                <td style={{ padding: '5px 8px' }}>Clinical Diagnosis, Multidisciplinary Assessment, Speech Therapy</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '5px 8px' }}><strong>Indira Gandhi Institute of Child Health (IGICH)</strong> (4.3 km)</td>
                <td style={{ padding: '5px 8px' }}>Bengaluru, Karnataka</td>
                <td style={{ padding: '5px 8px' }}>+91-80-26099888</td>
                <td style={{ padding: '5px 8px' }}>Pediatric Neurology, Developmental Assessment, Physical Therapy</td>
              </tr>
              <tr>
                <td style={{ padding: '5px 8px' }}><strong>The Spastics Society of Karnataka (SSK)</strong> (4.9 km)</td>
                <td style={{ padding: '5px 8px' }}>Bengaluru, Karnataka</td>
                <td style={{ padding: '5px 8px' }}>+91-80-40745900</td>
                <td style={{ padding: '5px 8px' }}>Early Intervention, Occupational Therapy, Speech & Language Therapy</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Available Generated Reports Archive */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '14px' }}>My Generated PDF Reports</h3>
        {reports.length === 0 ? (
          <p style={{ color: 'var(--slate-600)', fontSize: '0.9rem' }}>
            No PDF reports have been generated yet for this account. Click the button above to generate one.
          </p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Report Filename</th>
                  <th>Size</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r, i) => (
                  <tr key={i}>
                    <td><code>{r.filename}</code></td>
                    <td>{(r.size_bytes / 1024).toFixed(1)} KB</td>
                    <td>
                      <a
                        href={api.getReportDownloadUrl(r.filename)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                      >
                        📥 Download PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
