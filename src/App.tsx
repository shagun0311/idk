
import { useEffect, useState } from 'react';
import { translateDom, type Language } from './Language';
import Moon from './Moon';
import SiteExplorer from './SiteExplorer';
import LolaTerrain from './LolaTerrain';
import SolarAnalysis from './SolarAnalysis';
import EarthVisibility from './EarthVisibility';
import MissionTimeline from './MissionTimeline';
import CompareSites from './CompareSites';
import HazardAnalysis from './HazardAnalysis';
import CommunicationAnalysis from './CommunicationAnalysis';
import MissionAI from './MissionAI';
import './App.css';

const navigation = [
  { icon: '⌂', label: 'Overview' },
  { icon: '◉', label: 'Site Explorer' },
  { icon: '☼', label: 'Solar Analysis' },
  { icon: '◎', label: 'Earth Visibility' },
  { icon: '◷', label: 'Mission Timeline' },
  { icon: '⇄', label: 'Compare Sites' },
  { icon: '⌖', label: 'Hazard Analysis' },
  { icon: '📡', label: 'Communication' },
  { icon: '✦', label: 'MISSION AI' },
];

const pageDetails: Record<
  string,
  { eyebrow: string; description: string; items: string[] }
> = {
  'Earth Visibility': {
    eyebrow: 'COMMUNICATION / EARTH GEOMETRY',
    description:
      'Explore when Earth is geometrically visible from potential lunar landing locations.',
    items: ['Earth position', 'Visibility windows', 'Communication geometry'],
  },
  'Mission Timeline': {
    eyebrow: 'MISSION PLANNING / TIME ANALYSIS',
    description:
      'Explore the major stages of a conceptual lunar landing mission.',
    items: ['Pre-landing preparation', 'Powered descent', 'Lunar touchdown'],
  },
  'Compare Sites': {
    eyebrow: 'MISSION DECISIONS / SITE COMPARISON',
    description:
      'Compare potential landing locations using environmental and communication conditions.',
    items: ['Illumination comparison', 'Earth visibility', 'Site conditions'],
  },
  'Hazard Analysis': {
    eyebrow: 'SURFACE SAFETY / IMAGE ANALYSIS',
    description:
      'Upload lunar surface imagery to explore possible hazards, candidate landing zones and estimated surface risk.',
    items: ['Hazard detection', 'Landing-zone candidates', 'Risk assessment'],
  },
  Communication: {
    eyebrow: 'MISSION SYSTEMS / RADIO COMMUNICATION',
    description:
      'Evaluate direct-to-Earth communication geometry, radio signal propagation, signal delays and lunar relay requirements.',
    items: ['Direct Earth communication', 'Radio signal propagation', 'Relay satellite architecture'],
  },
  'MISSION AI': {
    eyebrow: 'ARTIFICIAL INTELLIGENCE / MISSION CONTROL',
    description:
      'Your AI-powered assistant for lunar exploration, mission planning and engineering support.',
    items: ['Mission planning', 'Technical analysis', 'Mission support'],
  },
};

