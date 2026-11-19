import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { validateAge, validateIasqResponses, validateQuestionnaireAge } from '../utils/validators';

export default function QuestionnairePage({ user, navigate, activeQuestionnaireResult, onQuestionnaireCompleted }) {
  const [schema, setSchema] = useState(null);
  const [subjectAge, setSubjectAge] = useState(() => (user?.age ? String(user.age) : ''));
  const [informant, setInformant] = useState('Parent / Guardian');
  const [clinicalConcerns, setClinicalConcerns] = useState('');
  const [answers, setAnswers] = useState({});
  const [unansweredIds, setUnansweredIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(() => activeQuestionnaireResult || null);
  const [error, setError] = useState('');

  // Age eligibility evaluation: strictly suitable for 1 to 18 years only
  const qAgeCheck = validateQuestionnaireAge(subjectAge);
  const isAgeOver18 = qAgeCheck.isOver18;
  const isAgeUnder1 = qAgeCheck.isUnder1;

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
    if (isAgeOver18) {
      setError('The behavioral questionnaire is suitable for 1 to 18 years only. Answering is not permitted.');
      return;
    }
    if (isAgeUnder1) {
      setError('The behavioral questionnaire is suitable for 1 to 18 years only. Minimum age is 1 year.');
      return;
    }
    setAnswers((prev) => ({
      ...prev,
      [itemId]: value,
    }));
    // Remove from unanswered list once clicked
    setUnansweredIds((prev) => prev.filter((id) => id !== itemId));
    setError('');
  };

  const validation = validateIasqResponses(answers, schema?.items);
  const answeredCount = validation.answeredCount;
  const totalCount = validation.totalCount;
  const progressPercent = validation.progressPercent;

  // Jump to first unanswered question helper
  const scrollToFirstUnanswered = () => {
    const missing = (schema?.items || []).find((item) => answers[item.id] === undefined || answers[item.id] === null);
    if (missing) {
      const el = document.getElementById(`iasq-item-${missing.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Subject Age validation: strictly 1 to 18 years only
    if (isAgeOver18) {
      setError('The IASQ Behavioral Questionnaire is suitable for 1 to 18 years only. Individuals older than 18 cannot answer.');
      return;
    }
    if (isAgeUnder1) {
      setError('The IASQ Behavioral Questionnaire is suitable for 1 to 18 years only. Minimum age is 1 year.');
      return;
    }

    const ageCheck = validateAge(subjectAge);
    if (!ageCheck.isValid) {
      setError(ageCheck.message);
      return;
    }

    // Questionnaire completeness validation
    if (answeredCount < totalCount) {
      const missingList = validation.missingItems.map((item) => item.id);
      setUnansweredIds(missingList);
      setError(`Standardized IASQ screening protocol requires all 10 items. Missing responses for: ${validation.missingItemLabels}`);
      scrollToFirstUnanswered();
      return;
    }

    setSubmitting(true);
    setError('');
    setUnansweredIds([]);

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
    setUnansweredIds([]);
    setSubjectAge(user?.age ? String(user.age) : '5.0');
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
            <h2 className="card-title">Questionnaire Analysis (IASQ 10-Item Protocol / ಐ.ಎ.ಎಸ್.ಕ್ಯೂ ಪ್ರಶ್ನಾವಳಿ)</h2>
            <p className="card-subtitle">
              Standardized behavioral observation tool with Kannada translations (PMC8062015 / ಕನ್ನಡ ಅನುವಾದ ಸಹಿತ)
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className="badge badge-info">🌐 English &amp; ಕನ್ನಡ</span>
            <span className="badge badge-success">Protocol Active</span>
          </div>
        </div>
      </div>

      {/* Main Questionnaire Card */}
      <div className="card">
        {error && (
          <div className="alert alert-warning fade-in" style={{ marginBottom: '18px', borderLeft: '4px solid #ef4444' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c', fontWeight: 700 }}>
                <span>⚠️</span> {error}
              </div>
              {unansweredIds.length > 0 && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                  onClick={scrollToFirstUnanswered}
                >
                  ➔ Jump to First Unanswered Item
                </button>
              )}
            </div>
          </div>
        )}

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
                    {result.screen_status === 'Screen Positive' ? 'Elevated Behavioral Likelihood (Score ≥ 2)' : 'Standard Developmental Likelihood (Score < 2)'}
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--slate-600)', marginTop: '4px' }}>
                    Assessment ID: <strong>NB-ASD-{result.assessment_id}</strong> &bull; Risk Category: <strong>{result.risk_tier}</strong>
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '2.4rem', fontWeight: 900, color: result.score >= 2 ? '#b91c1c' : '#15803d' }}>
                    {result.score} / 10
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    IASQ Cumulative Score
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '14px' }}>
                <button className="btn btn-primary" onClick={() => navigate('centres')}>
                  📍 Location Based Personalized Support ➔
                </button>
                <button className="btn btn-outline" onClick={() => navigate('report')}>
                  📄 View Full Unified Report ➔
                </button>
                <button className="btn btn-secondary" onClick={resetForm}>
                  🔄 Retake Questionnaire
                </button>
              </div>
            </div>

            {/* Detailed Item Breakdown */}
            <div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '10px' }}>
                Itemized Response Breakdown
              </h4>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Item #</th>
                      <th>Behavioral Domain</th>
                      <th>Clinical Feature Question</th>
                      <th>Response</th>
                      <th>Score Points</th>
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
                            {item.response === 'Yes' ? 'Yes (ಹೌದು)' : 'No (ಇಲ್ಲ)'}
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
          <form onSubmit={handleSubmit} noValidate>
            {/* Demographics Row */}
            <div className="grid-2" style={{ marginBottom: '22px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="ageInput" style={{ fontWeight: 700 }}>
                  Subject Age (in years) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="ageInput"
                  type="number"
                  min="1"
                  max="18"
                  step="0.1"
                  className={`form-input ${isAgeOver18 || isAgeUnder1 ? 'is-invalid' : ''}`}
                  placeholder="e.g. 5.0 (Range: 1 to 18 years)"
                  value={subjectAge}
                  onChange={(e) => {
                    setSubjectAge(e.target.value);
                    setError('');
                  }}
                  required
                />
                <span className="form-help" style={{ color: isAgeOver18 ? '#dc2626' : 'var(--slate-500)', fontWeight: isAgeOver18 ? 700 : 400 }}>
                  Standardized psychometric screening protocol: Suitable for 1 to 18 years only.
                </span>

                {isAgeOver18 && (
                  <div style={{
                    marginTop: '8px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: '#fef2f2',
                    border: '1.5px solid #ef4444',
                    color: '#991b1b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.84rem'
                  }}>
                    <span style={{ fontSize: '1.25rem' }}>🚫</span>
                    <div>
                      <strong>Age ({subjectAge} yrs) exceeds screening limit:</strong> Answering is disabled. The behavioral questionnaire is suitable for 1 to 18 years only.
                    </div>
                  </div>
                )}

                {isAgeUnder1 && subjectAge !== '' && (
                  <div style={{
                    marginTop: '8px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: '#fffbeb',
                    border: '1.5px solid #f59e0b',
                    color: '#92400e',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.84rem'
                  }}>
                    <span style={{ fontSize: '1.25rem' }}>⚠️</span>
                    <div>
                      <strong>Age ({subjectAge} yrs) below 1 year:</strong> The behavioral questionnaire is suitable for 1 to 18 years only.
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="informantSelect" style={{ fontWeight: 700 }}>
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
              <label className="form-label" htmlFor="concernsInput" style={{ fontWeight: 700 }}>
                Parental / Clinical Observations (Optional Context)
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

            {/* Live Progress Bar with Completion Checklist */}
            <div style={{ marginBottom: '24px', padding: '16px 20px', background: 'var(--slate-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--slate-200)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--navy)' }}>
                  Screening Protocol Progress: {answeredCount} of {totalCount} items answered
                </span>
                <span className={`badge ${answeredCount === totalCount ? 'badge-success' : 'badge-warning'}`}>
                  {answeredCount === totalCount ? '✓ Complete & Ready' : `${totalCount - answeredCount} Remaining`}
                </span>
              </div>
              <div style={{ height: '8px', background: 'var(--slate-200)', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  background: answeredCount === totalCount ? 'linear-gradient(90deg, #16a34a, #22c55e)' : 'linear-gradient(90deg, #0284c7, #0369a1)',
                  borderRadius: '999px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>

            {/* Locked Warning Notice when Age > 18 */}
            {isAgeOver18 && (
              <div style={{
                padding: '22px 24px',
                borderRadius: 'var(--radius-lg)',
                background: '#fff5f5',
                border: '2px dashed #ef4444',
                textAlign: 'center',
                color: '#991b1b',
                marginBottom: '24px',
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '6px' }}>🔒</div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 6px 0', color: '#991b1b' }}>
                  Behavioral Questions Locked (Subject Age: {subjectAge} Years)
                </h3>
                <p style={{ margin: '0 auto', fontSize: '0.9rem', color: '#7f1d1d', lineHeight: 1.5, maxWidth: '620px' }}>
                  The Indian Autism Screening Questionnaire (IASQ) is validated and suitable for <strong>1 to 18 years only</strong>.
                  Answering is restricted for subjects older than 18 years.
                </p>
              </div>
            )}

            {/* 10 IASQ Questions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
              {(schema?.items || []).map((item) => {
                const currentVal = answers[item.id];
                const isMissing = unansweredIds.includes(item.id);

                return (
                  <div
                    key={item.id}
                    id={`iasq-item-${item.id}`}
                    className={isMissing ? 'missing-item-alert' : ''}
                    style={{
                      padding: '18px 20px',
                      borderRadius: 'var(--radius-lg)',
                      border: isMissing 
                        ? '2px solid #ef4444' 
                        : currentVal !== undefined 
                          ? '1px solid #bae6fd' 
                          : '1px solid var(--slate-200)',
                      background: isMissing 
                        ? '#fff5f5' 
                        : currentVal !== undefined 
                          ? '#f0f9ff' 
                          : '#ffffff',
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
                          {isMissing && (
                            <span className="badge badge-warning" style={{ color: '#b91c1c', background: '#fee2e2', border: '1px solid #fecaca' }}>
                              * Response Required
                            </span>
                          )}
                          {currentVal !== undefined && (
                            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                              ✓ Answered
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: '0.94rem', color: 'var(--slate-800)', lineHeight: 1.5, fontWeight: 500, margin: 0 }}>
                          {item.question}
                        </p>
                      </div>

                      {/* Yes / No Clickable Tiles (Disabled if Age > 18 or < 1) */}
                      <div style={{ display: 'flex', gap: '8px', minWidth: '160px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          disabled={isAgeOver18 || isAgeUnder1}
                          className={`btn ${currentVal === true ? 'btn-primary' : 'btn-secondary'}`}
                          style={{
                            padding: '8px 18px',
                            fontSize: '0.86rem',
                            fontWeight: 600,
                            background: currentVal === true ? '#dc2626' : undefined,
                            borderColor: currentVal === true ? '#dc2626' : undefined,
                            opacity: (isAgeOver18 || isAgeUnder1) ? 0.4 : 1,
                            cursor: (isAgeOver18 || isAgeUnder1) ? 'not-allowed' : 'pointer',
                          }}
                          onClick={() => !isAgeOver18 && !isAgeUnder1 && handleAnswerChange(item.id, true)}
                          title={isAgeOver18 ? 'Suitable for 1 to 18 years only' : ''}
                        >
                          Yes (ಹೌದು) (1)
                        </button>
                        <button
                          type="button"
                          disabled={isAgeOver18 || isAgeUnder1}
                          className={`btn ${currentVal === false ? 'btn-primary' : 'btn-secondary'}`}
                          style={{
                            padding: '8px 18px',
                            fontSize: '0.86rem',
                            fontWeight: 600,
                            background: currentVal === false ? '#16a34a' : undefined,
                            borderColor: currentVal === false ? '#16a34a' : undefined,
                            opacity: (isAgeOver18 || isAgeUnder1) ? 0.4 : 1,
                            cursor: (isAgeOver18 || isAgeUnder1) ? 'not-allowed' : 'pointer',
                          }}
                          onClick={() => !isAgeOver18 && !isAgeUnder1 && handleAnswerChange(item.id, false)}
                          title={isAgeOver18 ? 'Suitable for 1 to 18 years only' : ''}
                        >
                          No (ಇಲ್ಲ) (0)
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
                disabled={isAgeOver18 || isAgeUnder1 || submitting}
                style={{
                  padding: '12px 28px',
                  fontSize: '0.96rem',
                  opacity: (isAgeOver18 || isAgeUnder1) ? 0.45 : 1,
                  cursor: (isAgeOver18 || isAgeUnder1) ? 'not-allowed' : 'pointer',
                }}
              >
                {isAgeOver18
                  ? '🚫 Questionnaire Locked (Suitable for 1 to 18 Years Only)'
                  : isAgeUnder1
                    ? '⚠️ Age < 1 (Suitable for 1 to 18 Years Only)'
                    : submitting
                      ? 'Scoring Assessment...'
                      : 'Submit & Score Assessment ➔'}
              </button>
              {answeredCount < totalCount && !isAgeOver18 && !isAgeUnder1 && (
                <span style={{ fontSize: '0.84rem', color: 'var(--slate-500)' }}>
                  Please answer all {totalCount} items before submitting ({totalCount - answeredCount} remaining).
                </span>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
