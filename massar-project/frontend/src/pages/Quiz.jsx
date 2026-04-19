import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';

export default function Quiz({ t, setCurrentPage, selectedComponents, selectedCourseId, setSelectedCourseId }) {

  // Go back to the course detail view (not command center)
  const navigateBack = () => {
    setCurrentPage('dashboard');
    // selectedCourseId stays set → Dashboard will show the course view
  };

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  useEffect(() => {
    if (selectedComponents.length === 0) {
      setError('No components selected for the quiz.');
      setLoading(false);
      return;
    }
    const fetchQuiz = async () => {
      try {
        const response = await api.post('/quiz/generate', { kc_ids: selectedComponents });
        if (response.ok && response.data && response.data.length > 0) {
          setQuestions(response.data);
        } else {
          setError(response.message || 'Could not generate quiz.');
        }
      } catch (err) {
        setError(err.message || 'Failed to connect to the quiz engine.');
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [selectedComponents]);

  const handleSelect = (idx) => {
    if (showResult) return;
    setSelectedOption(idx);
    setShowResult(true);
    if (idx === questions[currentIdx].answer) setScore(s => s + 1);
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(i => i + 1);
      setSelectedOption(null);
      setShowResult(false);
    } else {
      setQuizFinished(true);
    }
  };

  /* ─────────────────────────────────────────
     LOADING  — Duolingo-style bar animation
  ───────────────────────────────────────── */
  if (loading) {
    return (
      <div style={{
        minHeight: '80vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '40px',
        padding: '20px'
      }}>

        {/* Icon block */}
        <div style={{
          width: '72px', height: '72px', borderRadius: '20px',
          background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 12px 40px rgba(79,70,229,0.35)',
          fontSize: '32px'
        }}>
          🧠
        </div>

        {/* Text */}
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#0f172a', fontSize: '22px', fontWeight: '800', margin: '0 0 6px 0', letterSpacing: '-0.3px' }}>
            Building your quiz
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
            AI is crafting questions from {selectedComponents.length} topic{selectedComponents.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Animated equalizer bars */}
        <div style={{ display: 'flex', gap: '5px', alignItems: 'flex-end', height: '36px' }}>
          {[1, 0.5, 0.8, 0.3, 1, 0.6, 0.9, 0.4, 0.7, 1].map((h, i) => (
            <div key={i} style={{
              width: '5px',
              borderRadius: '3px',
              background: `hsl(${240 + i * 8}, 70%, 60%)`,
              animation: `quizBar 0.9s ease-in-out infinite alternate`,
              animationDelay: `${i * 0.09}s`,
              height: `${h * 36}px`,
            }} />
          ))}
        </div>

      </div>
    );
  }

  /* ─────────────────────────────────────────
     ERROR STATE
  ───────────────────────────────────────── */
  if (error || questions.length === 0) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px', padding: '20px' }}>
        <div style={{ fontSize: '48px' }}>😕</div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#0f172a', fontSize: '20px', fontWeight: '800', margin: '0 0 8px 0' }}>Quiz generation failed</h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: '0 0 24px 0', maxWidth: '320px' }}>{error}</p>
        </div>
        <button onClick={navigateBack} style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '10px 22px', borderRadius: '10px',
          background: '#f1f5f9', border: '1px solid #e2e8f0',
          color: '#1e293b', fontSize: '14px', fontWeight: '600', cursor: 'pointer'
        }}>
          <ArrowLeft size={16} /> Back to Course
        </button>
      </div>
    );
  }

  /* ─────────────────────────────────────────
     RESULTS  — clean scorecard
  ───────────────────────────────────────── */
  if (quizFinished) {
    const pct = Math.round((score / questions.length) * 100);
    const isGreat = pct >= 80;
    const emoji = pct >= 80 ? '🏆' : pct >= 50 ? '💪' : '📖';
    const msg = pct >= 80 ? 'Excellent work!' : pct >= 50 ? 'Good effort — keep going!' : 'Keep studying, you\'ll get there!';
    const accent = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';

    return (
      <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', animation: 'fadeIn 0.4s ease' }}>
        <div style={{
          background: 'white', borderRadius: '24px', padding: '48px 40px',
          maxWidth: '440px', width: '100%', textAlign: 'center',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07), 0 20px 60px rgba(0,0,0,0.06)',
          border: '1px solid #f1f5f9'
        }}>
          <div style={{ fontSize: '52px', marginBottom: '16px' }}>{emoji}</div>
          <h1 style={{ fontSize: '26px', fontWeight: '900', color: '#0f172a', margin: '0 0 6px 0' }}>Quiz Complete</h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: '0 0 32px 0' }}>{msg}</p>

          {/* Score circle */}
          <div style={{
            width: '110px', height: '110px', borderRadius: '50%', margin: '0 auto 28px',
            background: `conic-gradient(${accent} ${pct * 3.6}deg, #f1f5f9 0deg)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 0 8px white, 0 0 0 10px ${accent}22`
          }}>
            <div style={{
              width: '86px', height: '86px', borderRadius: '50%', background: 'white',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
            }}>
              <span style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a', lineHeight: 1 }}>{pct}%</span>
              <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', marginTop: '2px' }}>score</span>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
            {[
              { label: 'Correct', val: score, color: '#10b981', bg: '#f0fdf4' },
              { label: 'Wrong', val: questions.length - score, color: '#ef4444', bg: '#fef2f2' },
              { label: 'Total', val: questions.length, color: '#3b82f6', bg: '#eff6ff' },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, padding: '14px 8px', borderRadius: '14px', background: s.bg }}>
                <div style={{ fontSize: '22px', fontWeight: '900', color: s.color }}>{s.val}</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          <button onClick={navigateBack} style={{
            width: '100%', padding: '14px', borderRadius: '14px',
            background: '#0f172a', color: 'white',
            border: 'none', fontSize: '15px', fontWeight: '700',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            transition: 'opacity 0.2s'
          }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <ArrowLeft size={16} /> Return to Course
          </button>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────
     ACTIVE QUIZ — clean card design
  ───────────────────────────────────────── */
  const currentQ = questions[currentIdx];
  const progress = (currentIdx / questions.length) * 100;
  const LETTERS = ['A', 'B', 'C', 'D'];

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 16px 40px', animation: 'fadeIn 0.3s ease' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px', paddingTop: '8px' }}>
        <button onClick={navigateBack} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '8px 14px', borderRadius: '10px',
          background: 'white', border: '1px solid #e2e8f0',
          color: '#64748b', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)', flexShrink: 0
        }}>
          <ArrowLeft size={15} /> End
        </button>

        {/* Progress bar */}
        <div style={{ flex: 1, height: '8px', background: '#f1f5f9', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: '8px',
            background: 'linear-gradient(90deg, #4f46e5, #7c3aed)',
            width: `${progress}%`, transition: 'width 0.5s ease'
          }} />
        </div>

        <span style={{
          fontSize: '13px', fontWeight: '700', color: '#4f46e5',
          background: '#eef2ff', padding: '5px 12px', borderRadius: '20px', flexShrink: 0
        }}>
          {currentIdx + 1}/{questions.length}
        </span>
      </div>

      {/* Question card */}
      <div style={{
        background: 'white', borderRadius: '20px',
        border: '1px solid #f1f5f9',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 16px 40px rgba(0,0,0,0.04)',
        overflow: 'hidden'
      }}>
        {/* Question header */}
        <div style={{ padding: '28px 32px', borderBottom: '1px solid #f8fafc' }}>
          <div style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '6px', background: '#eef2ff', color: '#4f46e5', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>
            Question {currentIdx + 1}
          </div>
          <p style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a', lineHeight: '1.55' }}>
            {currentQ.question}
          </p>
        </div>

        {/* Options */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {currentQ.options.map((opt, idx) => {
            const isCorrect = idx === currentQ.answer;
            const isSelected = idx === selectedOption;

            let border = '1.5px solid #e2e8f0';
            let bg = '#fafafa';
            let textColor = '#334155';
            let letterBg = '#f1f5f9';
            let letterColor = '#64748b';
            let icon = null;

            if (showResult) {
              if (isCorrect) {
                border = '2px solid #10b981'; bg = '#f0fdf4'; textColor = '#064e3b';
                letterBg = '#10b981'; letterColor = 'white';
                icon = <CheckCircle2 size={18} color="#10b981" />;
              } else if (isSelected) {
                border = '2px solid #ef4444'; bg = '#fef2f2'; textColor = '#7f1d1d';
                letterBg = '#ef4444'; letterColor = 'white';
                icon = <XCircle size={18} color="#ef4444" />;
              }
            } else if (isSelected) {
              border = '2px solid #4f46e5'; bg = '#eef2ff'; textColor = '#312e81';
              letterBg = '#4f46e5'; letterColor = 'white';
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                disabled={showResult}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '14px 18px', borderRadius: '12px',
                  background: bg, border, cursor: showResult ? 'default' : 'pointer',
                  textAlign: 'left', transition: 'all 0.18s ease', width: '100%'
                }}
                onMouseEnter={e => { if (!showResult) { e.currentTarget.style.borderColor = '#c7d2fe'; e.currentTarget.style.background = '#f5f3ff'; } }}
                onMouseLeave={e => { if (!showResult && idx !== selectedOption) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fafafa'; } }}
              >
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                  background: letterBg, color: letterColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: '800', transition: 'all 0.18s'
                }}>
                  {LETTERS[idx]}
                </div>
                <span style={{ fontSize: '15px', fontWeight: '500', color: textColor, flex: 1, lineHeight: '1.4' }}>{opt}</span>
                {icon}
              </button>
            );
          })}
        </div>

        {/* Feedback + Next */}
        {showResult && (
          <div style={{ padding: '0 24px 24px', animation: 'fadeIn 0.25s ease' }}>
            <div style={{
              padding: '12px 16px', borderRadius: '10px', marginBottom: '16px',
              background: selectedOption === currentQ.answer ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${selectedOption === currentQ.answer ? '#bbf7d0' : '#fecaca'}`,
              display: 'flex', alignItems: 'flex-start', gap: '10px'
            }}>
              {selectedOption === currentQ.answer
                ? <CheckCircle2 size={17} color="#10b981" style={{ flexShrink: 0, marginTop: '1px' }} />
                : <XCircle size={17} color="#ef4444" style={{ flexShrink: 0, marginTop: '1px' }} />
              }
              <span style={{ fontSize: '13px', fontWeight: '600', color: selectedOption === currentQ.answer ? '#166534' : '#991b1b', lineHeight: '1.5' }}>
                {selectedOption === currentQ.answer
                  ? 'Correct! Great job.'
                  : `Incorrect. The correct answer is: ${currentQ.options[currentQ.answer]}`
                }
              </span>
            </div>

            <button onClick={handleNext} style={{
              width: '100%', padding: '13px', borderRadius: '12px',
              background: '#4f46e5', color: 'white',
              border: 'none', fontSize: '15px', fontWeight: '700',
              cursor: 'pointer', transition: 'opacity 0.2s'
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              {currentIdx < questions.length - 1 ? 'Next Question →' : 'View Results →'}
            </button>
          </div>
        )}
      </div>

      {/* Score pill */}
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>
          ✓ {score} correct so far
        </span>
      </div>

    </div>
  );
}
