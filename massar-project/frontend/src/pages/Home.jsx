import React from 'react';
import { Target, Map, BookOpen, Award, BrainCircuit, ActivitySquare, GitMerge, ArrowRight, Zap } from 'lucide-react';

export default function Home({ t, goSignUp, isLoggedIn, setCurrentPage }) {
  return (
    <div className="home-container">
      <div className="hero-section">
        <h1 className="hero-title">{t.heroTitle}</h1>
        <p className="hero-subtitle">{t.heroSubtitle}</p>
        <div className="hero-buttons">
          {!isLoggedIn && (
            <button className="action-btn glow" onClick={goSignUp}>
              {t.startLearning}
            </button>
          )}
        </div>
      </div>

      <div className="growth-blossom-container">
        <div className="blossom-system">

          {/* Central Heart of the Blossom with Massar Logo */}
          <div className="blossom-heart">
            <div className="heart-pulse pulse-1"></div>
            <div className="heart-pulse pulse-2"></div>
            <div className="heart-core-logo">
              <img src="/logo.png" alt="Massar Logo" className="hub-logo" />
            </div>
          </div>

          <div className="blossom-petal petal-top-left">
            <div className="petal-glass opaque">
              <Target size={32} className="p-icon" />
              <div className="p-text">
                <h5>{t.n1 || 'Real-time Analytics'}</h5>
                <p>{t.n1Desc}</p>
              </div>
            </div>
          </div>

          <div className="blossom-petal petal-top-right">
            <div className="petal-glass opaque">
              <Map size={32} className="p-icon" />
              <div className="p-text">
                <h5>{t.n2 || 'Knowledge Tracing'}</h5>
                <p>{t.n2Desc}</p>
              </div>
            </div>
          </div>

          <div className="blossom-petal petal-bot-left">
            <div className="petal-glass opaque">
              <BookOpen size={32} className="p-icon" />
              <div className="p-text">
                <h5>{t.n3 || 'Adaptive Pathing'}</h5>
                <p>{t.n3Desc}</p>
              </div>
            </div>
          </div>

          <div className="blossom-petal petal-bot-right">
            <div className="petal-glass opaque">
              <Award size={32} className="p-icon" />
              <div className="p-text">
                <h5>{t.n4 || 'Mastery Evaluation'}</h5>
                <p>{t.n4Desc}</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="adaptive-features">
        <div className="luxe-grid">
          <div className="luxe-card feature-card">
            <div className="card-top">
              <div className="icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.2)' }}>
                <BrainCircuit size={28} color="#60a5fa" />
              </div>
            </div>
            <h3 className="feature-title">{t.feat1Title || 'AI Assessment'}</h3>
            <p className="feature-desc">{t.feat1Desc}</p>
          </div>

          <div className="luxe-card feature-card">
            <div className="card-top">
              <div className="icon-wrapper" style={{ background: 'rgba(147, 51, 234, 0.2)' }}>
                <GitMerge size={28} color="#c084fc" />
              </div>
            </div>
            <h3 className="feature-title">{t.feat2Title || 'Skill Trees'}</h3>
            <p className="feature-desc">{t.feat2Desc}</p>
          </div>

          <div className="luxe-card feature-card">
            <div className="card-top">
              <div className="icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.2)' }}>
                <ActivitySquare size={28} color="#34d399" />
              </div>
            </div>
            <h3 className="feature-title">{t.feat3Title || 'Tracking'}</h3>
            <p className="feature-desc">{t.feat3Desc}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
