import React, { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function QuestionnairePage({ user, navigate, activeQuestionnaireResult, onQuestionnaireCompleted }) {
  const [schema, setSchema] = useState(null);
  const [subjectAge, setSubjectAge] = useState('5');
  const [informant, setInformant] = useState('Parent / Guardian');
  const [clinicalConcerns, setClinicalConcerns] = useState('');
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(() => activeQuestionnaireResult || null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (activeQuestionnaireResult && !result) {
      setResult(activeQuestionnaireResult);
    }
  }, [activeQuestionnaireResult]);

  useEffect(() => {
    api.getQuestionnaireSchema()
      .then(setSchema)
      .catch((err) => setError('Could not load questionnaire schema: ' + err.message));
  }, []);

  const handleAnswerChange = (itemId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [itemId]: value,
    }));
    setError('');
  };

  const answeredCount = Object.keys(answers).filter((k) => answers[k] !== undefined && answers[k] !== null).length;
  const totalCount = schema?.items?.length || 10;
  const progressPercent = Math.round((answeredCount / totalCount) * 100);

  // Quick 1-click test helpers
  const fillSamplePositive = () => {
    if (!schema?.items) return;
    const newAnswers = {};
    schema.items.forEach((item, idx) => {
      // Set 4 items to Yes (Score = 4, Positive Screen)
      newAnswers[item.id] = (idx === 0 || idx === 1 || idx === 4 || idx === 6);
    });
    setAnswers(newAnswers);
    setSubjectAge('6');
    setClinicalConcerns('Parent observed delayed speech milestones and repetitive motor mannerisms.');
    setError('');
  };

  const fillSampleNegative = () => {
    if (!schema?.items) return;
    const newAnswers = {};
    schema.items.forEach((item) => {
      newAnswers[item.id] = false; // All No (Score = 0, Negative Screen)
    });
    setAnswers(newAnswers);
    setSubjectAge('7');
    setClinicalConcerns('Standard developmental checkup; no specific caregiver concerns noted.');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subjectAge) {
      setError('Please provide the subject age in years.');
      return;
    }

    if (answeredCount < totalCount) {
      const missingNumbers = (schema?.items || [])
        .filter((item) => answers[item.id] === undefined || answers[item.id] === null)
        .map((item) => `Item ${item.number}`)
        .join(', ');
      setError(`All 10 items are required by the screening protocol. Missing: ${missingNumbers}`);
      return;
    }

    setSubmitting(true);
    setError('');

    const payload = {
      subject_age: subjectAge,
      informant_relationship: informant,
      clinical_concerns: clinicalConcerns,
      responses: answers,
    };

    try {
      const res = await api.submitQuestionnaire(payload);
      setResult(res);
      if (onQuestionnaireCompleted) {
        onQuestionnaireCompleted(res);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message || 'Failed to submit questionnaire assessment.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setAnswers({});
    setSubjectAge('5');
    setClinicalConcerns('');
    setResult(null);
    setError('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }} className="fade-in">
      {/* Title Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Questionnaire Analysis</h2>
            <p className="card-subtitle">
              Standardized 10-item behavioral observation tool evaluating social communication and developmental milestones
            </p>
          </div>
          <span className="badge badge-success">Screening Active</span>
        </div>
      </div>

      {/* Main Questionnaire Card */}
      <div className="card">
        {error && <div className="alert alert-warning" style={{ marginBottom: '16px' }}>{error}</div>}

        {/* Assessment Result Display */}
        {result ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }} className="fade-in">
            <div style={{
              padding: '24px',
              borderRadius: 'var(--radius-lg)',
              background: result.score >= 2 ? '#fef2f2' : '#f0fdf4',
              border: `2px solid ${result.score >= 2 ? '#f87171' : '#86efac'}`,
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <span className={`badge ${result.score >= 2 ? 'badge-warning' : 'badge-success'}`} style={{ marginBottom: '8px' }}>
                    {result.screen_status}
                  </span>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: result.score >= 2 ? '#991b1b' : '#166534', margin: 0 }}>
                    {result.screen_status === 'Screen Positive' ? 'Elevated Behavioral Likelihood' : 'Standard Developmental Likelihood'}
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--slate-600)', marginTop: '4px' }}>
                    Assessment ID: <strong>NB-ASD-{result.assessment_id}</strong> &bull; Risk Category: <strong>{result.risk_tier}</strong>
                  </p>
                </div>
                <div style={{ textAlign: 'center', background: '#ffffff', padding: '12px 20px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0,0,0,0.08)' }}>
                  <span style={{ fontSize: '2.2rem', fontWeight: 800, color: result.score >= 2 ? '#dc2626' : '#16a34a', lineHeight: 1 }}>
                    {result.score} <span style={{ fontSize: '1.1rem', color: 'var(--slate-400)' }}>/ {result.max_score}</span>
                  </span>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--slate-500)', marginTop: '4px', textTransform: 'uppercase' }}>
                    Behavioral Score
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.92rem', lineHeight: 1.6, color: 'var(--slate-800)', marginTop: '14px', padding: '14px 18px', background: '#ffffff', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <strong style={{ color: 'var(--navy)' }}>Clinical Recommendation:</strong>
                <p style={{ marginTop: '4px', margin: 0 }}>{result.clinical_recommendation}</p>
                {result.age_warning && (
                  <p style={{ marginTop: '8px', color: '#b45309', fontSize: '0.84rem' }}>
                    ⚠️ {result.age_warning}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '18px', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => navigate('centres')}>
                  📍 Location Based Personalized Support ➔
                </button>
                <button className="btn btn-secondary" onClick={() => navigate('report')}>
                  📄 Report ➔
                </button>
                <button className="btn btn-outline" onClick={resetForm}>
                  🔄 Retake Screening
                </button>
              </div>
            </div>

            {/* Detailed Item Breakdown Table */}
            <div className="card">
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '14px' }}>Item Breakdown</h4>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Domain</th>
                      <th>Behavioral Indicator</th>
                      <th>Response</th>
                      <th>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(result.detailed_scores || {}).map((item) => (
                      <tr key={item.number}>
                        <td><strong>Item {item.number}</strong></td>
                        <td><span className="badge badge-info">{item.domain}</span></td>
                        <td>{item.title}</td>
                        <td>
                          <span className={`badge ${item.response === 'Yes' ? 'badge-warning' : 'badge-success'}`}>
                            {item.response}
                          </span>
                        </td>
                        <td><strong>{item.points}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* Intake & Questionnaire Form */
          <form onSubmit={handleSubmit}>
            {/* Demographics Row */}
            <div className="grid-2" style={{ marginBottom: '22px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="ageInput">
                  Subject Age (in years) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="ageInput"
                  type="number"
                  min="1"
                  max="25"
                  step="0.5"
                  className="form-input"
                  placeholder="e.g. 5"
                  value={subjectAge}
                  onChange={(e) => setSubjectAge(e.target.value)}
                  required
                />
                <span className="form-help">Validated psychometric screening range: 3 to 18 years.</span>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="informantSelect">
                  Relationship of Informant <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  id="informantSelect"
                  className="form-input"
                  value={informant}
                  onChange={(e) => setInformant(e.target.value)}
                >
                  <option value="Parent / Guardian">Parent / Legal Guardian</option>
                  <option value="Caregiver">Primary Caregiver</option>
                  <option value="Special Educator">Special Educator / Teacher</option>
                  <option value="Clinician">Healthcare Clinician</option>
                  <option value="Self">Self (Adolescent/Adult)</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label" htmlFor="concernsInput">
                Parental / Clinical Observations (Optional)
              </label>
              <textarea
                id="concernsInput"
                className="form-input"
                rows="2"
                placeholder="Describe any communication milestones, eye contact, interaction patterns, or sensory sensitivities..."
                value={clinicalConcerns}
                onChange={(e) => setClinicalConcerns(e.target.value)}
              />
            </div>

            {/* Live Progress Bar */}
            <div style={{ marginBottom: '24px', padding: '16px 20px', background: 'var(--slate-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--slate-200)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--navy)' }}>
                  Screening Progress: {answeredCount} of {totalCount} items answered
                </span>
                <span className={`badge ${answeredCount === totalCount ? 'badge-success' : 'badge-warning'}`}>
                  {answeredCount === totalCount ? 'Ready to Submit' : `${totalCount - answeredCount} Remaining`}
                </span>
              </div>
              <div style={{ height: '8px', background: 'var(--slate-200)', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #0284c7, #0369a1)',
                  borderRadius: '999px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>

            {/* 10 IASQ Questions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
              {(schema?.items || []).map((item) => {
                const currentVal = answers[item.id];
                return (
                  <div
                    key={item.id}
                    style={{
                      padding: '18px 20px',
                      borderRadius: 'var(--radius-lg)',
                      border: currentVal !== undefined ? '1px solid #bae6fd' : '1px solid var(--slate-200)',
                      background: currentVal !== undefined ? '#f0f9ff' : '#ffffff',
                      transition: 'all 0.18s ease',
                      boxShadow: currentVal !== undefined ? '0 2px 8px rgba(2, 132, 199, 0.08)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
                      <div style={{ flex: 1, minWidth: '260px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.9rem' }}>
                            Item {item.number}
                          </span>
                          <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>
                            {item.domain}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.94rem', color: 'var(--slate-800)', lineHeight: 1.5, fontWeight: 500, margin: 0 }}>
                          {item.question}
                        </p>
                      </div>

                      {/* Yes / No Clickable Tiles */}
                      <div style={{ display: 'flex', gap: '8px', minWidth: '160px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className={`btn ${currentVal === true ? 'btn-primary' : 'btn-secondary'}`}
                          style={{
                            padding: '8px 18px',
                            fontSize: '0.86rem',
                            background: currentVal === true ? '#dc2626' : undefined,
                            borderColor: currentVal === true ? '#dc2626' : undefined
                          }}
                          onClick={() => handleAnswerChange(item.id, true)}
                        >
                          Yes (1)
                        </button>
                        <button
                          type="button"
                          className={`btn ${currentVal === false ? 'btn-primary' : 'btn-secondary'}`}
                          style={{
                            padding: '8px 18px',
                            fontSize: '0.86rem',
                            background: currentVal === false ? '#16a34a' : undefined,
                            borderColor: currentVal === false ? '#16a34a' : undefined
                          }}
                          onClick={() => handleAnswerChange(item.id, false)}
                        >
                          No (0)
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || answeredCount < totalCount}
                style={{ padding: '12px 28px', fontSize: '0.96rem' }}
              >
                {submitting ? 'Scoring Assessment...' : 'Submit & Score Assessment ➔'}
              </button>
              {answeredCount < totalCount && (
                <span style={{ fontSize: '0.84rem', color: 'var(--slate-500)' }}>
                  Please answer all {totalCount} items before submitting.
                </span>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
