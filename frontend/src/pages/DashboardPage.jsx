import React, { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function DashboardPage({ user, navigate }) {
  const [assessmentHistory, setAssessmentHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const history = await api.getUnifiedHistory().catch(() => ({ assessments: [] }));
        setAssessmentHistory(history?.assessments || []);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [user]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Welcome */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--navy)' }}>
            Welcome, {user ? user.full_name : 'Patient User'}
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--slate-600)', marginTop: '2px' }}>
            Portal Access: <span className="badge badge-info">{user?.role === 'admin' ? 'Administrator Portal' : 'Patient Portal'}</span>
            {' • '}
            System Status: <span className="badge badge-success">Clinical Services Active</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary" onClick={() => navigate('mri')}>
            + New MRI Assessment
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('questionnaire')}>
            + IASQ Screening
          </button>
        </div>
      </div>

      {/* Quick Launch Clinical Cards */}
      <div className="grid-4">
        <div className="card" style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }} onClick={() => navigate('mri')}>
          <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>🧠</div>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '4px' }}>Brain MRI Analysis</h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--slate-600)', lineHeight: 1.5 }}>
            Upload brain MRI scans for automated structural biomarker screening.
          </p>
          <div style={{ marginTop: '12px' }}>
            <span className="badge badge-success">Screening Ready</span>
          </div>
        </div>

        <div className="card" style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }} onClick={() => navigate('questionnaire')}>
          <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>📋</div>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '4px' }}>Behavioral Screening</h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--slate-600)', lineHeight: 1.5 }}>
            Complete the standardized 10-item caregiver behavioral assessment.
          </p>
          <div style={{ marginTop: '12px' }}>
            <span className="badge badge-success">Standardized Tool</span>
          </div>
        </div>

        <div className="card" style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }} onClick={() => navigate('centres')}>
          <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>📍</div>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '4px' }}>Support Finder</h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--slate-600)', lineHeight: 1.5 }}>
            Locate accredited pediatric & autism intervention centers near you.
          </p>
          <div style={{ marginTop: '12px' }}>
            <span className="badge badge-success">Verified Clinics</span>
          </div>
        </div>

        <div className="card" style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }} onClick={() => navigate('reports')}>
          <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>📄</div>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '4px' }}>Medical PDF Report</h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--slate-600)', lineHeight: 1.5 }}>
            Download comprehensive clinical summaries for your doctor.
          </p>
          <div style={{ marginTop: '12px' }}>
            <span className="badge badge-info">Doctor Summary</span>
          </div>
        </div>
      </div>

      {/* Clinical Assessment Modules & Activity */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Clinical Assessment Services</h3>
            <p className="card-subtitle">Comprehensive dual-modality screening and multidisciplinary care support</p>
          </div>
          <span className="badge badge-success">Verified Pathways</span>
        </div>

        <div className="grid-3" style={{ marginBottom: '20px' }}>
          <div style={{ padding: '16px', background: 'var(--slate-100)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--slate-600)', textTransform: 'uppercase', fontWeight: 600 }}>
              Modality 1: Neuroimaging
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px', color: 'var(--navy)' }}>
              Brain MRI Biomarkers
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--slate-600)', marginTop: '6px', lineHeight: 1.5 }}>
              Analyzes anatomical brain morphology and cortical tissue metrics to identify subtle developmental indicators.
            </p>
          </div>

          <div style={{ padding: '16px', background: 'var(--slate-100)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--slate-600)', textTransform: 'uppercase', fontWeight: 600 }}>
              Modality 2: Behavioral
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px', color: 'var(--navy)' }}>
              IASQ-1.0 Screening
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--slate-600)', marginTop: '6px', lineHeight: 1.5 }}>
              Standardized caregiver instrument evaluating social communication, eye contact, and behavioral milestones.
            </p>
          </div>

          <div style={{ padding: '16px', background: 'var(--slate-100)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--slate-600)', textTransform: 'uppercase', fontWeight: 600 }}>
              Synthesis & Support
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px', color: 'var(--navy)' }}>
              Dual-Modality Care
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--slate-600)', marginTop: '6px', lineHeight: 1.5 }}>
              Integrates imaging and behavioral findings into an accredited clinical PDF report for pediatric specialists.
            </p>
          </div>
        </div>

        {/* Recent Patient Activity */}
        <div style={{ borderTop: '1px solid var(--slate-200)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ fontSize: '0.98rem', fontWeight: 600, color: 'var(--navy)' }}>
              Recent Patient Assessment Records
            </h4>
            <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={() => navigate('results')}>
              View Full History ({assessmentHistory.length})
            </button>
          </div>

          {loading ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--slate-600)' }}>Loading recent records...</p>
          ) : assessmentHistory.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--slate-600)' }}>
              No assessments recorded yet. Start by uploading an MRI scan or completing the IASQ screening.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {assessmentHistory.slice(0, 3).map((a) => {
                const isMri = a.assessment_type === 'mri';
                const isAsd = a.predicted_dx_group === 1;
                return (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--slate-100)', borderRadius: 'var(--radius-sm)', fontSize: '0.86rem' }}>
                    <div>
                      <strong>Assessment #{a.id}</strong> — <span className={`badge ${isMri ? 'badge-info' : 'badge-warning'}`}>{isMri ? 'Brain MRI' : 'Behavioral Questionnaire'}</span>
                      <span style={{ marginLeft: '12px', color: 'var(--slate-700)', fontWeight: 500 }}>
                        {isMri 
                          ? (isAsd ? 'Autism Profile Detected' : 'Typical Profile')
                          : (a.notes?.includes('Positive') ? 'Screen Positive' : 'Screen Completed')}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.82rem', color: 'var(--slate-500)' }}>
                      {new Date(a.created_at).toLocaleDateString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
