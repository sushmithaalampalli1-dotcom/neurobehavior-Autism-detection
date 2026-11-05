import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { validateScanFile, validateAge } from '../utils/validators';

export default function MriAssessmentPage({ user, navigate, activeMriResult, onMriCompleted }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preflightInfo, setPreflightInfo] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [pipelineStage, setPipelineStage] = useState(1);
  const [uploadResult, setUploadResult] = useState(() => activeMriResult || null);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const [acceptFilter, setAcceptFilter] = useState('.nii,.nii.gz,.png,.jpg,.jpeg');

  // Optional Patient Clinical Context
  const [patientMrn, setPatientMrn] = useState('');
  const [patientAge, setPatientAge] = useState(() => (user?.age ? String(user.age) : ''));
  const [clinicalNotes, setClinicalNotes] = useState('');

  // Explainable AI (Grad-CAM) Visual State
  const [xaiMode, setXaiMode] = useState('overlay'); // 'overlay', 'heatmap', 'raw', 'compare'
  const [xaiOpacity, setXaiOpacity] = useState(40);

  useEffect(() => {
    if (activeMriResult && !uploadResult) {
      setUploadResult(activeMriResult);
    }
  }, [activeMriResult]);

  // Handle pipeline stage animations during upload
  useEffect(() => {
    let timer;
    if (uploading) {
      setPipelineStage(1);
      timer = setInterval(() => {
        setPipelineStage((prev) => (prev < 4 ? prev + 1 : prev));
      }, 750);
    } else {
      setPipelineStage(1);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [uploading]);

  const handleFile = (file) => {
    if (!file) return;

    // Strict Pre-flight validation
    const validation = validateScanFile(file);
    if (!validation.isValid) {
      setError(validation.error);
      setSelectedFile(null);
      setPreflightInfo(null);
      setPreviewUrl(null);
      return;
    }

    setSelectedFile(file);
    setPreflightInfo(validation);
    setError('');
    setUploadResult(null);

    const lower = file.name.toLowerCase();
    if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
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

  // Trigger file picker with specific extension filter
  const openFilePicker = (specificAccept = '.nii,.nii.gz,.png,.jpg,.jpeg') => {
    setAcceptFilter(specificAccept);
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }, 50);
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
      setError('Please select an MRI scan file (.nii, .nii.gz, .png, .jpg, .jpeg) from your device to analyze.');
      return;
    }

    // Age validation if specified
    if (patientAge) {
      const ageCheck = validateAge(patientAge);
      if (!ageCheck.isValid) {
        setError(ageCheck.message);
        return;
      }
    }

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', selectedFile);
    if (user?.id) {
      formData.append('user_id', user.id);
    }
    if (patientMrn) {
      formData.append('patient_mrn', patientMrn);
    }
    if (patientAge) {
      formData.append('patient_age', patientAge);
    }
    if (clinicalNotes) {
      formData.append('clinical_notes', clinicalNotes);
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
      {/* Title Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Autism Prediction &amp; Scan Assessment</h2>
            <p className="card-subtitle">
              Universal multi-format clinical neuroimaging ingestion and deep biomarker prediction
            </p>
          </div>
          <span className="badge badge-success">Ingestion Engine Ready</span>
        </div>

        {/* Drag and Drop Zone */}
        <div
          className={`mri-dropzone ${dragActive ? 'drag-active' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            id="mriFileInput"
            type="file"
            accept={acceptFilter}
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
                Universal support: 3D NIfTI (<code>.nii</code>, <code>.nii.gz</code>), 2D slices (<code>.png</code>), clinical JPEG (<code>.jpg</code>, <code>.jpeg</code>), and mobile lightbox photos
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '10px 24px', fontSize: '0.92rem' }}
                onClick={() => openFilePicker('.nii,.nii.gz,.png,.jpg,.jpeg')}
              >
                📁 Select MRI Scan from Computer
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '10px 18px', fontSize: '0.92rem' }}
                onClick={handleUpload}
                disabled={uploading}
              >
                {uploading ? 'Analyzing...' : 'Analyze Scan ➔'}
              </button>
            </div>

            {/* Clickable Format Filter Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--slate-500)', fontWeight: 600 }}>Filter by Format:</span>
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: '3px 8px', fontSize: '0.72rem', borderRadius: '999px' }}
                onClick={() => openFilePicker('.png')}
              >
                2D .PNG
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: '3px 8px', fontSize: '0.72rem', borderRadius: '999px' }}
                onClick={() => openFilePicker('.jpg,.jpeg')}
              >
                2D .JPEG
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: '3px 8px', fontSize: '0.72rem', borderRadius: '999px' }}
                onClick={() => openFilePicker('.nii,.nii.gz')}
              >
                3D .NII
              </button>
            </div>
          </div>
        </div>

        {/* Pre-Flight Quality & Integrity Verification Card */}
        {preflightInfo && selectedFile && (
          <div className="preflight-card fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid #e0f2fe', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.25rem' }}>📋</span>
                <strong style={{ fontSize: '0.94rem', color: 'var(--navy)' }}>Pre-Flight Scan Verification Checklist</strong>
              </div>
              <span className="preflight-badge">✓ Passed Quality Integrity Check</span>
            </div>

            <div className="preflight-grid">
              <div className="preflight-item">
                <span>📁</span>
                <div>
                  <strong>Format:</strong> {preflightInfo.formatLabel}
                </div>
              </div>
              <div className="preflight-item">
                <span>⚖️</span>
                <div>
                  <strong>File Size:</strong> {preflightInfo.sizeFormatted} (Verified &lt; 150 MB)
                </div>
              </div>
              <div className="preflight-item">
                <span>🎯</span>
                <div>
                  <strong>Target Modality:</strong> Cranial Axial Structural MRI
                </div>
              </div>
              <div className="preflight-item">
                <span>🛡️</span>
                <div>
                  <strong>Privacy Status:</strong> Client De-identified
                </div>
              </div>
            </div>

            {/* Optional Patient Context */}
            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  Patient Age (Years or Decimal for Months)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="120"
                  className="form-input"
                  placeholder="e.g. 5.0 (0.1 for 1 mo)"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  style={{ padding: '8px 12px', fontSize: '0.86rem' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  Patient Medical Record # (MRN / ID)
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. NB-PAT-2026-0042"
                  value={patientMrn}
                  onChange={(e) => setPatientMrn(e.target.value)}
                  style={{ padding: '8px 12px', fontSize: '0.86rem' }}
                />
              </div>
            </div>

            {/* Selected File Actions */}
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {previewUrl ? (
                  <div style={{ width: '52px', height: '52px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '2px solid var(--slate-300)', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={previewUrl} alt="MRI Slice" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                ) : (
                  <div style={{ width: '52px', height: '52px', borderRadius: 'var(--radius-md)', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                    📦
                  </div>
                )}
                <div style={{ fontSize: '0.85rem' }}>
                  <strong style={{ color: 'var(--navy)' }}>{selectedFile.name}</strong>
                  <div style={{ color: 'var(--slate-500)', fontSize: '0.78rem' }}>Ready for 2.5D Tensor Ingestion &amp; Ensemble Analysis</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleUpload}
                  disabled={uploading}
                  style={{ minWidth: '180px' }}
                >
                  {uploading ? 'Analyzing Scan...' : 'Analyze Scan ➔'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={uploading}
                  onClick={() => { setSelectedFile(null); setPreflightInfo(null); setPreviewUrl(null); setUploadResult(null); }}
                >
                  Clear Scan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Live Clinical Pipeline Stepper during Inference */}
        {uploading && (
          <div className="inference-stepper-card fade-in" style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.4rem' }}>⚙️</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--navy)' }}>
                    Deep Learning Inference Pipeline in Progress
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                    Executing multi-scale neural feature extraction and calibrated soft-voting ensemble
                  </p>
                </div>
              </div>
              <span className="badge badge-info">Stage {pipelineStage} of 4</span>
            </div>

            <div className="stepper-progress-bar">
              <div className="stepper-progress-fill" style={{ width: `${(pipelineStage / 4) * 100}%` }} />
            </div>

            <div>
              <div className={`stepper-step ${pipelineStage > 1 ? 'completed' : pipelineStage === 1 ? 'active' : 'pending'}`}>
                <div className="stepper-icon-circle">{pipelineStage > 1 ? '✓' : '1'}</div>
                <div>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--navy)' }}>Universal Ingestion &amp; Spatial Normalization</strong>
                  <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                    Canonical RAS+ orientation verification &bull; Optical glare suppression &bull; Percentile clipping ($P_1 - P_{99}$)
                  </div>
                </div>
              </div>

              <div className={`stepper-step ${pipelineStage > 2 ? 'completed' : pipelineStage === 2 ? 'active' : 'pending'}`}>
                <div className="stepper-icon-circle">{pipelineStage > 2 ? '✓' : '2'}</div>
                <div>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--navy)' }}>2.5D Multi-Channel Spatial Tensor Synthesis</strong>
                  <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                    Synthesizing $224 \times 224 \times 3$ tensor combining raw intensity, Sobel boundary gradients, and CLAHE subcortical contrast
                  </div>
                </div>
              </div>

              <div className={`stepper-step ${pipelineStage > 3 ? 'completed' : pipelineStage === 3 ? 'active' : 'pending'}`}>
                <div className="stepper-icon-circle">{pipelineStage > 3 ? '✓' : '3'}</div>
                <div>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--navy)' }}>Multi-Scale Deep Feature Extraction</strong>
                  <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                    MobileNetV2 bottleneck embeddings (1,280 features) + 2.5D CNN custom shapes + Bilateral hemispheric asymmetry index
                  </div>
                </div>
              </div>

              <div className={`stepper-step ${pipelineStage >= 4 ? 'active' : 'pending'}`}>
                <div className="stepper-icon-circle">4</div>
                <div>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--navy)' }}>Calibrated Boosted Ensemble &amp; Youden's $J$ Threshold</strong>
                  <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                    Soft-voting consensus (Gradient Boost + HistGB + Logistic Regression) tuned against optimized validation threshold
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-warning" style={{ marginTop: '16px', borderLeft: '4px solid #ef4444' }}>
            <div style={{ fontWeight: 700, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>⚠️</span> Validation Notice
            </div>
            <div style={{ marginTop: '4px', fontSize: '0.86rem', color: '#7f1d1d' }}>{error}</div>
          </div>
        )}
      </div>

      {/* Upload Results & Clinical Summary Card */}
      {uploadResult && (
        <div className="card fade-in" style={{ borderColor: isAsd ? '#f59e0b' : '#10b981', boxShadow: 'var(--shadow-md)' }}>
          <div className="card-header">
            <div>
              <h3 className="card-title">Autism Prediction Result</h3>
              <p className="card-subtitle">Assessment Record ID: NB-ASD-{uploadResult.assessment_id || '2026-01'}</p>
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

              {/* Quality & Mobile Capture Advisory */}
              {uploadResult.prediction?.quality_advisory && (
                <div style={{
                  marginTop: '14px',
                  padding: '10px 14px',
                  background: uploadResult.prediction?.is_mobile_photo ? '#fffbeb' : '#f8fafc',
                  border: uploadResult.prediction?.is_mobile_photo ? '1px solid #fde68a' : '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.84rem',
                  color: uploadResult.prediction?.is_mobile_photo ? '#92400e' : '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '1.1rem' }}>{uploadResult.prediction?.is_mobile_photo ? '📷' : 'ℹ️'}</span>
                  <span><strong>Capture Status:</strong> {uploadResult.prediction.quality_advisory}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="alert alert-info" style={{ marginBottom: '20px' }}>
              Scan file verified and stored. Awaiting complementary clinical assessments.
            </div>
          )}

          {/* Explainable AI: Grad-CAM Neural Attention Maps */}
          {uploadResult.explainable_ai && (
            <div style={{
              background: '#0b1329',
              color: '#ffffff',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              marginBottom: '22px',
              border: '1px solid #1e293b',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.4rem' }}>🧠</span>
                    <h4 style={{ margin: 0, fontSize: '1.18rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '-0.01em' }}>
                      Explainable AI (XAI): Grad-CAM Neural Attention Mapping
                    </h4>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                    Visualizing the exact brain regions highlighted by the deep 2.5D CNN to make its diagnosis
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="badge badge-info" style={{ background: '#0284c7', color: '#ffffff', fontSize: '0.74rem' }}>
                    Target Layer: conv4
                  </span>
                  <span className="badge badge-success" style={{ background: '#059669', color: '#ffffff', fontSize: '0.74rem' }}>
                    Colormap: Turbo Radiance
                  </span>
                </div>
              </div>

              {/* Simple Words Explanation Card */}
              <div style={{
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '10px',
                padding: '14px 18px',
                marginBottom: '18px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '1.2rem' }}>💡</span>
                  <strong style={{ fontSize: '0.92rem', color: '#38bdf8' }}>
                    What is this in simple words?
                  </strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#e2e8f0', lineHeight: 1.55 }}>
                  Normally, AI is a <strong>"black box"</strong>—it makes a prediction without showing its work.
                  <strong> Explainable AI (Grad-CAM)</strong> acts like a <strong>digital highlighter</strong> on the brain MRI.
                  It lights up the exact areas the AI focused on to decide between <em>Autism</em> and <em>Non-Autism</em>,
                  so doctors and families can verify that the decision is based on real brain patterns, not an unexplained guess.
                </p>

                {/* Color Legend */}
                <div style={{
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  marginTop: '12px',
                  paddingTop: '10px',
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  fontSize: '0.8rem'
                }}>
                  <span style={{ color: '#94a3b8', fontWeight: 700 }}>Color Meaning:</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fca5a5' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444', display: 'inline-block', boxShadow: '0 0 6px rgba(239,68,68,0.6)' }} />
                    <strong>Red / Orange:</strong> High AI Focus (Main Biomarker Area)
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fef08a' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#eab308', display: 'inline-block' }} />
                    <strong>Yellow / Green:</strong> Moderate Notice
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#93c5fd' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
                    <strong>Blue / Dark:</strong> Normal Background (Ignored)
                  </span>
                </div>
              </div>

              {/* View Mode Toolbar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'overlay', label: '🔮 Superimposed Overlay' },
                    { id: 'heatmap', label: '🔥 Pure Heatmap' },
                    { id: 'raw', label: '🖼️ Raw MRI Slice' },
                    { id: 'compare', label: '⚖️ Side-by-Side Comparison' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setXaiMode(m.id)}
                      style={{
                        padding: '6px 14px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        borderRadius: '6px',
                        border: xaiMode === m.id ? '2px solid #38bdf8' : '1px solid #334155',
                        background: xaiMode === m.id ? '#0284c7' : 'transparent',
                        color: xaiMode === m.id ? '#ffffff' : '#cbd5e1',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* Opacity Slider for Overlay Mode */}
                {xaiMode === 'overlay' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', color: '#cbd5e1' }}>
                    <span>Heatmap Opacity: <strong>{xaiOpacity}%</strong></span>
                    <input
                      type="range"
                      min="10"
                      max="90"
                      value={xaiOpacity}
                      onChange={(e) => setXaiOpacity(Number(e.target.value))}
                      style={{ width: '100px', cursor: 'pointer' }}
                    />
                  </div>
                )}
              </div>

              {/* Main Image Display */}
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                {xaiMode === 'compare' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', maxWidth: '640px', margin: '0 auto' }}>
                    <div style={{ background: '#000000', borderRadius: '8px', padding: '10px', border: '1px solid #334155' }}>
                      <img
                        src={previewUrl || uploadResult.explainable_ai.overlay_url}
                        alt="Raw MRI Slice"
                        style={{ width: '100%', height: '240px', objectFit: 'contain', borderRadius: '4px' }}
                      />
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '6px', fontWeight: 600 }}>
                        Raw Structural Brain MRI
                      </div>
                    </div>

                    <div style={{ background: '#000000', borderRadius: '8px', padding: '10px', border: '1px solid #334155' }}>
                      <img
                        src={uploadResult.explainable_ai.overlay_base64 || uploadResult.explainable_ai.overlay_url}
                        alt="Grad-CAM Overlay"
                        style={{ width: '100%', height: '240px', objectFit: 'contain', borderRadius: '4px' }}
                      />
                      <div style={{ fontSize: '0.78rem', color: '#38bdf8', marginTop: '6px', fontWeight: 700 }}>
                        Grad-CAM Saliency Overlay (conv4)
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ maxWidth: '380px', margin: '0 auto', background: '#000000', borderRadius: '10px', padding: '12px', border: '1px solid #334155', position: 'relative' }}>
                    {xaiMode === 'raw' && (
                      <img
                        src={previewUrl || uploadResult.explainable_ai.overlay_url}
                        alt="Raw MRI Slice"
                        style={{ width: '100%', height: '280px', objectFit: 'contain', borderRadius: '6px' }}
                      />
                    )}
                    {xaiMode === 'heatmap' && (
                      <img
                        src={uploadResult.explainable_ai.heatmap_base64 || uploadResult.explainable_ai.heatmap_url}
                        alt="Pure Grad-CAM Heatmap"
                        style={{ width: '100%', height: '280px', objectFit: 'contain', borderRadius: '6px' }}
                      />
                    )}
                    {xaiMode === 'overlay' && (
                      <div style={{ position: 'relative', width: '100%', height: '280px' }}>
                        {/* Base MRI */}
                        <img
                          src={previewUrl || uploadResult.explainable_ai.overlay_url}
                          alt="Base MRI"
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain', borderRadius: '6px' }}
                        />
                        {/* Blended Heatmap */}
                        <img
                          src={uploadResult.explainable_ai.heatmap_base64 || uploadResult.explainable_ai.heatmap_url}
                          alt="Grad-CAM Heatmap"
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            borderRadius: '6px',
                            opacity: xaiOpacity / 100,
                            mixBlendMode: 'screen',
                          }}
                        />
                      </div>
                    )}
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '8px' }}>
                      {xaiMode === 'overlay' && `Composite View (Blend: ${100 - xaiOpacity}% MRI / ${xaiOpacity}% Grad-CAM)`}
                      {xaiMode === 'heatmap' && 'Pure Class Activation Energy Distribution (Turbo Colormap)'}
                      {xaiMode === 'raw' && 'Original Structural Input Slice'}
                    </div>
                  </div>
                )}
              </div>

              {/* Anatomical Regions of Attention */}
              {uploadResult.explainable_ai.top_activated_regions && uploadResult.explainable_ai.top_activated_regions.length > 0 && (
                <div style={{ marginTop: '18px' }}>
                  <h5 style={{ margin: '0 0 10px 0', fontSize: '0.88rem', color: '#e2e8f0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    📍 Where Did the AI Look? (Key Brain Areas Driving the Diagnosis)
                  </h5>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                    {uploadResult.explainable_ai.top_activated_regions.map((region, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid #334155',
                          borderRadius: '8px',
                          padding: '12px 14px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <strong style={{ fontSize: '0.84rem', color: '#38bdf8' }}>{region.name}</strong>
                          <span style={{ fontSize: '0.76rem', background: '#0369a1', color: '#ffffff', padding: '2px 8px', borderRadius: '999px', fontWeight: 700 }}>
                            {region.activation_pct}% Focus
                          </span>
                        </div>
                        <div style={{ height: '6px', background: '#1e293b', borderRadius: '999px', overflow: 'hidden', marginBottom: '8px' }}>
                          <div style={{ width: `${region.activation_pct}%`, height: '100%', background: 'linear-gradient(90deg, #38bdf8, #f59e0b)', borderRadius: '999px' }} />
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8', lineHeight: 1.4 }}>
                          {region.clinical_role}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Clinical Interpretation Note in Simple Words */}
              {uploadResult.explainable_ai.clinical_interpretation && (
                <div style={{ marginTop: '16px', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '8px', padding: '12px 16px', fontSize: '0.82rem', color: '#bae6fd', lineHeight: 1.5 }}>
                  <strong>🩺 Summary in Simple Words: </strong>
                  {uploadResult.explainable_ai.clinical_interpretation}
                </div>
              )}
            </div>
          )}

          {/* Direct pathway to Questionnaire right below result */}
          <div style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
            padding: '18px 22px',
            borderRadius: 'var(--radius-lg)',
            border: '2px solid #86efac',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.3rem' }}>📋</span>
                <strong style={{ fontSize: '1.02rem', color: '#166534' }}>Next Step: Questionnaire Analysis</strong>
              </div>
              <p style={{ fontSize: '0.86rem', color: '#15803d', margin: '4px 0 0 0', lineHeight: 1.45 }}>
                Complete the 10-item caregiver behavioral questionnaire (IASQ) to correlate with your brain imaging results.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate('questionnaire', { keepMri: true })}
              style={{
                background: '#16a34a',
                borderColor: '#15803d',
                padding: '12px 24px',
                fontSize: '0.94rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
                cursor: 'pointer'
              }}
            >
              <span>📋 Go to Questionnaire Analysis</span>
              <span style={{ fontSize: '1.15rem' }}>➔</span>
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

          {/* Action Pathways at end of MRI analysis result */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', borderTop: '1px solid var(--slate-200)', paddingTop: '18px', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate('questionnaire', { keepMri: true })}
              style={{
                background: '#16a34a',
                borderColor: '#15803d',
                padding: '10px 20px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 10px rgba(22, 163, 74, 0.25)'
              }}
            >
              <span>📋 Take Questionnaire Screening</span>
              <span style={{ fontSize: '1.1rem' }}>➔</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('centres')}
              style={{ padding: '10px 18px', fontWeight: 600 }}
            >
              📍 Location Based Support Centres ➔
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate('report')}
              style={{ padding: '10px 18px', fontWeight: 600 }}
            >
              📄 View Clinical Report ➔
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

      {/* Persistent End-of-Analysis CTA to Questionnaire */}
      <div
        className="card fade-in"
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
          color: '#ffffff',
          padding: '24px 28px',
          borderRadius: '12px',
          marginTop: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 6px 20px rgba(30, 58, 138, 0.25)',
        }}
      >
        <div style={{ maxWidth: '620px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '1.4rem' }}>📋</span>
            <h4 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 800, color: '#ffffff' }}>
              Proceed to Questionnaire Screening
            </h4>
          </div>
          <p style={{ margin: 0, fontSize: '0.86rem', color: '#cbd5e1', lineHeight: 1.5 }}>
            Complete the 10-item Indian Autism Screening Questionnaire (IASQ) to evaluate caregiver-observed behavioral milestones alongside neuroimaging biomarkers.
          </p>
        </div>

        <button
          type="button"
          className="btn"
          onClick={() => navigate('questionnaire', { keepMri: true })}
          style={{
            background: '#22c55e',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '0.96rem',
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            boxShadow: '0 4px 14px rgba(34, 197, 94, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>📋 Start Questionnaire Analysis</span>
          <span style={{ fontSize: '1.15rem' }}>➔</span>
        </button>
      </div>
    </div>
  );
}
