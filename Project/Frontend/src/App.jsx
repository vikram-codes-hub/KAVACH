import { useState, useEffect } from 'react'
import logoImg from './assets/Black_Modern_A_letter_Logo__1_-removebg-preview.png'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'

// Scrolls to top on every route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}
import LandingPage from './Pages/LandingPage'
import AnalysisPage from './Pages/AnalysisPage'
import SimulationPage from './Pages/SimulationPage'
import './index.css'

// ── Preloader (from new App) ──────────────────────────────────
const Preloader = ({ onDone }) => {
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 2800)
    const removeTimer = setTimeout(() => onDone(), 3500)
    // Lock body scroll while loading
    document.body.style.overflow = 'hidden'
    return () => { 
      clearTimeout(fadeTimer); 
      clearTimeout(removeTimer);
      document.body.style.overflow = ''
    }
  }, [onDone])

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center bg-[#05080f] overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.76,0,0.24,1)]"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        opacity: fading ? 0 : 1,
        transform: fading ? 'translateY(-20px)' : 'translateY(0)',
        pointerEvents: fading ? 'none' : 'auto',
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        backgroundPosition: 'center center',
      }}
    >
      <style>{`
        @keyframes maskReveal {
          0% { clip-path: polygon(50% 100%, 50% 100%, 50% 100%, 50% 100%); opacity: 0; filter: blur(5px); }
          40% { opacity: 1; filter: blur(0px); }
          100% { clip-path: polygon(0 -20%, 100% -20%, 100% 120%, 0 120%); opacity: 1; filter: blur(0px); }
        }
        @keyframes logoGlowPulse {
          0%, 100% { filter: drop-shadow(0 0 20px rgba(251,191,36,0.5)) drop-shadow(0 0 40px rgba(251,191,36,0.2)); transform: scale(1); }
          50% { filter: drop-shadow(0 0 40px rgba(251,191,36,0.8)) drop-shadow(0 0 70px rgba(251,191,36,0.4)); transform: scale(1.05); }
        }
        @keyframes clipRevealText {
          0% { clip-path: polygon(0 100%, 100% 100%, 100% 100%, 0 100%); transform: translateY(40px); opacity: 0; }
          20% { opacity: 1; }
          100% { clip-path: polygon(0 -50%, 100% -50%, 100% 150%, 0 150%); transform: translateY(0); opacity: 1; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>

      <div className="relative mb-16 w-40 h-40 md:w-56 md:h-56 mix-blend-screen"
        style={{ animation: 'logoGlowPulse 2.5s cubic-bezier(0.4,0,0.2,1) infinite' }}>
        <div className="absolute inset-0 bg-[#fbbf24]"
          style={{
            WebkitMaskImage: `url(${logoImg})`,
            WebkitMaskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            maskImage: `url(${logoImg})`,
            maskSize: 'contain',
            maskRepeat: 'no-repeat',
            maskPosition: 'center',
            imageRendering: 'pixelated',
            animation: 'maskReveal 1.8s cubic-bezier(0.85,0,0.15,1) forwards'
          }}
        />
      </div>

      <div className="text-7xl md:text-8xl font-black tracking-[0.3em] text-white opacity-0 relative z-10"
        style={{ animation: 'clipRevealText 2.2s cubic-bezier(0.16,1,0.3,1) forwards', animationDelay: '0.6s' }}>
        KAVACH
      </div>

      <div className="mt-10 flex flex-col items-center gap-4 opacity-0"
        style={{ animation: 'clipRevealText 1.2s cubic-bezier(0.76,0,0.24,1) forwards', animationDelay: '0.9s' }}>
        <div className="text-sm md:text-base font-semibold tracking-[0.5em] text-white/60 uppercase">
          Initializing Simulation
        </div>
        <div className="w-64 h-[2px] bg-white/10 relative overflow-hidden rounded-full mt-2">
          <div className="absolute top-0 bottom-0 left-0 w-full bg-gradient-to-r from-transparent via-[#fbbf24] to-transparent"
            style={{ animation: 'shimmer 1.5s cubic-bezier(0.4,0,0.2,1) infinite' }} />
        </div>
      </div>
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────
export default function App() {
  const [loading, setLoading] = useState(true)

  return (
    <BrowserRouter>
      <ScrollToTop />
      {loading && <Preloader onDone={() => setLoading(false)} />}
      <Routes>
        {/* Landing page — entry point */}
        <Route path="/"           element={<LandingPage />} />

        {/* Analysis / config page */}
        <Route path="/analysis"   element={<AnalysisPage />} />

        {/* Full simulation — CrisisSwarm engine */}
        <Route path="/simulation" element={
          <div className="app">
            <SimulationPage />
          </div>
        } />
      </Routes>
    </BrowserRouter>
  )
}