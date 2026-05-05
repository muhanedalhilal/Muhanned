import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  ArrowLeft, CheckCircle2, XCircle, Trophy, Medal,
  AlertCircle, BarChart2, TrendingUp, TrendingDown, ChevronRight
} from 'lucide-react';

/* Animated fill bar */
function Bar({ pct, color, delay = 0 }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(pct), delay);
    return () => clearTimeout(t);
  }, [pct, delay]);
  return (
    <div style={{ background: '#f1f5f9', borderRadius: 99, height: 16, overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', borderRadius: 99, background: color, width: `${w}%`, transition: 'width 1s cubic-bezier(.4,0,.2,1)' }} />
    </div>
  );
}

export default function Quiz({ t, isRtl, setCurrentPage, selectedComponents, selectedCourseId, setSelectedCourseId, selectedComponentsData = [] }) {

  // Go back to the course detail view (not command center)
  const navigateBack = () => {
    setCurrentPage('dashboard');
    // selectedCourseId stays set → Dashboard will show the course view
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]); // Total record
  const [quizFinished, setQuizFinished] = useState(false);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [isMasteryReached, setIsMasteryReached] = useState(false);
  const [averageMastery, setAverageMastery] = useState(0);
  const [kcMasteryMap, setKcMasteryMap] = useState({});
  const [startMasteryMap, setStartMasteryMap] = useState({});
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [componentMetadata, setComponentMetadata] = useState([]);

  useEffect(() => {
    if (selectedComponents.length === 0) {
      setError('No components selected for the quiz.');
      setLoading(false);
      return;
    }
    const fetchQuiz = async () => {
      try {
        const [compRes, quizRes] = await Promise.all([
          api.get(`/courses/${selectedCourseId}/components`),
          api.post('/quiz/generate', { kc_ids: selectedComponents })
        ]);

        if (compRes.ok && compRes.data) {
          const selected = compRes.data.filter(c => selectedComponents.includes(c.id));
          setComponentMetadata(selected);
          const sum = selected.reduce((acc, curr) => acc + curr.progress, 0);
          setAverageMastery(selected.length > 0 ? (sum / selected.length) : 0);

          const initialMap = {};
          selected.forEach(c => initialMap[c.id] = (c.progress || 0) / 100);
          setKcMasteryMap(initialMap);
          setStartMasteryMap(initialMap);
        }

        if (quizRes.ok && quizRes.data && quizRes.data.length > 0) {
          setQuestions(quizRes.data);
        } else {
          setError(quizRes.message || 'Could not generate quiz.');
        }
      } catch (err) {
        setError(err.message || 'Failed to connect to the quiz engine.');
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [selectedComponents]);

  const handleSelect = async (idx) => {
    if (showResult) return;
    const isCorrect = idx === questions[currentIdx].answer;
    setSelectedOption(idx);
    setShowResult(true);
    if (isCorrect) setScore(s => s + 1);

    const ansRcd = {
      kc_id: questions[currentIdx].kc_id,
      is_correct: isCorrect
    };

    setAnswers(prev => [...prev, ansRcd]);
    setTotalAnswered(prev => prev + 1);

    // --- Optimistic BKT Update (Instant UI Feedback) ---
    const kcId = questions[currentIdx].kc_id;
    const p_prev = kcMasteryMap[kcId] || 0.1;
    const P_GUESS = 0.25;
    const P_SLIP = 0.1;
    const P_TRANSIT = 0.1;

    let p_obs;
    if (isCorrect) {
      p_obs = (p_prev * (1 - P_SLIP)) / ((p_prev * (1 - P_SLIP)) + ((1 - p_prev) * P_GUESS));
    } else {
      p_obs = (p_prev * P_SLIP) / ((p_prev * P_SLIP) + ((1 - p_prev) * (1 - P_GUESS)));
    }

    let p_new = p_obs + ((1 - p_obs) * P_TRANSIT);
    if (p_new > 0.99) p_new = 0.99;
    if (p_new < 0.01) p_new = 0.01;

    const updatedMap = { ...kcMasteryMap, [kcId]: p_new };
    setKcMasteryMap(updatedMap);

    const sumMastery = selectedComponents.reduce((acc, id) => acc + (updatedMap[id] || 0.1), 0);
    const avgMastery = sumMastery / selectedComponents.length;
    setAverageMastery(avgMastery * 100);

    // --- Fire and forget submission to natively sync with DB ---
    try {
      const res = await api.post('/quiz/submit', {
        answers: [ansRcd],
        selected_kc_ids: selectedComponents
      });
      if (res.ok && res.data && res.data.kcs) {
        // Backend returned authoritative values, optionally sync if needed (though math matches)
        const allMastered = res.data.kcs.every(kc => kc.mastery_prob >= 0.90);
        if (allMastered) {
          setIsMasteryReached(true);
        } else if (questions.length - currentIdx <= 4 && !isPrefetching) {
          // Silently prefetch the next batch in the background to ensure fluent UX
          setIsPrefetching(true);
          api.post('/quiz/generate', { kc_ids: selectedComponents }).then(nextBatch => {
            if (nextBatch.ok && nextBatch.data && nextBatch.data.length > 0) {
              setQuestions(prev => [...prev, ...nextBatch.data]);
            }
            setIsPrefetching(false);
          });
        }
      }
    } catch (e) {
      console.error("Single answer sync failed", e);
    }
  };

  const handleNext = async () => {
    if (isMasteryReached) {
      setQuizFinished(true); // Complete automatically if we hit peak mastery!
      return;
    }

    if (currentIdx < questions.length - 1) {
      setCurrentIdx(i => i + 1);
      setSelectedOption(null);
      setShowResult(false);
    } else {
      // Edge case: they answered so incredibly fast that the background prefetch hasn't finished yet.
      if (isPrefetching) return; // Do nothing, let the inline button block it temporarily

      // Fallback: If prefetch failed or didn't trigger, fetch once more synchronously
      setIsPrefetching(true);
      try {
        const nextBatch = await api.post('/quiz/generate', { kc_ids: selectedComponents });
        if (nextBatch.ok && nextBatch.data && nextBatch.data.length > 0) {
          setQuestions(prev => [...prev, ...nextBatch.data]);
          setCurrentIdx(i => i + 1);
          setSelectedOption(null);
          setShowResult(false);
        } else {
          setQuizFinished(true); // Fallback if no questions
        }
      } catch (err) {
        console.error("Failed to generate more quiz questions:", err);
        setQuizFinished(true);
      } finally {
        setIsPrefetching(false);
      }
    }
  };

  const handleManualEnd = () => {
    setQuizFinished(true);
  };

  /* ─────────────────────────────────────────
     LOADING  — clean spinner card
  ───────────────────────────────────────── */
  if (loading) {
    return (
      <div style={{
        minHeight: '80vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '48px 40px',
          textAlign: 'center',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.06), 0 20px 50px rgba(0,0,0,0.07)',
          border: '1px solid #e2e8f0',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px',
          minWidth: '260px'
        }}>
          {/* Circle spinner */}
          <div style={{
            width: '52px', height: '52px',
            borderRadius: '50%',
            border: '4px solid #e2e8f0',
            borderTopColor: '#3b82f6',
            animation: 'spinCircle 0.8s linear infinite'
          }} />

          {/* Label */}
          <p style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0B1F3A' }}>
            {t.quizGenerating || 'Generating quiz'}
          </p>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────
     ERROR STATE
  ───────────────────────────────────────── */
  if (error || questions.length === 0) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{
          background: 'white', borderRadius: '20px', padding: '48px 40px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.06), 0 20px 50px rgba(0,0,0,0.07)',
          border: '1px solid #e2e8f0',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px',
          maxWidth: '800px', width: '100%', textAlign: 'center'
        }}>
          <h2 style={{ color: '#0B1F3A', fontSize: '19px', fontWeight: '700', margin: '0 0 8px 0', letterSpacing: '-0.2px' }}>
            {t.quizFailed || 'Quiz generation failed'}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '13.5px', margin: '0 0 4px 0', lineHeight: '1.6' }}>
            {error}
          </p>

          <button onClick={navigateBack} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '11px 24px', borderRadius: '10px',
            background: '#0B1F3A', border: 'none',
            color: 'white', fontSize: '14px', fontWeight: '600',
            cursor: 'pointer', letterSpacing: '0.1px', transition: 'opacity 0.2s'
          }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <ArrowLeft size={15} style={{ transform: isRtl ? 'scaleX(-1)' : 'none' }} /> {t.quizBackToCourse || 'Back to Course'}
          </button>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────
     RESULTS  — clean scorecard
  ───────────────────────────────────────── */
  if (quizFinished) {
    const actTotal = Math.max(totalAnswered, 1); // Avoid division by zero
    const pct = Math.round((score / actTotal) * 100);

    const config =
      pct >= 80 ? { label: t.quizOutstanding || 'Outstanding!', icon: Trophy, color: '#10b981', bg: '#f0fdf4', msg: t.quizOutstandingMsg || 'You have mastered these concepts!' } :
        pct >= 50 ? { label: t.quizGoodEffort || 'Good Effort!', icon: CheckCircle2, color: '#f59e0b', bg: '#fffbeb', msg: t.quizGoodEffortMsg || 'You are on the right track, keep going!' } :
          { label: t.quizKeepPracticing || 'Keep Practicing', icon: AlertCircle, color: '#ef4444', bg: '#fef2f2', msg: t.quizKeepPracticingMsg || 'Review the materials and try again.' };

    const ScoreIcon = config.icon;

    // Build the Knowledge Breakdown
    const breakdownMap = {};
    answers.forEach((ans) => {
      const kcId = ans.kc_id;
      if (!breakdownMap[kcId]) breakdownMap[kcId] = { correct: 0, total: 0 };
      breakdownMap[kcId].total += 1;
      if (ans.is_correct) breakdownMap[kcId].correct += 1;
    });

    // We try to find component data from either the local pre-quiz fetch or passed props
    const localBreakdown = Object.entries(breakdownMap).map(([id, stats]) => {
      const kcId = parseInt(id);
      const kcObj = componentMetadata?.find(c => c.id === kcId) || selectedComponentsData?.find(c => c.id === kcId);
      return {
        id,
        topic: kcObj ? (kcObj.topic || kcObj.text) : `Topic ${id}`,
        correct: stats.correct,
        total: stats.total,
        pct: Math.round((stats.correct / stats.total) * 100),
        masteryNow: Math.round((kcMasteryMap[id] || 0) * 100),
        masteryDelta: Math.round(((kcMasteryMap[id] || 0) - (startMasteryMap[id] || 0)) * 100)
      };
    });

    return (
      <div style={{ width: '96%', maxWidth: '1500px', margin: '0 auto', padding: '0 24px 60px', animation: 'fadeIn 0.4s ease' }}>

        <div style={{ display: 'flex', gap: '32px', alignItems: 'stretch', flexWrap: 'wrap' }}>

          {/* Left Column: Dynamic Score Card */}
          <div style={{ flex: '1', minWidth: '450px' }}>
            <div style={{ height: '100%', background: 'white', borderRadius: '24px', padding: '48px 40px', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07), 0 20px 60px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column' }}>

              <div style={{ width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 20px', background: config.bg, border: `2px solid ${config.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ScoreIcon size={32} color={config.color} strokeWidth={2} />
              </div>

              <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', margin: '0 0 8px 0' }}>{config.label}</h1>
              <p style={{ color: '#64748b', fontSize: '18px', margin: '0 0 32px 0', fontWeight: '500' }}>{config.msg}</p>

              <div style={{ width: '200px', height: '200px', borderRadius: '50%', margin: '0 auto 32px', background: `conic-gradient(${config.color} ${pct * 3.6}deg, #f1f5f9 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 0 10px white, 0 0 0 14px ${config.color}15` }}>
                <div style={{ width: '160px', height: '160px', borderRadius: '50%', background: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '42px', fontWeight: '900', color: '#0f172a', lineHeight: 1 }}>{pct}%</span>
                  <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', marginTop: '6px', letterSpacing: '0.5px' }}>{t.quizScore || 'QUIZ SCORE'}</span>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
                {[
                  { label: t.quizCorrect || 'Correct', val: score, color: '#10b981', bg: '#f0fdf4' },
                  { label: t.quizWrong || 'Wrong', val: totalAnswered - score, color: '#ef4444', bg: '#fef2f2' },
                  { label: t.quizTotal || 'Total', val: totalAnswered, color: '#3b82f6', bg: '#eff6ff' },
                ].map((s, i) => (
                  <div key={i} style={{ flex: 1, padding: '24px 12px', borderRadius: '16px', background: s.bg, border: '1px solid rgba(0,0,0,0.02)' }}>
                    <div style={{ fontSize: '36px', fontWeight: '900', color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', marginTop: '6px' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <button onClick={navigateBack} style={{ width: '100%', padding: '18px', borderRadius: '16px', background: '#0f172a', color: 'white', border: 'none', fontSize: '18px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 10px 25px rgba(15,23,42,0.2)' }}>
                <ArrowLeft size={20} style={{ transform: isRtl ? 'scaleX(-1)' : 'none' }} /> {t.quizReturn || 'Return to Course'}
              </button>
            </div>
          </div>

          {/* Right Column: Breakdown Card */}
          {localBreakdown.length > 0 && (
            <div style={{ flex: '1.4', minWidth: '600px' }}>
              <div style={{ height: '100%', background: 'white', borderRadius: '24px', padding: '32px 28px', border: '1px solid #f1f5f9', boxShadow: '0 20px 50px rgba(0,0,0,.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BarChart2 size={26} color="#6366f1" />
                  </div>
                  <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '900', color: '#0f172a' }}>{t.quizKnowledgeBreakdown || 'Knowledge Breakdown'}</h2>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {localBreakdown.map((kc, i) => {
                    const kcColor = kc.pct >= 80 ? '#10b981' : kc.pct >= 50 ? '#f59e0b' : '#ef4444';

                    return (
                      <div key={i} style={{ padding: '28px', borderRadius: '20px', border: '1px solid #f1f5f9', background: '#fafbff', animation: `fadeIn 0.4s ease ${i * 80}ms both` }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '18px' }}>
                          <span style={{ fontSize: '20px', fontWeight: '900', color: '#1e293b', flex: 1, lineHeight: '1.4' }}>{kc.topic}</span>
                          <span style={{ fontSize: '14px', fontWeight: '900', padding: '6px 14px', borderRadius: '20px', background: `${kcColor}15`, color: kcColor, whiteSpace: 'nowrap' }}>
                            {kc.correct} / {kc.total} {t.quizCorrect || 'Correct'}
                          </span>
                        </div>

                        <div style={{ marginBottom: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                              {t.quizScore || 'Quiz Score'}: <span style={{ color: kcColor, fontSize: '18px' }}>{kc.pct}%</span>
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                              <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                                {t.quizMastery || 'Mastery'}: <span style={{ color: '#1e293b', fontSize: '18px' }}>{kc.masteryNow}%</span>
                                <span style={{
                                  marginLeft: '12px',
                                  color: kc.masteryDelta > 0 ? '#10b981' : (kc.masteryDelta < 0 ? '#ef4444' : '#64748b'),
                                  fontWeight: '900',
                                  fontSize: '15px',
                                  background: kc.masteryDelta > 0 ? '#f0fdf4' : (kc.masteryDelta < 0 ? '#fef2f2' : '#f8fafc'),
                                  padding: '4px 10px',
                                  borderRadius: '8px',
                                  border: `1px solid ${kc.masteryDelta > 0 ? '#bbf7d0' : (kc.masteryDelta < 0 ? '#fecaca' : '#e2e8f0')}`
                                }}>
                                  {kc.masteryDelta > 0 ? `↑ +${kc.masteryDelta}%` : (kc.masteryDelta < 0 ? `↓ ${kc.masteryDelta}%` : 'No Change (0%)')}
                                </span>
                              </span>
                            </div>
                          </div>
                          <Bar pct={kc.pct} color={kcColor} delay={i * 80 + 200} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────
     ACTIVE QUIZ — clean card design
  ───────────────────────────────────────── */
  const currentQ = questions[currentIdx];
  const LETTERS = ['A', 'B', 'C', 'D'];

  return (
    <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto', padding: '0 24px 40px', animation: 'fadeIn 0.3s ease' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px', paddingTop: '8px' }}>
        <button onClick={handleManualEnd} style={{
          width: '40px', height: '40px', borderRadius: '12px',
          background: 'white', border: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.2s'
        }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
        >
          <ArrowLeft size={18} color="#0B1F3A" style={{ transform: isRtl ? 'scaleX(-1)' : 'none' }} />
        </button>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: '800', color: '#0B1F3A', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              {t.quizQuestion || 'Question'} {currentIdx + 1}
            </span>
            <span style={{ fontSize: '13px', fontWeight: '800', color: '#10b981', background: '#f0fdf4', padding: '4px 12px', borderRadius: '20px', border: '1px solid #bbf7d0' }}>
              {Math.round(averageMastery)}% {t.quizMastery || 'Mastery'}
            </span>

          </div>
          <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', background: 'linear-gradient(90deg, #10b981, #34d399)',
              width: `${averageMastery}%`,
              transition: 'width 0.6s cubic-bezier(.4,0,.2,1)'
            }} />
          </div>
        </div>
      </div>

      {/* Main Question Card */}
      <div style={{
        background: 'white', borderRadius: '24px', padding: '40px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9',
        animation: 'slideUp 0.4s ease'
      }}>
        <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', lineHeight: '1.5', margin: '0 0 32px 0' }}>
          {currentQ.question}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {currentQ.options.map((opt, i) => {
            const isSelected = selectedOption === i;
            const isCorrect = i === currentQ.answer;
            const showAsCorrect = showResult && isCorrect;
            const showAsWrong = showResult && isSelected && !isCorrect;

            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                disabled={showResult}
                style={{
                  padding: '20px 24px', borderRadius: '16px',
                  textAlign: isRtl ? 'right' : 'left', fontSize: '16px', fontWeight: '600',
                  border: '2px solid',
                  borderColor: showAsCorrect ? '#10b981' : (showAsWrong ? '#ef4444' : (isSelected ? '#3b82f6' : '#f1f5f9')),
                  background: showAsCorrect ? '#f0fdf4' : (showAsWrong ? '#fef2f2' : (isSelected ? '#eff6ff' : 'white')),
                  color: showAsCorrect ? '#065f46' : (showAsWrong ? '#991b1b' : (isSelected ? '#1e40af' : '#1e293b')),
                  cursor: showResult ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '16px',
                  transition: 'all 0.2s ease',
                  position: 'relative', overflow: 'hidden'
                }}
              >
                <div style={{
                  width: '32px', height: '32px', borderRadius: '10px',
                  background: showAsCorrect ? '#10b981' : (showAsWrong ? '#ef4444' : (isSelected ? '#3b82f6' : '#f1f5f9')),
                  color: isSelected || showResult ? 'white' : '#64748b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', fontWeight: '800', flexShrink: 0
                }}>
                  {showAsCorrect ? <CheckCircle2 size={18} /> : (showAsWrong ? <XCircle size={18} /> : LETTERS[i])}
                </div>
                <span style={{ flex: 1 }}>{opt}</span>
              </button>
            );
          })}
        </div>

        {showResult && (
          <div style={{ marginTop: '32px', animation: 'fadeIn 0.3s ease' }}>
            <button
              onClick={handleNext}
              style={{
                width: '100%', padding: '18px', borderRadius: '16px',
                background: '#0f172a', color: 'white', border: 'none',
                fontSize: '16px', fontWeight: '700', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                boxShadow: '0 10px 25px rgba(15,23,42,0.2)', transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              {isMasteryReached ? (t.quizFinish || 'Finish Quiz') : (currentIdx < questions.length - 1 ? (t.quizNext || 'Next Question') : (isPrefetching ? (t.quizLoadingMore || 'Loading more...') : (t.quizMoreQuestions || 'More Questions')))}
              {!isMasteryReached && <ChevronRight size={20} style={{ transform: isRtl ? 'scaleX(-1)' : 'none' }} />}
            </button>
          </div>
        )}

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', animation: 'fadeIn 0.3s ease' }}>
          <button
            onClick={handleManualEnd}
            style={{
              background: 'transparent',
              color: '#ef4444',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.textDecoration = 'underline'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.textDecoration = 'none'; }}
          >
            {t.endQuiz || 'End Quiz'}
          </button>
        </div>
      </div>
    </div>
  );
}

