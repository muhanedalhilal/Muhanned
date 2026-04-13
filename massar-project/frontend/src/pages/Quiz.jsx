import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Loader2, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';

export default function Quiz({ t, setCurrentPage, selectedComponents }) {
  const navigateBack = () => setCurrentPage('dashboard');

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
      setError("No components selected for the quiz.");
      setLoading(false);
      return;
    }

    const fetchQuiz = async () => {
      try {
        const response = await api.post('/quiz/generate', { kc_ids: selectedComponents });
        if (response.ok && response.data && response.data.length > 0) {
          setQuestions(response.data);
        } else {
          setError(response.message || "Could not generate quiz. Your AI might be overloaded or an error occurred.");
        }
      } catch (err) {
        setError(err.message || "Failed to connect to the quiz engine.");
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [selectedComponents]);

  const handleSelectOption = (idx) => {
    if (showResult) return;
    setSelectedOption(idx);
    setShowResult(true);
    if (idx === questions[currentIdx].answer) {
      setScore(s => s + 1);
    }
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

  if (loading) {
    return (
      <div className="dashboard-section command-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={64} className="spin-icon-slow" color="#3b82f6" style={{ marginBottom: '20px' }} />
        <h2 style={{ color: 'black' }}>Generating Adaptive Quiz...</h2>
        <p style={{ color: '#64748b' }}>Crafting intelligent questions based on your selections.</p>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="dashboard-section command-center">
         <button className="btn-luxe" onClick={navigateBack} style={{ marginBottom: '20px', background: 'rgba(0,0,0,0.05)', color: 'black' }}>
            <ArrowLeft size={18} /> Go Back
          </button>
        <div className="empty-state" style={{ padding: '40px', background: 'white' }}>
          <h2 style={{ color: '#ef4444' }}>Quiz Generation Failed</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (quizFinished) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="dashboard-section command-center">
        <div className="luxe-panel" style={{ maxWidth: '600px', margin: '40px auto', textAlign: 'center', padding: '40px' }}>
          <h1 style={{ color: 'black', fontSize: '36px', marginBottom: '20px' }}>Quiz Complete</h1>
          <div style={{ position: 'relative', width: '150px', height: '150px', margin: '0 auto 30px' }}>
             <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%' }}>
               <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e2e8f0" strokeWidth="3" />
               <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={percentage >= 50 ? "#10b981" : "#ef4444"} strokeWidth="3" strokeDasharray={`${percentage}, 100`} />
             </svg>
             <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold', color: 'black' }}>
                {percentage}%
             </div>
          </div>
          <p style={{ color: '#64748b', fontSize: '18px', marginBottom: '30px' }}>You scored {score} out of {questions.length} accurately.</p>
          <button className="btn-luxe primary" onClick={navigateBack} style={{ width: '100%', justifyContent: 'center' }}>
            <ArrowLeft size={18} /> Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIdx];

  return (
    <div className="dashboard-section command-center">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <button className="btn-luxe" onClick={navigateBack} style={{ background: 'rgba(0,0,0,0.05)', color: 'black', border: '1px solid rgba(0,0,0,0.1)' }}>
          <ArrowLeft size={18} /> End Quiz
        </button>
        <span style={{ color: '#3b82f6', fontWeight: 'bold', background: 'rgba(59, 130, 246, 0.1)', padding: '6px 16px', borderRadius: '20px' }}>
          Question {currentIdx + 1} of {questions.length}
        </span>
      </div>

      <div className="luxe-panel" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px' }}>
        <h2 style={{ color: 'black', fontSize: '24px', lineHeight: '1.4', marginBottom: '30px' }}>
          {currentQ.question}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {currentQ.options.map((opt, idx) => {
            let bgColor = 'rgba(0,0,0,0.03)';
            let borderColor = 'rgba(0,0,0,0.08)';
            let icon = null;

            if (showResult) {
              if (idx === currentQ.answer) {
                bgColor = 'rgba(16, 185, 129, 0.1)';
                borderColor = '#10b981';
                icon = <CheckCircle2 color="#10b981" size={20} />;
              } else if (idx === selectedOption) {
                bgColor = 'rgba(239, 68, 68, 0.1)';
                borderColor = '#ef4444';
                icon = <XCircle color="#ef4444" size={20} />;
              }
            } else if (selectedOption === idx) {
              borderColor = '#3b82f6';
              bgColor = 'rgba(59, 130, 246, 0.05)';
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelectOption(idx)}
                disabled={showResult}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '20px', borderRadius: '12px',
                  background: bgColor, border: `2px solid ${borderColor}`,
                  cursor: showResult ? 'default' : 'pointer',
                  transition: '0.2s', textAlign: 'left', color: '#1e293b', fontSize: '16px', fontWeight: '500'
                }}
              >
                <span>{opt}</span>
                {icon}
              </button>
            );
          })}
        </div>

        {showResult && (
          <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end' }}>
             <button className="btn-luxe primary hover-lift" onClick={handleNext} style={{ padding: '12px 30px', fontSize: '16px' }}>
                {currentIdx < questions.length - 1 ? 'Next Question' : 'View Results'}
             </button>
          </div>
        )}
      </div>
    </div>
  );
}
