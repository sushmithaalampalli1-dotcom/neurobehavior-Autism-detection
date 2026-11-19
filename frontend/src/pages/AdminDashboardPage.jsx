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

      {/* Registered User Accounts & Patient Database Table */}
      <div className="card">
        <div className="card-header" style={{ marginBottom: '14px' }}>
          <div>
            <h3 className="card-title" style={{ fontSize: '1.18rem', margin: 0 }}>
              👥 Registered User Accounts & Patient Database
            </h3>
            <p className="card-subtitle" style={{ margin: '4px 0 0 0' }}>
              Full list of registered patients, guardians, and administrators stored in the system database
            </p>
          </div>
          <span className="badge badge-primary">
            {adminData?.users?.length || 0} Registered Users
          </span>
        </div>

        <div className="table-wrapper">
          <table className="data-table" style={{ width: '100%', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px' }}>ID</th>
                <th style={{ padding: '8px 12px' }}>Patient Name</th>
                <th style={{ padding: '8px 12px' }}>Email Address</th>
                <th style={{ padding: '8px 12px' }}>Role</th>
                <th style={{ padding: '8px 12px' }}>Age / Gender</th>
                <th style={{ padding: '8px 12px' }}>Contact Number</th>
                <th style={{ padding: '8px 12px' }}>Guardian / Caregiver</th>
                <th style={{ padding: '8px 12px' }}>Assessments</th>
              </tr>
            </thead>
            <tbody>
              {(!adminData?.users || adminData.users.length === 0) ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    No registered user accounts found in the database.
                  </td>
                </tr>
              ) : (
                adminData.users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 700, color: '#1e3a8a' }}>
                      #{u.id}
                    </td>
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                      {u.full_name || 'N/A'}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#0369a1' }}>
                      {u.email}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span className={`badge ${u.role === 'admin' ? 'badge-info' : 'badge-success'}`}>
                        {u.role || 'patient'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      {u.age ? `${u.age} yrs` : 'N/A'} / {u.gender || 'N/A'}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      {u.phone_number || 'Not Provided'}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#475569' }}>
                      {u.parent_name ? (
                        <span>
                          <strong>{u.parent_name}</strong>
                          {u.parent_relation ? ` (${u.parent_relation})` : ''}
                          {u.parent_phone ? ` - ${u.parent_phone}` : ''}
                        </span>
                      ) : (
                        'None specified'
                      )}
                    </td>
                    <td style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'center' }}>
                      <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px' }}>
                        {u.assessment_count ?? 0}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
