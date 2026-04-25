import { useState, useEffect, useRef } from 'react';
import { BrainCircuit, Globe, Mail, MessageSquare } from 'lucide-react';

export default function Footer({ t, setCurrentPage }) {
  const [isVisible, setIsVisible] = useState(false);
  const footerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        } else {
          setIsVisible(false);
        }
      },
      { threshold: 0.1 }
    );

    if (footerRef.current) {
      observer.observe(footerRef.current);
    }

    return () => {
      if (footerRef.current) {
        observer.unobserve(footerRef.current);
      }
    };
  }, []);

  return (
    <footer 
      ref={footerRef}
      className={`professional-footer ${isVisible ? 'visible' : ''}`}
    >
      <div className="footer-top">
        <div className="footer-brand">
          <div className="footer-logo-row">
            <img 
              src="/logo.png" 
              alt="Massar Logo" 
              className="footer-logo-img"
              onError={(e) => { e.target.src = 'https://via.placeholder.com/32x32/2b4a8e/ffffff?text=M' }} 
            />
            <span className="footer-logo-text">{t.appName}</span>
          </div>
          <p className="footer-tagline">
            {t.footerTagline || 'Empowering the future through intelligent, adaptive AI education.'}
          </p>
        </div>
        
        <div className="footer-links-grid">
          <div className="footer-column">
            <h4>{t.footerSupport}</h4>
            <ul>
              <li><a href="#doc">{t.footerDocumentation}</a></li>
              <li><a href="#support">{t.footerSupportCenter}</a></li>
            </ul>
          </div>

          <div className="footer-column">
            <h4>{t.footerCompany}</h4>
            <ul>
              <li>
                <a 
                  href="#about"
                  onClick={(e) => {
                    e.preventDefault();
                    if(setCurrentPage) {
                      setCurrentPage('about');
                      window.scrollTo(0, 0);
                    }
                  }}
                >
                  {t.footerAboutUs}
                </a>
              </li>
              <li><a href="#contact">{t.footerContactUs}</a></li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p className="copyright-text">
          &copy; {new Date().getFullYear()} {t.appName}. {t.rightsReserved || 'All rights reserved.'}
        </p>
        <div className="social-cluster">
          <a href="#" aria-label="Global"><Globe size={20} /></a>
          <a href="#" aria-label="Email Support" style={{ cursor: 'default' }}><Mail size={20} /></a>
          <a href="#" aria-label="Chat"><MessageSquare size={20} /></a>
        </div>
      </div>
    </footer>
  );
}
