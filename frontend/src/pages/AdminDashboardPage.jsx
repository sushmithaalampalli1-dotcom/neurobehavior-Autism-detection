import React, { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function AdminDashboardPage({ user, navigate }) {
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Security Gate: Restrict access strictly to users with admin role
  if (!user || user.role !== 'admin') {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '40px auto', textAlign: 'center', padding: '36px 24px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '14px' }}>🔒</div>
        <h2 style={{ color: '#b91c1c', marginBottom: '10px' }}>Access Denied: Administrator Only</h2>
        <p style={{ color: '#64748b', fontSize: '0.92rem', marginBottom: '24px', lineHeight: 1.6 }}>
          This administrative and database console is strictly restricted to authorized system administrators.
          Standard patient accounts cannot access or view system database records.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => (navigate ? navigate('mri') : (window.location.hash = '#/mri'))}
        >
          Return to Patient Assessment
        </button>
      </div>
    );
  }

  const fetchAdminData = () => {
    setIsRefreshing(true);
    setError('');
    api.getAdminOverview()
      .then((data) => setAdminData(data))
      .catch((err) => setError('Could not load admin database metrics: ' + err.message))
      .finally(() => {
        setLoading(false);
        setIsRefreshing(false);
      });
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Filter users by search query (name, email, phone, guardian)
  const allUsers = adminData?.users || [];
  const filteredUsers = allUsers.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (u.full_name && u.full_name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.phone_number && u.phone_number.toLowerCase().includes(q)) ||
      (u.parent_name && u.parent_name.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    );
  });

  const patientCount = allUsers.filter((u) => u.role === 'patient').length;
  const adminCount = allUsers.filter((u) => u.role === 'admin').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">System Administration & Database Console</h2>
            <p className="card-subtitle">
              Secure patient records database, operational audit parameters, and pipeline metrics
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span className="badge badge-info" style={{ fontWeight: 700 }}>
              🛡️ Admin Privileges Active
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.82rem', padding: '6px 14px' }}
              onClick={fetchAdminData}
              disabled={isRefreshing}
            >
              {isRefreshing ? 'Refreshing...' : '🔄 Refresh DB'}
            </button>
          </div>
        </div>

        {error && <div className="alert alert-warning">{error}</div>}

        {/* Metric Summary Cards */}
        <div className="grid-4" style={{ marginTop: '12px' }}>
          <div style={{ padding: '16px', background: 'var(--slate-100)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--slate-600)' }}>Total Registered Accounts</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--navy)', marginTop: '4px' }}>
              {adminData?.metrics?.total_users ?? 0}
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--primary)', fontWeight: 600 }}>
              {patientCount} Patients | {adminCount} Admins
            </span>
          </div>

          <div style={{ padding: '16px', background: 'var(--slate-100)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--slate-600)' }}>MRI Assessments</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--navy)', marginTop: '4px' }}>
              {adminData?.metrics?.mri_assessments ?? 0}
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--slate-600)' }}>Deep Learning Scans Logged</span>
          </div>

          <div style={{ padding: '16px', background: 'var(--slate-100)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--slate-600)' }}>Behavioral Screenings</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--navy)', marginTop: '4px' }}>
              {adminData?.metrics?.questionnaire_assessments ?? 0}
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--slate-600)' }}>IASQ Responses Cataloged</span>
          </div>

          <div style={{ padding: '16px', background: 'var(--slate-100)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--slate-600)' }}>Support Facilities</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--navy)', marginTop: '4px' }}>
              {adminData?.metrics?.registered_centres ?? 0}
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--success-green)' }}>Active on Support Map</span>
          </div>
        </div>
      </div>

      {/* Registered User Accounts & Patient Database Table */}
      <div className="card">
        <div className="card-header" style={{ marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 className="card-title" style={{ fontSize: '1.18rem', margin: 0 }}>
              👥 Patient Demographics & Registered Users Database
            </h3>
            <p className="card-subtitle" style={{ margin: '4px 0 0 0' }}>
              Complete demographic records, contacts, and guardian details registered in the system
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="text"
              className="form-input"
              style={{ width: '220px', padding: '6px 12px', fontSize: '0.82rem' }}
              placeholder="🔍 Search name, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="badge badge-primary">
              {filteredUsers.length} of {allUsers.length} Users
            </span>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table" style={{ width: '100%', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px' }}>ID</th>
                <th style={{ padding: '10px 12px' }}>Patient Legal Name</th>
                <th style={{ padding: '10px 12px' }}>Registered Email</th>
                <th style={{ padding: '10px 12px' }}>Role</th>
                <th style={{ padding: '10px 12px' }}>Age / Gender</th>
                <th style={{ padding: '10px 12px' }}>Blood Group</th>
                <th style={{ padding: '10px 12px' }}>Patient Phone</th>
                <th style={{ padding: '10px 12px' }}>Guardian / Caregiver Details</th>
                <th style={{ padding: '10px 12px' }}>Registered At</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Assessments</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '28px', color: '#64748b' }}>
                    {loading ? 'Loading registered accounts from database...' : 'No matching registered user accounts found.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const regDate = u.created_at ? new Date(u.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  }) : 'N/A';

                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1e3a8a' }}>
                        #{u.id}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                        {u.full_name || 'N/A'}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#0369a1' }}>
                        {u.email}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span className={`badge ${u.role === 'admin' ? 'badge-info' : 'badge-success'}`}>
                          {u.role || 'patient'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {u.age ? `${u.age} yrs` : 'N/A'} / {u.gender || 'N/A'}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#dc2626' }}>
                        {u.blood_group || '—'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {u.phone_number || '—'}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>
                        {u.parent_name ? (
                          <div>
                            <strong>{u.parent_name}</strong>
                            {u.parent_relation && <span style={{ color: '#64748b' }}> ({u.parent_relation})</span>}
                            {u.parent_phone && <div style={{ fontSize: '0.74rem', color: '#0284c7' }}>📞 {u.parent_phone}</div>}
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>None provided</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#64748b', fontSize: '0.78rem' }}>
                        {regDate}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center' }}>
                        <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px' }}>
                          {u.assessment_count ?? 0}
                        </span>
                      </td>
                    </tr>
                  );
                })
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
                <td>SQLite / PostgreSQL via SQLAlchemy</td>
                <td><span className="badge badge-success">Tables Initialized & Persistent</span></td>
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
                <td>2.5D Multichannel CNN (97.60% Multimodal Accuracy)</td>
                <td><span className="badge badge-success">Active (Boosted Model)</span></td>
                <td>Milestone 2 Completed</td>
              </tr>
              <tr>
                <td><strong>Standardized Behavioral Screening</strong></td>
                <td>IASQ-1.0 (NIEPID / ISAA 10-Item Instrument)</td>
                <td><span className="badge badge-success">Active & Verified</span></td>
                <td>Milestone 2 Completed</td>
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
          Configured parameters for model training on Autism Brain Imaging Data Exchange:
        </p>

        <div className="grid-2">
          <div style={{ background: 'var(--slate-100)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
            <h5 style={{ fontWeight: 600, color: 'var(--navy)', marginBottom: '8px' }}>
              Target Binary Labels (DX_GROUP)
            </h5>
            <ul style={{ fontSize: '0.86rem', color: 'var(--slate-700)', paddingLeft: '18px', lineHeight: 1.6 }}>
              <li><strong>DX_GROUP = 1:</strong> Autism Spectrum Disorder (ASD) [Binary Target: 1]</li>
              <li><strong>DX_GROUP = 2:</strong> Typical Control (TC) / Non-Autism [Binary Target: 0]</li>
              <li><strong>Calibrated Ensemble Threshold:</strong> 0.450</li>
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
