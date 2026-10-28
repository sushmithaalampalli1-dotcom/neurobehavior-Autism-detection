import React from 'react';

export default function LandingPage({ navigate }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Hero Section */}
      <section className="card" style={{ 
        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', 
        color: '#ffffff',
        padding: '52px 40px',
        border: 'none',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-md)'
      }}>
        <div style={{ maxWidth: '800px' }}>
          <span style={{ 
            background: 'rgba(255, 255, 255, 0.2)', 
            padding: '6px 14px', 
            borderRadius: 'var(--radius-full)', 
            fontSize: '0.82rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Clinical Decision Support System
          </span>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 700, margin: '16px 0 12px', lineHeight: 1.25 }}>
            NeuroBehavior-ASD
          </h2>
          <p style={{ fontSize: '1.15rem', opacity: 0.95, lineHeight: 1.55, marginBottom: '28px' }}>
            Advanced Autism Screening Using Brain Imaging Biomarkers and Behavioral Features
            with Personalized Support & Referral System.
          </p>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <button 
              className="btn" 
              style={{ background: '#ffffff', color: '#0369a1', fontWeight: 600, padding: '12px 22px' }}
              onClick={() => navigate('mri')}
            >
              🧠 Start MRI Assessment
            </button>
            <button 
              className="btn" 
              style={{ background: 'rgba(255, 255, 255, 0.15)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.4)', padding: '12px 22px' }}
              onClick={() => navigate('questionnaire')}
            >
              📋 Start Behavioral Intake
            </button>
            <button 
              className="btn" 
              style={{ background: 'transparent', color: '#ffffff', textDecoration: 'underline', padding: '12px 18px' }}
              onClick={() => navigate('centres')}
            >
              📍 Find Support Centres
            </button>
          </div>
        </div>
      </section>

      {/* Core Clinical Pillars */}
      <section>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--navy)' }}>
            Integrated Dual-Modality Care Architecture
          </h3>
          <p style={{ color: 'var(--slate-600)', fontSize: '0.95rem' }}>
            Combining objective brain neuroimaging biomarkers, clinical caregiver screening, and direct accredited clinic referrals.
          </p>
        </div>

        <div className="grid-3">
          <div className="card">
            <div style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: 'var(--radius-md)', 
              background: 'var(--primary-light)', 
              color: 'var(--primary-dark)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontSize: '1.4rem',
              marginBottom: '16px'
            }}>
              🧠
            </div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px' }}>
              Structural Brain Biomarkers
            </h4>
            <p style={{ fontSize: '0.88rem', color: 'var(--slate-600)', marginBottom: '14px', lineHeight: 1.55 }}>
              Analyzes anatomical brain scans to detect tissue morphology and structural variations associated with autism spectrum indicators.
            </p>
            <span className="badge badge-success">Automated Biomarker Screening</span>
          </div>

          <div className="card">
            <div style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: 'var(--radius-md)', 
              background: 'var(--accent-teal-light)', 
              color: 'var(--accent-teal)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontSize: '1.4rem',
              marginBottom: '16px'
            }}>
              📋
            </div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px' }}>
              Standardized Behavioral Intake
            </h4>
            <p style={{ fontSize: '0.88rem', color: 'var(--slate-600)', marginBottom: '14px', lineHeight: 1.55 }}>
              Validated 10-item caregiver screening tool evaluating social communication, reciprocal interaction, and early developmental milestones.
            </p>
            <span className="badge badge-info">Standardized Assessment</span>
          </div>

          <div className="card">
            <div style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: 'var(--radius-md)', 
              background: '#fef3c7', 
              color: '#92400e', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontSize: '1.4rem',
              marginBottom: '16px'
            }}>
              📍
            </div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px' }}>
              Personalized Support System
            </h4>
            <p style={{ fontSize: '0.88rem', color: 'var(--slate-600)', marginBottom: '14px', lineHeight: 1.55 }}>
              Proximity locator connecting families and patients directly to accredited developmental pediatric centers and apex institutes.
            </p>
            <span className="badge badge-success">Accredited Clinics</span>
          </div>
        </div>
      </section>

      {/* Clinical Disclaimer & Guidelines */}
      <section className="alert alert-clinical">
        <h4 style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--navy)' }}>
          Clinical Decision Support Guidelines
        </h4>
        <p style={{ fontSize: '0.88rem', lineHeight: 1.55, margin: 0 }}>
          NeuroBehavior-ASD is an exploratory decision-support system designed to assist healthcare professionals in early identification.
          All imaging biomarkers and screening questionnaires are intended to inform and prioritize specialist diagnostic evaluations
          by certified developmental pediatricians, child neurologists, or clinical psychologists.
        </p>
      </section>
    </div>
  );
}
