import React, { useEffect } from 'react';
import { Users } from 'lucide-react';

export default function About({ t }) {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    const hiddenElements = document.querySelectorAll('.reveal-on-scroll');
    hiddenElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="home-container" style={{ paddingTop: '40px', minHeight: 'calc(100vh - 200px)' }}>
      {/* ── TEAM SECTION ─────────────────────────────────────── */}
      <div className="team-section" style={{ marginTop: '0' }}>
        <div className="section-label reveal-on-scroll"><Users size={14} /> {t.peopleLabel || 'Our People'}</div>
        <h2 className="section-title reveal-on-scroll delay-100">{t.teamTitle || 'Meet The Team'}</h2>
        <div className="team-grid">
          {[
            { name: 'Saeed Abdulrahman Alzahrani', role: t.teamRolePM || 'Project Manager', img: 'https://pkngqwjvekvolmirldgw.supabase.co/storage/v1/object/public/team/saeed.jpg' },
            { name: 'Mujahid Bandar Alshehri', role: t.teamRoleBackend || 'Backend Infrastructure', img: 'https://pkngqwjvekvolmirldgw.supabase.co/storage/v1/object/public/team/mujahid.jpg' },
            { name: 'Muhaned Mohammed Alhilal', role: t.teamRoleFrontend || 'Frontend Engineering', img: 'https://pkngqwjvekvolmirldgw.supabase.co/storage/v1/object/public/team/muhaned.jpg' },
            { name: 'Mohammed Tareq Althumairy', role: t.teamRoleFrontend || 'Frontend Engineering', img: 'https://pkngqwjvekvolmirldgw.supabase.co/storage/v1/object/public/team/mohammed.jpg' },
          ].map(({ name, role, img }, i) => (
            <div className={`team-card reveal-on-scroll delay-${(i + 1) * 100}`} key={name}>
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
    </div>
  );
}
