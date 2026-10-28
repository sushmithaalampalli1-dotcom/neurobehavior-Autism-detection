import React from 'react';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-disclaimer">
          <strong>Clinical Advisory & Disclaimer:</strong> NeuroBehavior-ASD is a clinical decision-support and screening portal
          designed to assist licensed pediatricians, child neurologists, and mental health professionals. Automated neuroimaging
          biomarkers and behavioral screening scores provide statistical risk assessment to guide timely intervention.
          They do not replace comprehensive specialist diagnostic evaluations (e.g. ADOS-2, ADI-R).
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <p style={{ fontWeight: 600 }}>NeuroBehavior-ASD | Clinical Decision Support System</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--slate-600)' }}>
              Empowering early detection, evidence-based triage, and multidisciplinary care pathways.
            </p>
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--slate-600)' }}>
            © {new Date().getFullYear()} NeuroBehavior Health. All rights reserved. Confidential Patient Records.
          </div>
        </div>
      </div>
    </footer>
  );
}