function App() {
  const [activePage, setActivePage] = useState('Overview');

  const [language, setLanguage] = useState<Language>(() =>
    (localStorage.getItem('idk-language') as Language) || 'en'
  );

  useEffect(() => {
    localStorage.setItem('idk-language', language);
    document.documentElement.lang = language;

    const root = document.querySelector('.app');
    if (!root) return;

    translateDom(root as HTMLElement, language);

    const observer = new MutationObserver(() =>
      translateDom(root as HTMLElement, language)
    );

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [language, activePage]);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">IDK</div>
          <div>
            <h2>IDK</h2>
            <span>INITIAL KINETIC DESIGN</span>
          </div>
        </div>

        <div className="nav-heading">WORKSPACE</div>

        <div className="language-switch" aria-label="Language selector">
          <span>LANGUAGE</span>
          <select
            value={language}
            onChange={(event) =>
              setLanguage(event.target.value as Language)
            }
            aria-label="Choose language"
          >
            <option value="en">English</option>
            <option value="ru">Русский</option>
            <option value="zh">中文</option>
            <option value="fr">Français</option>
            <option value="hi">हिन्दी</option>
            <option value="ja">日本語</option>
            <option value="pt">Português</option>
            <option value="bn">বাংলা</option>
          </select>
        </div>

        <nav>
          {navigation.map((item) => (
            <button
              key={item.label}
              className={`nav-item ${
                activePage === item.label ? 'active' : ''
              }`}
              onClick={() => setActivePage(item.label)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <span className="status-dot" />
          SYSTEM ONLINE
          <p>NASA Space Apps 2026</p>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <span>
            MISSION CONTROL / {activePage.toUpperCase()}
          </span>
          <span className="topbar-right">LUNAR SOUTH POLE</span>
        </header>

        {activePage === 'Overview' ? (
          <>
            <section className="welcome">
              <div className="eyebrow">LUNAR LANDING SITE ASSESSMENT</div>
              <h1>
                Explore the Moon.
                <br />
                <span>Understand every possibility.</span>
              </h1>
              <p>
                An interactive platform for exploring lunar landing
                locations, sunlight conditions and Earth visibility.
              </p>
            </section>

            <section className="moon-panel">
              <div className="panel-label">LUNAR ENVIRONMENT</div>
              <div className="moon-visual">
                <Moon />
                <div className="moon-caption">
                  <span>01 / LUNAR SOUTH POLE</span>
                  <h2>
                    A new perspective
                    <br />
                    on the Moon.
                  </h2>
                </div>
              </div>
              <div className="panel-footer">
                <span>3D LUNAR VIEW</span>
                <span>EXPLORATION MODE</span>
              </div>
            </section>

            <section className="explore-section">
              <div>
                <div className="eyebrow">YOUR WORKSPACE</div>
                <h2>Explore the mission</h2>
                <p>
                  Select an area to begin investigating lunar conditions.
                </p>
              </div>

              <div className="explore-grid">
                {navigation.slice(1).map((item) => (
                  <button
                    className="explore-card"
                    key={item.label}
                    onClick={() => setActivePage(item.label)}
                  >
                    <span>{item.icon}</span>
                    <h3>{item.label}</h3>
                    <p>
                      Explore lunar mission data and conditions.
                    </p>
                    <b>EXPLORE ↗</b>
                  </button>
                ))}
              </div>
            </section>
          </>
        ) : activePage === 'MISSION AI' ? (
          <MissionAI />
        ) : (
          <>
            <section className="welcome">
              <div className="eyebrow">
                {activePage === 'Site Explorer'
                  ? 'LUNAR SURFACE / LOCATION ANALYSIS'
                  : activePage === 'Solar Analysis'
                    ? 'SOLAR CONDITIONS / ILLUMINATION'
                    : pageDetails[activePage].eyebrow}
              </div>

              <h1>{activePage}</h1>

              <p>
                {activePage === 'Site Explorer'
                  ? 'Explore lunar terrain and investigate potential landing locations.'
                  : activePage === 'Solar Analysis'
                    ? 'Investigate sunlight conditions and how illumination changes across lunar locations.'
                    : pageDetails[activePage].description}
              </p>
            </section>

            {activePage === 'Site Explorer' ? (
              <>
                <section style={{ padding: '20px 0' }}>
                  <SiteExplorer />
                </section>
                <section style={{ padding: '20px 0' }}>
                  <LolaTerrain />
                </section>
              </>
            ) : activePage === 'Solar Analysis' ? (
              <SolarAnalysis />
            ) : activePage === 'Earth Visibility' ? (
              <EarthVisibility />
            ) : activePage === 'Mission Timeline' ? (
              <MissionTimeline />
            ) : activePage === 'Compare Sites' ? (
              <CompareSites />
            ) : activePage === 'Hazard Analysis' ? (
              <HazardAnalysis />
            ) : activePage === 'Communication' ? (
              <CommunicationAnalysis />
            ) : null}
          </>
        )}

        <footer>
          IDK — INITIAL KINETIC DESIGN
          <span>BUILT FOR LUNAR EXPLORATION</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
