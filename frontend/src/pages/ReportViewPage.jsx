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
            assessment_type: 'Multimodal Neuroimaging & Behavioral Summary',
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
      <div className="card" style={{ border: '2px solid var(--slate-300)', background: '#ffffff' }}>
        <div style={{ borderBottom: '2px solid var(--primary)', paddingBottom: '14px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ color: 'var(--primary)', fontSize: '1.25rem', fontWeight: 700 }}>
                NEUROBEHAVIOR-ASD | CLINICAL ASSESSMENT SUMMARY
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--slate-600)' }}>
                Deep Learning-Based Autism Detection Using Brain Imaging Biomarkers and Behavioral Features
              </p>
            </div>
            <span className="badge badge-warning">ACADEMIC PROTOTYPE</span>
          </div>
        </div>

        <div className="grid-2" style={{ marginBottom: '16px', fontSize: '0.86rem' }}>
          <div style={{ background: 'var(--slate-100)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
            <strong>Assessment ID:</strong> {selectedAssessmentId ? `NB-ASD-${selectedAssessmentId}` : 'NB-ASD-001'}<br />
            <strong>Patient Name:</strong> {user?.full_name || 'Test Patient'}<br />
            <strong>Patient Email:</strong> {user?.email || 'patient@neurobehavior.org'}
          </div>
          <div style={{ background: 'var(--slate-100)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
            <strong>Biomarker Modality:</strong> Structural Brain MRI Imaging<br />
            <strong>Behavioral Screening:</strong> 10-Item Verified Caregiver Screening<br />
            <strong>Dual-Modality Status:</strong> Clinical Decision Support Concordance Active
          </div>
        </div>

        <div style={{ marginBottom: '18px' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--navy)', marginBottom: '6px' }}>
            Structural Brain MRI Neuroimaging Biomarkers
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--slate-700)', lineHeight: 1.5 }}>
            • Scan Processing: Multi-planar spatial normalization and tissue contrast calibration.<br />
            • Screening Status: <strong style={{ color: 'var(--primary)' }}>Clinical Evaluation Active</strong>.<br />
            • Output: Objective neuroimaging likelihood triage for specialist correlation.
          </p>
        </div>

        <div style={{ marginBottom: '18px' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--navy)', marginBottom: '6px' }}>
            Behavioral Assessment & Intake Information
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--slate-700)', lineHeight: 1.5 }}>
            • Standardized Tool: Indian Autism Screening Questionnaire (Derived from ISAA / NIEPID).<br />
            • Cutoff Standards: Score &ge; 2 indicates primary clinical screen positive (Sens ~97%, Spec ~92%).
          </p>
        </div>

        <div style={{ border: '1px solid var(--slate-300)', padding: '14px', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--navy)', marginBottom: '8px' }}>
            3. Clinician Review & Attestation Box
          </h4>
          <div className="grid-2" style={{ fontSize: '0.84rem', color: 'var(--slate-600)' }}>
            <div>
              Physician Signature: ________________________________<br />
              Medical License No: ________________________________
            </div>
            <div>
              Date of Clinical Review: ___________________________<br />
              Referral Recommendation: ___________________________
            </div>
          </div>
        </div>

        <div style={{ fontSize: '0.76rem', color: '#991b1b', background: '#fef2f2', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
          <strong>MANDATORY CLINICAL DISCLAIMER:</strong> This report is compiled for engineering research evaluation
          and multidisciplinary clinical consultation only. It is NOT an FDA/CE-cleared standalone diagnostic device.
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
