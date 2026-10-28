import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';

export default function MriAssessmentPage({ user, navigate, activeMriResult, onMriCompleted }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(() => activeMriResult || null);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (activeMriResult && !uploadResult) {
      setUploadResult(activeMriResult);
    }
  }, [activeMriResult]);

  const handleFile = (file) => {
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.nii') && !lower.endsWith('.nii.gz') && !lower.endsWith('.png')) {
      setError('Unsupported scan format. Please upload a standard brain MRI scan (.nii, .nii.gz) or verified MRI slice (.png).');
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    setSelectedFile(file);
    setError('');
    setUploadResult(null);

    if (lower.endsWith('.png')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async (e) => {
    if (e) e.preventDefault();
    if (!selectedFile) {
      setError('Please select a brain MRI scan to analyze.');
      return;
    }

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', selectedFile);
    if (user?.id) {
      formData.append('user_id', user.id);
    }

    try {
      const result = await api.uploadMriScan(formData);
      setUploadResult(result);
      if (onMriCompleted) {
        onMriCompleted(result);
      }
    } catch (err) {
      setError(err.message || 'Scan analysis encountered an issue. Please verify the scan file and try again.');
    } finally {
      setUploading(false);
    }
  };

  const isAsd = uploadResult?.prediction?.dx_group === 1;
  const isControl = uploadResult?.prediction?.dx_group === 2;
  const confidencePercent = uploadResult?.prediction?.confidence 
    ? (uploadResult.prediction.confidence * 100).toFixed(1) 
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }} className="fade-in">
      {/* Title Card: Autism Prediction as requested */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Autism Prediction</h2>
            <p className="card-subtitle">
              Upload structural brain MRI scan to predict Autism or Non Autism using neuroimaging biomarkers
            </p>
          </div>
          <span className="badge badge-success">Prediction Service Online</span>
        </div>

        {/* Drag and Drop Zone */}
        <div
          className={`mri-dropzone ${dragActive ? 'drag-active' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
        >
          <input
            ref={fileInputRef}
            id="mriFileInput"
            type="file"
            accept=".nii,.nii.gz,.png"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem' }}>
              🧠
            </div>
            <div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy)', margin: 0 }}>
                {selectedFile ? selectedFile.name : 'Select or Drag & Drop Brain MRI Scan'}
              </h4>
              <p style={{ fontSize: '0.84rem', color: 'var(--slate-500)', marginTop: '4px' }}>
                Supports standard 3D NIfTI scans (<code>.nii</code>, <code>.nii.gz</code>) or 2D MRI slices (<code>.png</code>)
              </p>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{ marginTop: '6px', padding: '10px 24px', fontSize: '0.92rem' }}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current && fileInputRef.current.click();
              }}
            >
              📁 Select MRI Scan File
            </button>

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <span className="badge badge-standby">.NII</span>
              <span className="badge badge-standby">.NII.GZ</span>
              <span className="badge badge-standby">.PNG</span>
            </div>
          </div>
        </div>

        {/* Selected File Box & Preview */}
        {selectedFile && (
          <div style={{ marginTop: '18px', padding: '16px 20px', background: 'var(--slate-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--slate-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {previewUrl ? (
                <div style={{ width: '64px', height: '64px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '2px solid var(--slate-300)', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={previewUrl} alt="MRI Cross Section" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
              ) : (
                <div style={{ width: '54px', height: '54px', borderRadius: 'var(--radius-md)', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                  📦
                </div>
              )}
              <div>
                <strong style={{ fontSize: '0.94rem', color: 'var(--navy)' }}>{selectedFile.name}</strong>
                <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginTop: '2px' }}>
                  File Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB &bull; Ready for Autism prediction
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleUpload}
                disabled={uploading}
                style={{ minWidth: '160px' }}
              >
                {uploading ? 'Analyzing Scan...' : 'Analyze Scan ➔'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setSelectedFile(null); setPreviewUrl(null); setUploadResult(null); }}
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {error && <div className="alert alert-warning" style={{ marginTop: '16px' }}>{error}</div>}
      </div>

      {/* Upload Results & Clinical Summary Card */}
      {uploadResult && (
        <div className="card fade-in" style={{ borderColor: isAsd ? '#f59e0b' : '#10b981', boxShadow: 'var(--shadow-md)' }}>
          <div className="card-header">
            <div>
              <h3 className="card-title">Autism Prediction Result</h3>
              <p className="card-subtitle">Assessment Record ID: NB-ASD-{uploadResult.assessment_id}</p>
            </div>
            <span className={`badge ${isAsd ? 'badge-warning' : 'badge-success'}`}>
              {isAsd ? 'Autism' : 'Non Autism'}
            </span>
          </div>

          {/* Finding Banner: Strictly Autism or Non Autism */}
          {uploadResult.prediction ? (
            <div style={{
              background: isAsd ? '#fef2f2' : '#f0fdf4',
              border: isAsd ? '2px solid #f87171' : '2px solid #86efac',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                <span style={{ fontSize: '2.4rem' }}>{isAsd ? '⚠️' : '✅'}</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: isAsd ? '#b91c1c' : '#15803d', letterSpacing: '0.01em' }}>
                    {isAsd ? 'RESULT: AUTISM' : 'RESULT: NON AUTISM'}
                  </h4>
                  <p style={{ margin: '6px 0 0 0', fontSize: '0.94rem', color: isAsd ? '#7f1d1d' : '#14532d', lineHeight: 1.5 }}>
                    {isAsd 
                      ? 'Biomarker analysis indicates Autism. Specialist correlation with behavioral screening is recommended.'
                      : 'Biomarker analysis indicates Non Autism. Standard developmental monitoring recommended.'}
                  </p>
                </div>
              </div>

              {/* Confidence Progress Meter */}
              <div style={{ marginTop: '16px', background: '#ffffff', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--navy)' }}>Biomarker Analysis Confidence</span>
                  <span style={{ fontWeight: 800, fontSize: '1.05rem', color: isAsd ? '#dc2626' : '#16a34a' }}>
                    {confidencePercent}%
                  </span>
                </div>
                <div style={{ height: '14px', background: 'var(--slate-200)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${confidencePercent}%`,
                    height: '100%',
                    background: isAsd ? 'linear-gradient(90deg, #ef4444, #b91c1c)' : 'linear-gradient(90deg, #22c55e, #15803d)',
                    borderRadius: '999px',
                    transition: 'width 0.8s ease-in-out'
                  }} />
                </div>
              </div>
            </div>
          ) : (
            <div className="alert alert-info" style={{ marginBottom: '20px' }}>
              Scan file verified and stored. Awaiting complementary clinical assessments.
            </div>
          )}

          {/* Direct pathway to Questionnaire right below result as requested */}
          <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--slate-200)', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <strong style={{ fontSize: '0.94rem', color: 'var(--navy)' }}>Next Step: Questionnaire Analysis</strong>
              <p style={{ fontSize: '0.84rem', color: 'var(--slate-500)', margin: '2px 0 0 0' }}>
                Complete the 10-item caregiver behavioral questionnaire to correlate with brain imaging findings.
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => navigate('questionnaire')} style={{ padding: '10px 22px' }}>
              📋 Questionnaire Analysis ➔
            </button>
          </div>

          {/* Scan File Metadata */}
          <div className="grid-2" style={{ marginBottom: '22px' }}>
            <div style={{ padding: '16px 20px', background: 'var(--slate-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--slate-200)' }}>
              <h5 style={{ fontWeight: 700, color: 'var(--navy)', marginBottom: '8px', fontSize: '0.94rem' }}>Scan Specifications</h5>
              <p style={{ fontSize: '0.86rem', lineHeight: 1.65, margin: 0, color: 'var(--slate-700)' }}>
                <strong>Filename:</strong> <code>{uploadResult.filename}</code><br />
                <strong>Format:</strong> {uploadResult.header_metadata?.is_2d_slice ? '2D Cross-Section' : '3D Structural Volume'}<br />
                <strong>Resolution:</strong> {uploadResult.header_metadata?.dimensions ? uploadResult.header_metadata.dimensions.join(' × ') : '224 × 224'}
              </p>
            </div>

            <div style={{ padding: '16px 20px', background: 'var(--slate-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--slate-200)' }}>
              <h5 style={{ fontWeight: 700, color: 'var(--navy)', marginBottom: '8px', fontSize: '0.94rem' }}>Prediction Outcome</h5>
              <p style={{ fontSize: '0.86rem', lineHeight: 1.65, margin: 0, color: 'var(--slate-700)' }}>
                <strong>Status:</strong> <span className="badge badge-success">Completed</span><br />
                <strong>Result:</strong> <strong>{isAsd ? 'Autism' : 'Non Autism'}</strong><br />
                <strong>Confidence:</strong> <strong>{confidencePercent}%</strong>
              </p>
            </div>
          </div>

          {/* Action Pathways at end of result: Questionnaire, Support System, and Report */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', borderTop: '1px solid var(--slate-200)', paddingTop: '18px' }}>
            <button className="btn btn-primary" onClick={() => navigate('questionnaire')}>
              📋 Questionnaire Analysis ➔
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('centres')}>
              📍 Location Based Personalized Support ➔
            </button>
            <button className="btn btn-outline" onClick={() => navigate('report')}>
              📄 Report ➔
            </button>
          </div>
        </div>
      )}

      {/* Clinical Guidance Cards */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '12px' }}>Understanding Brain MRI Biomarkers</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--slate-600)', lineHeight: 1.6, marginBottom: '20px' }}>
          Structural brain imaging provides objective physiological biomarkers reflecting neural organization and structural symmetry across brain hemispheres.
        </p>
        <div className="grid-3">
          <div style={{ padding: '16px', background: 'var(--slate-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--slate-200)' }}>
            <h5 style={{ fontWeight: 700, color: 'var(--navy)', marginBottom: '6px' }}>Morphological Features</h5>
            <p style={{ fontSize: '0.84rem', color: 'var(--slate-600)', margin: 0, lineHeight: 1.5 }}>
              Measures gray matter density, cortical thickness, and structural symmetry across brain hemispheres.
            </p>
          </div>
          <div style={{ padding: '16px', background: 'var(--slate-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--slate-200)' }}>
            <h5 style={{ fontWeight: 700, color: 'var(--navy)', marginBottom: '6px' }}>Dual-Modality Fusion</h5>
            <p style={{ fontSize: '0.84rem', color: 'var(--slate-600)', margin: 0, lineHeight: 1.5 }}>
              Combines neuroimaging indicators with standardized behavioral screening to reach over 90% clinical concordance.
            </p>
          </div>
          <div style={{ padding: '16px', background: 'var(--slate-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--slate-200)' }}>
            <h5 style={{ fontWeight: 700, color: 'var(--navy)', marginBottom: '6px' }}>Specialist Consultation</h5>
            <p style={{ fontSize: '0.84rem', color: 'var(--slate-600)', margin: 0, lineHeight: 1.5 }}>
              Automated results are designed to be shared with a certified child neurologist or developmental pediatrician.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
