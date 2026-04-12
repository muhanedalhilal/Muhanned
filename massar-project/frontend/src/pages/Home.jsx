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
        <div className="section-label"><Eye size={14} /> {t.visionLabel}</div>
        <h2 className="section-title">
          {t.visionTitleMain} <span className="gradient-text">{t.visionTitleHighlight}</span>
        </h2>
        <p className="section-subtitle">
          {t.visionSubtitle}
        </p>

        <div className="vision-grid">
          <div className="vision-card">
            <div className="vision-icon-wrap blue">
              <Eye size={28} color="#60a5fa" />
            </div>
            <h3>{t.visionCard1Title}</h3>
            <p>{t.visionCard1Text}</p>
          </div>

          <div className="vision-card vision-card-center">
            <div className="vision-icon-wrap purple">
              <Lightbulb size={28} color="#c084fc" />
            </div>
            <h3>{t.visionCard2Title}</h3>
            <p>{t.visionCard2Text}</p>
          </div>

          <div className="vision-card">
            <div className="vision-icon-wrap green">
              <Users size={28} color="#34d399" />
            </div>
            <h3>{t.visionCard3Title}</h3>
            <p>{t.visionCard3Text}</p>
          </div>
        </div>
      </div>

      {/* ── FEATURE CARDS ────────────────────────────────────── */}
      <div className="adaptive-features">
        <h2 className="section-title">{t.engineTitle}</h2>
        <div className="luxe-grid">
          {[
            { Icon: BrainCircuit, color: '#60a5fa', bg: 'rgba(59,130,246,0.15)', title: t.feat1Title, desc: t.feat1Desc },
            { Icon: GitMerge, color: '#c084fc', bg: 'rgba(147,51,234,0.15)', title: t.feat2Title, desc: t.feat2Desc },
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
        <div className="section-label"><TrendingUp size={14} /> {t.processLabel}</div>
        <h2 className="section-title">{t.howItWorksTitle}</h2>
        <div className="how-steps">
          {[
            { num: '01', title: t.step1Title, desc: t.step1Desc },
            { num: '02', title: t.step2Title, desc: t.step2Desc },
            { num: '03', title: t.step3Title, desc: t.step3Desc },
            { num: '04', title: t.step4Title, desc: t.step4Desc },
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
        <div className="section-label"><Users size={14} /> {t.peopleLabel}</div>
        <h2 className="section-title">{t.teamTitle}</h2>
        <div className="team-grid">
          {[
            { name: 'Saeed Abdulrahman Alzahrani', role: t.teamRolePM, img: 'https://pkngqwjvekvolmirldgw.supabase.co/storage/v1/object/public/team/saeed.jpg' },
            { name: 'Mujahid Bandar Alshehri', role: t.teamRoleBackend, img: 'https://pkngqwjvekvolmirldgw.supabase.co/storage/v1/object/public/team/mujahid.jpg' },
            { name: 'Muhaned Mohammed Alhilal', role: t.teamRoleFrontend, img: 'https://pkngqwjvekvolmirldgw.supabase.co/storage/v1/object/public/team/muhaned.jpg' },
            { name: 'Mohammed Tareq Althumairy', role: t.teamRoleFrontend, img: 'https://pkngqwjvekvolmirldgw.supabase.co/storage/v1/object/public/team/mohammed.jpg' },
          ].map(({ name, role, img }) => (
            <div className="team-card" key={name}>
              <div className="team-avatar-wrapper">
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
            <h2>{t.ctaReady}</h2>
            <p>{t.ctaJoin}</p>
            <div className="cta-checks">
              {[t.ctaFree, t.ctaNoCard, t.ctaBilingual].map(c => (
                <span key={c} className="cta-check"><CheckCircle size={16} color="#34d399" /> {c}</span>
              ))}
            </div>
            <button className="action-btn glow cta-btn" onClick={goSignUp}>
              {t.startLearning} <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
