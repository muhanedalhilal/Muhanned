export default function Home({ t, goSignUp, isLoggedIn }) {
  return (
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
  );
}
