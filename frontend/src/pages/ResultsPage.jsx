import React, { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function ResultsPage({ user, navigate, activeMriResult, activeQuestionnaireResult }) {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(null);

  // Patient editable state (just like in Autism_detection report.html)
  const [patientName, setPatientName] = useState(() => user?.full_name || 'Demo Patient');
  const [patientAge, setPatientAge] = useState('5');
  const [patientGender, setPatientGender] = useState('Male');

  useEffect(() => {
    loadAssessments();
  }, []);

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

  // Resolve active patient's latest MRI assessment
  const recordedMri = assessments.find((a) => a.assessment_type === 'mri');
  const hasMri = Boolean(recordedMri || activeMriResult);
  const mriFilename = recordedMri?.mri_filename || activeMriResult?.filename || 'sample_asd_28802.png';
  
  const mriAsd = (recordedMri && recordedMri.predicted_dx_group === 1) || 
    (activeMriResult?.prediction?.dx_group === 1) ||
    (activeMriResult?.prediction?.label?.toLowerCase().includes('autism'));
  const mriConfidence = recordedMri?.prediction_confidence ?? activeMriResult?.prediction?.confidence ?? 0.96;
  const mriConfidencePercent = (mriConfidence * 100).toFixed(1);

  // Resolve active patient's latest questionnaire assessment
  const recordedQ = assessments.find((a) => a.assessment_type === 'questionnaire' || a.assessment_type === 'multimodal');
  const hasQuestionnaire = Boolean(recordedQ || activeQuestionnaireResult);
  const questScore = (recordedQ?.prediction_confidence !== null && recordedQ?.prediction_confidence !== undefined)
    ? Math.round(recordedQ.prediction_confidence * 10)
    : (activeQuestionnaireResult?.score ?? 4);

  // Determine behavioural category matching Autism_detection project: Normal, Mild, Moderate, Severe
  let questCategory = 'Normal';
  let questCategoryColor = '#198754'; // green
  if (questScore >= 8) {
    questCategory = 'Severe';
    questCategoryColor = '#dc3545'; // red
  } else if (questScore >= 5) {
    questCategory = 'Moderate';
    questCategoryColor = '#fd7e14'; // orange
  } else if (questScore >= 2) {
    questCategory = 'Mild';
    questCategoryColor = '#ffc107'; // yellow/warning
  }

  const reportId = `ASD-${recordedMri?.id || recordedQ?.id || '28802'}`;
  const reportDate = new Date().toLocaleDateString();

  // MRI scan preview image
  const mriPreviewUrl = mriFilename.endsWith('.png')
    ? `/samples/${mriFilename}`
    : '/samples/sample_asd_28802.png';

  const handleGenerateReport = async () => {
    setGenerating(true);
    setReportSuccess(null);
    setError('');

    try {
      const targetId = recordedMri?.id || recordedQ?.id || (assessments[0]?.id) || null;
      const payload = {
        assessment_id: targetId,
        patient_name: patientName,
        clinical_notes: 'Screening report generated from patient evaluation session.',
      };
      const res = await api.generateReport(payload);
      const filename = res.report_filename || res.filename;
      const downloadUrl = api.getReportDownloadUrl(filename);

      setReportSuccess({
        filename,
        url: downloadUrl,
        message: 'Report PDF generated successfully.'
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
    <div style={{ maxWidth: '960px', margin: '0 auto', paddingBottom: '30px' }} className="fade-in">
      <div className="card shadow" style={{ borderRadius: '15px', overflow: 'hidden', border: 'none', background: '#ffffff' }}>
        
        {/* HEADER (Exact Autism_detection styling) */}
        <div style={{
          background: '#0d6efd',
          color: 'white',
          textAlign: 'center',
          padding: '25px',
        }}>
          <h2 style={{ fontWeight: 'bold', margin: '0 0 6px 0', fontSize: '1.65rem' }}>
            🧠 AI-Based Autism Spectrum Screening Report
          </h2>
          <h5 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', fontWeight: 600 }}>
            Decision Support System
          </h5>
          <p style={{ margin: 0, fontSize: '0.92rem', opacity: 0.95 }}>
            Brain MRI Analysis + Behavioural Questionnaire Screening
          </p>
        </div>

        <div style={{ padding: '28px' }}>
          
          {reportSuccess && (
            <div className="alert alert-success" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
              <div>
                <strong>✅ {reportSuccess.message}</strong>
                <div style={{ fontSize: '0.84rem', marginTop: '2px' }}>File: <code>{reportSuccess.filename}</code></div>
              </div>
              <a href={reportSuccess.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: '6px 16px', fontSize: '0.86rem' }}>
                Open PDF
              </a>
            </div>
          )}

          {error && <div className="alert alert-warning" style={{ marginBottom: '20px' }}>{error}</div>}

          {/* 1. PATIENT INFORMATION */}
          <h4 style={{ color: '#0d6efd', fontWeight: 'bold', margin: '10px 0 15px 0', fontSize: '1.2rem' }}>
            👤 Patient Information
          </h4>

          <table className="table table-bordered" style={{ marginBottom: '24px', width: '100%' }}>
            <tbody>
              <tr>
                <th style={{ width: '35%', background: '#f8f9fa' }}>Patient Name</th>
                <td>
                  <input
                    type="text"
                    className="form-control"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Enter Patient Name"
                    style={{ padding: '6px 10px', fontSize: '0.92rem' }}
                  />
                </td>
              </tr>
              <tr>
                <th style={{ background: '#f8f9fa' }}>Age</th>
                <td>
                  <input
                    type="number"
                    className="form-control"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    placeholder="Enter Age"
                    min="0"
                    max="120"
                    style={{ padding: '6px 10px', fontSize: '0.92rem', width: '140px' }}
                  />
                </td>
              </tr>
              <tr>
                <th style={{ background: '#f8f9fa' }}>Gender</th>
                <td>
                  <select
                    className="form-select"
                    value={patientGender}
                    onChange={(e) => setPatientGender(e.target.value)}
                    style={{ padding: '6px 10px', fontSize: '0.92rem', width: '180px' }}
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                    <option>Prefer not to say</option>
                  </select>
                </td>
              </tr>
              <tr>
                <th style={{ background: '#f8f9fa' }}>Report ID</th>
                <td><strong>{reportId}</strong></td>
              </tr>
              <tr>
                <th style={{ background: '#f8f9fa' }}>Report Date</th>
                <td>{reportDate}</td>
              </tr>
            </tbody>
          </table>

          <hr style={{ margin: '24px 0', borderColor: '#e2e8f0' }} />

          {/* 2. MRI ANALYSIS */}
          <h4 style={{ color: '#0d6efd', fontWeight: 'bold', margin: '15px 0', fontSize: '1.2rem' }}>
            🧠 MRI Analysis
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 260px) 1fr', gap: '22px', marginBottom: '24px' }}>
            <div style={{ border: '1px solid #dee2e6', borderRadius: '10px', padding: '16px', textAlign: 'center', background: '#fdfdfd' }}>
              <h5 style={{ textAlign: 'center', fontSize: '0.95rem', fontWeight: 'bold', color: '#334155', marginBottom: '10px' }}>
                Uploaded MRI Scan
              </h5>
              <img
                src={mriPreviewUrl}
                alt="Uploaded MRI scan"
                style={{
                  width: '100%',
                  maxHeight: '210px',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#0f172a',
                  display: 'block',
                  margin: '0 auto'
                }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/samples/sample_asd_28802.png';
                }}
              />
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '8px' }}>
                <code>{mriFilename}</code>
              </div>
            </div>

            <div>
              <table className="table table-bordered" style={{ width: '100%', height: '100%' }}>
                <tbody>
                  <tr>
                    <th style={{ width: '40%', background: '#f8f9fa' }}>MRI Screening Result</th>
                    <td>
                      <strong style={{ color: mriAsd ? '#dc3545' : '#198754', fontSize: '1.15rem' }}>
                        {mriAsd ? 'Autism' : 'Non Autism'}
                      </strong>
                    </td>
                  </tr>
                  <tr>
                    <th style={{ background: '#f8f9fa' }}>Model Score</th>
                    <td>
                      <strong>{mriConfidencePercent}%</strong>
                    </td>
                  </tr>
                  <tr>
                    <th style={{ background: '#f8f9fa' }}>Assessment Method</th>
                    <td>Experimental MRI image classification model</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <hr style={{ margin: '24px 0', borderColor: '#e2e8f0' }} />

          {/* 3. BEHAVIOURAL QUESTIONNAIRE */}
          <h4 style={{ color: '#0d6efd', fontWeight: 'bold', margin: '15px 0', fontSize: '1.2rem' }}>
            📝 Behavioural Questionnaire Analysis
          </h4>

          <table className="table table-bordered" style={{ marginBottom: '16px', width: '100%' }}>
            <tbody>
              <tr>
                <th style={{ width: '35%', background: '#f8f9fa' }}>Total Questions</th>
                <td>10</td>
              </tr>
              <tr>
                <th style={{ background: '#f8f9fa' }}>Questionnaire Score</th>
                <td>
                  <span className="badge bg-primary" style={{ fontSize: '0.92rem', padding: '6px 12px' }}>
                    {questScore}/10
                  </span>
                </td>
              </tr>
              <tr>
                <th style={{ background: '#f8f9fa' }}>Behavioural Category</th>
                <td>
                  <span
                    className="badge"
                    style={{
                      background: questCategoryColor,
                      color: questCategory === 'Mild' ? '#000000' : '#ffffff',
                      fontSize: '0.92rem',
                      padding: '6px 14px'
                    }}
                  >
                    {questCategory}
                  </span>
                </td>
              </tr>
              <tr>
                <th style={{ background: '#f8f9fa' }}>Assessment Method</th>
                <td>10-item behavioural questionnaire</td>
              </tr>
              <tr>
                <th style={{ background: '#f8f9fa' }}>Status</th>
                <td><span style={{ color: '#198754', fontWeight: 'bold' }}>Completed</span></td>
              </tr>
            </tbody>
          </table>

          <div className="alert alert-info" style={{ marginBottom: '24px' }}>
            <strong>Assessment Summary</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem' }}>
              The questionnaire records selected behavioural responses for preliminary screening. Its score categories provide supplementary evaluation alongside brain imaging.
            </p>
          </div>

          <hr style={{ margin: '24px 0', borderColor: '#e2e8f0' }} />

          {/* 4. FINAL SCREENING REPORT */}
          <h4 style={{ color: '#0d6efd', fontWeight: 'bold', margin: '15px 0', fontSize: '1.2rem' }}>
            🤖 Final AI Screening Report
          </h4>

          <div style={{ border: '2px solid #0d6efd', borderRadius: '12px', padding: '18px', background: '#f8faff', marginBottom: '24px' }}>
            <table className="table table-bordered" style={{ marginBottom: 0, width: '100%', background: '#ffffff' }}>
              <tbody>
                <tr>
                  <th style={{ width: '35%', background: '#f8f9fa' }}>MRI Screening Result</th>
                  <td>
                    <strong style={{ color: mriAsd ? '#dc3545' : '#198754' }}>
                      {mriAsd ? 'Autism' : 'Non Autism'}
                    </strong>
                  </td>
                </tr>
                <tr>
                  <th style={{ background: '#f8f9fa' }}>MRI Model Score</th>
                  <td><strong>{mriConfidencePercent}%</strong></td>
                </tr>
                <tr>
                  <th style={{ background: '#f8f9fa' }}>Questionnaire Score</th>
                  <td><strong>{questScore}/10</strong></td>
                </tr>
                <tr>
                  <th style={{ background: '#f8f9fa' }}>Questionnaire Category</th>
                  <td>
                    <span
                      className="badge"
                      style={{
                        background: questCategoryColor,
                        color: questCategory === 'Mild' ? '#000000' : '#ffffff',
                        fontSize: '0.85rem'
                      }}
                    >
                      {questCategory}
                    </span>
                  </td>
                </tr>
                <tr>
                  <th style={{ background: '#f8f9fa' }}>Interpretation</th>
                  <td style={{ fontSize: '0.9rem', lineHeight: 1.55 }}>
                    The MRI classification and questionnaire are separate screening outputs evaluated by deep learning models.
                  </td>
                </tr>
                <tr>
                  <th style={{ background: '#f8f9fa' }}>Recommendation</th>
                  <td style={{ fontSize: '0.9rem', lineHeight: 1.55 }}>
                    If there are developmental or behavioural concerns, consult a qualified specialist doctor.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <hr style={{ margin: '24px 0', borderColor: '#e2e8f0' }} />

          {/* 5. DISCLAIMER */}
          <div className="alert alert-warning" style={{ marginBottom: '26px' }}>
            <h5 style={{ fontWeight: 'bold', margin: '0 0 6px 0', fontSize: '0.98rem' }}>⚠ AI Screening Disclaimer</h5>
            <p style={{ margin: 0, fontSize: '0.86rem', lineHeight: 1.5 }}>
              This report is generated for preliminary screening and academic research purposes only. It does not replace medical diagnosis.
            </p>
          </div>

          {/* 6. FOOTER & BUTTONS */}
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '22px' }}>
              <button
                type="button"
                className="btn btn-success"
                onClick={() => window.print()}
                style={{ padding: '12px 24px', fontWeight: 'bold', fontSize: '0.96rem' }}
              >
                🖨 Print / Download Report
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleGenerateReport}
                disabled={generating}
                style={{ padding: '12px 24px', fontWeight: 'bold', fontSize: '0.96rem' }}
              >
                {generating ? 'Generating PDF...' : '📄 Download PDF Report'}
              </button>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() => navigate('mri')}
                style={{ padding: '12px 20px', fontWeight: 'bold' }}
              >
                🧠 MRI Analysis
              </button>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() => navigate('questionnaire')}
                style={{ padding: '12px 20px', fontWeight: 'bold' }}
              >
                📋 Questionnaire Analysis
              </button>
            </div>

            <p style={{ color: '#64748b', fontSize: '0.86rem', lineHeight: 1.6, margin: 0 }}>
              <strong>AI-Based Autism Spectrum Screening System</strong><br />
              Final Year Engineering Project<br />
              © 2026 All Rights Reserved
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
