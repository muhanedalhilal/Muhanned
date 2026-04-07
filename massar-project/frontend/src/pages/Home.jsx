import React from 'react';
import {
  Target, Map, BookOpen, Award, BrainCircuit, ActivitySquare,
  GitMerge, ArrowRight, Zap, Eye, Lightbulb, Users, TrendingUp,
  CheckCircle, Star, ChevronDown
} from 'lucide-react';

export default function Home({ t, goSignUp, isLoggedIn, setCurrentPage }) {

  const scrollToNext = () => {
    window.scrollBy({ top: window.innerHeight * 0.85, behavior: 'smooth' });
  };


  return (
    <div className="home-container">

      {/* ── HERO SECTION ─────────────────────────────────────── */}
      <div className="hero-section">
        <div className="hero-badge">
          <Zap size={14} />
          <span>Powered by Bayesian Knowledge Tracing (BKT)</span>
        </div>
        <h1 className="hero-title">{t.heroTitle}</h1>
        <p className="hero-subtitle">{t.heroSubtitle}</p>
        <div className="hero-buttons">
          {!isLoggedIn && (
            <>
              <button className="action-btn glow" onClick={goSignUp}>
                {t.startLearning} <ArrowRight size={18} style={{ marginLeft: 8 }} />
              </button>
              <button className="action-btn-outline" onClick={() => setCurrentPage('auth')}>
                {t.login}
              </button>
            </>
          )}
          {isLoggedIn && (
            <button className="action-btn glow" onClick={() => setCurrentPage('dashboard')}>
              {t.dashboard} <ArrowRight size={18} style={{ marginLeft: 8 }} />
            </button>
          )}
        </div>
        <button className="scroll-hint" onClick={scrollToNext}>
          <ChevronDown size={22} />
        </button>
      </div>





      {/* ── VISION & MISSION ─────────────────────────────────── */}
      <div className="vision-section">
        <div className="section-label"><Eye size={14} /> Our Vision</div>
        <h2 className="section-title">
          Education That Thinks <span className="gradient-text">With You</span>
        </h2>
        <p className="section-subtitle">
          We believe every student deserves a learning experience as unique as their mind.
          Massar was built to eliminate the "one-size-fits-all" approach by placing
          cognitive science and artificial intelligence at the heart of every lesson.
        </p>

        <div className="vision-grid">
          <div className="vision-card">
            <div className="vision-icon-wrap blue">
              <Eye size={28} color="#60a5fa" />
            </div>
            <h3>Our Vision</h3>
            <p>
              A world where no student is left behind because the system couldn't adapt.
              We envision AI-powered education as the great equalizer — available to
              every student, everywhere.
            </p>
          </div>

          <div className="vision-card vision-card-center">
            <div className="vision-icon-wrap purple">
              <Lightbulb size={28} color="#c084fc" />
            </div>
            <h3>Our Mission</h3>
            <p>
              To build the most intelligent adaptive learning engine ever deployed —
              one that continuously learns how you learn, and builds a curriculum that
              meets you exactly where you are.
            </p>
          </div>

          <div className="vision-card">
            <div className="vision-icon-wrap green">
              <Users size={28} color="#34d399" />
            </div>
            <h3>Our Values</h3>
            <p>
              Transparency in AI, fairness in assessment, and relentless pursuit of
              mastery. We measure our success by how far each student travels from
              where they started.
            </p>
          </div>
        </div>
      </div>

      {/* ── FEATURE CARDS ────────────────────────────────────── */}
      <div className="adaptive-features">
        <div className="section-label"><Zap size={14} /> Core Engine</div>
        <h2 className="section-title">{t.engineTitle}</h2>
        <div className="luxe-grid">
          {[
            { Icon: BrainCircuit, color: '#60a5fa', bg: 'rgba(59,130,246,0.15)', title: t.feat1Title, desc: t.feat1Desc },
            { Icon: GitMerge,     color: '#c084fc', bg: 'rgba(147,51,234,0.15)',  title: t.feat2Title, desc: t.feat2Desc },
            { Icon: ActivitySquare, color: '#34d399', bg: 'rgba(16,185,129,0.15)', title: t.feat3Title, desc: t.feat3Desc },
          ].map(({ Icon, color, bg, title, desc }, i) => (
            <div className="luxe-card feature-card" key={i}>
              <div className="card-top">
                <div className="icon-wrapper" style={{ background: bg }}>
                  <Icon size={28} color={color} />
                </div>
              </div>
              <h3 className="feature-title">{title}</h3>
              <p className="feature-desc">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <div className="how-section">
        <div className="section-label"><TrendingUp size={14} /> Process</div>
        <h2 className="section-title">How Massar Works</h2>
        <div className="how-steps">
          {[
            { num: '01', title: 'You Start Learning', desc: 'Begin any module. Massar silently observes how you interact with content and problems.' },
            { num: '02', title: 'AI Builds Your Model', desc: 'Our BKT engine calculates your real knowledge probability per topic — not just a score.' },
            { num: '03', title: 'Path Adapts Instantly', desc: 'Content difficulty, order, and type are dynamically adjusted based on your live model.' },
            { num: '04', title: 'Mastery Is Proven', desc: 'You advance only when the system is statistically confident you\'ve truly mastered the concept.' },
          ].map(({ num, title, desc }) => (
            <div className="how-step" key={num}>
              <div className="how-num">{num}</div>
              <div className="how-connector" />
              <div className="how-content">
                <h4>{title}</h4>
                <p>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* ── TEAM SECTION ─────────────────────────────────────── */}
      <div className="team-section">
        <div className="section-label"><Users size={14} /> Our People</div>
        <h2 className="section-title">Meet The Team</h2>
        <div className="team-grid">
          {[
            { name: 'Saeed Abdulrahman Alzahrani', role: 'Project Manager', img: '/team/saeed.jpg' },
            { name: 'Mujahid Bandar Alshehri', role: 'Backend Infrastructure', img: '/team/mujahid.jpg' },
            { name: 'Muhaned Mohammed Alhilal', role: 'Frontend Engineering', img: '/team/muhaned.jpg' },
            { name: 'Mohammed Tareq Althumairy', role: 'Frontend Engineering', img: '/team/mohammed.jpg' },
          ].map(({ name, role, img }) => (
            <div className="team-card" key={name}>
              <div className="team-avatar-wrapper">
                {/* Fallback to initials if the image is missing */}
                <div className="team-avatar-fallback">
                  {name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </div>
                <img 
                  src={img} 
                  alt={name} 
                  className="team-avatar" 
                  onError={(e) => { e.target.style.display = 'none'; }} 
                />
              </div>
              <h4 className="team-name">{name}</h4>
              <p className="team-role">{role}</p>
            </div>
          ))}
        </div>
      </div>


      {/* ── FINAL CTA ────────────────────────────────────────── */}
      {!isLoggedIn && (
        <div className="cta-section">
          <div className="cta-glow" />
          <div className="cta-content">
            <h2>Ready to Master Anything?</h2>
            <p>Join thousands of students building real knowledge — not just passing grades.</p>
            <div className="cta-checks">
              {['Free to start', 'No credit card required', 'Bilingual (AR/EN)'].map(c => (
                <span key={c} className="cta-check"><CheckCircle size={16} color="#34d399" /> {c}</span>
              ))}
            </div>
            <button className="action-btn glow cta-btn" onClick={goSignUp}>
              Start Learning Now <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
