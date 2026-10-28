import React, { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function AdminDashboardPage() {
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getAdminOverview()
      .then(setAdminData)
      .catch((err) => setError('Could not load admin metrics: ' + err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">System Administration & Engineering Console</h2>
            <p className="card-subtitle">
              Operational parameters, pipeline readiness, and ABIDE data configuration
            </p>
          </div>
          <span className="badge badge-info">Admin Console</span>
        </div>

        {error && <div className="alert alert-warning">{error}</div>}

        {/* Metric Summary Cards */}
        <div className="grid-4" style={{ marginTop: '12px' }}>
          <div style={{ padding: '16px', background: 'var(--slate-100)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--slate-600)' }}>Total Registered Users</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--navy)', marginTop: '4px' }}>
              {adminData?.metrics?.total_users ?? 0}
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--primary)' }}>Patients, Clinicians & Admins</span>
          </div>

          <div style={{ padding: '16px', background: 'var(--slate-100)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--slate-600)' }}>MRI Assessments</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--navy)', marginTop: '4px' }}>
              {adminData?.metrics?.mri_assessments ?? 0}
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--slate-600)' }}>NIfTI Scans Cataloged</span>
          </div>

          <div style={{ padding: '16px', background: 'var(--slate-100)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--slate-600)' }}>Behavioral Intakes</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--navy)', marginTop: '4px' }}>
              {adminData?.metrics?.questionnaire_assessments ?? 0}
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--slate-600)' }}>Logged Screenings</span>
          </div>

          <div style={{ padding: '16px', background: 'var(--slate-100)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--slate-600)' }}>Support Facilities</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--navy)', marginTop: '4px' }}>
              {adminData?.metrics?.registered_centres ?? 0}
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--success-green)' }}>Mapped on OSM</span>
          </div>
        </div>
      </div>

      {/* Subsystems & Services Status */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '16px' }}>Subsystems Operational Verification</h3>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Subsystem Component</th>
                <th>Technology / Engine</th>
                <th>Operational Status</th>
                <th>Engineering Milestone</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Web Application Backend</strong></td>
                <td>Python 3.11 / Flask</td>
                <td><span className="badge badge-success">Online & Healthy</span></td>
                <td>Milestone 1 Completed</td>
              </tr>
              <tr>
                <td><strong>Database Engine</strong></td>
                <td>SQLite via SQLAlchemy ORM</td>
                <td><span className="badge badge-success">Tables Initialized</span></td>
                <td>Milestone 1 Completed</td>
              </tr>
              <tr>
                <td><strong>MRI Volumetric Preprocessor</strong></td>
                <td>NiBabel 5.4.2</td>
                <td><span className="badge badge-success">Active & Verified</span></td>
                <td>Milestone 1 Completed</td>
              </tr>
              <tr>
                <td><strong>Clinical Report Generator</strong></td>
                <td>Python ReportLab 5.1.0</td>
                <td><span className="badge badge-success">Active & Verified</span></td>
                <td>Milestone 1 Completed</td>
              </tr>
              <tr>
                <td><strong>Geographic Support Finder</strong></td>
                <td>Leaflet 1.9.4 + OpenStreetMap</td>
                <td><span className="badge badge-success">Active & Verified</span></td>
                <td>Milestone 1 Completed</td>
              </tr>
              <tr>
                <td><strong>MRI Deep Learning Classifier</strong></td>
                <td>TensorFlow / Keras 3D CNN</td>
                <td><span className="badge badge-standby">Standby (Pre-training)</span></td>
                <td>Milestone 2 (Future)</td>
              </tr>
              <tr>
                <td><strong>Standardized Questionnaire</strong></td>
                <td>Candidate Instruments (AQ-10, M-CHAT)</td>
                <td><span className="badge badge-info">Awaiting Instrument Verification</span></td>
                <td>Milestone 2 (Future)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ABIDE Dataset & Training Protocol Review */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '14px' }}>
          ABIDE I & II Target Configuration Audit
        </h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--slate-600)', marginBottom: '16px' }}>
          Configured parameters for future model training on Autism Brain Imaging Data Exchange:
        </p>

        <div className="grid-2">
          <div style={{ background: 'var(--slate-100)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
            <h5 style={{ fontWeight: 600, color: 'var(--navy)', marginBottom: '8px' }}>
              Target Binary Labels (DX_GROUP)
            </h5>
            <ul style={{ fontSize: '0.86rem', color: 'var(--slate-700)', paddingLeft: '18px', lineHeight: 1.6 }}>
              <li><strong>DX_GROUP = 1:</strong> Autism Spectrum Disorder (ASD) [Binary Target: 1]</li>
              <li><strong>DX_GROUP = 2:</strong> Typical Control (TC) / Non-Autism [Binary Target: 0]</li>
              <li><strong>Loss Function:</strong> Binary Cross-Entropy with Sigmoid activation</li>
            </ul>
          </div>

          <div style={{ background: 'var(--slate-100)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
            <h5 style={{ fontWeight: 600, color: 'var(--navy)', marginBottom: '8px' }}>
              Clinical Severity Policy
            </h5>
            <p style={{ fontSize: '0.84rem', color: 'var(--slate-700)', lineHeight: 1.6 }}>
              Multiclass severity labels (Mild/Moderate/Severe) are <strong>excluded</strong> from automated inference
              until clinically validated ADOS Calibrated Severity Scores (CSS) are harmonized across collection sites.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
