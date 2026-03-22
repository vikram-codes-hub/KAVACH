import React, { useState, useRef } from 'react';
import logoImg from '../assets/Black_Modern_A_letter_Logo__1_-removebg-preview.png';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';

const GitHubIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.745 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);
const ChevronRight = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
);
const FileIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
  </svg>
);
const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const ArrowRightIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);

// ── Magnetic button ─────────────────────────────────────────────
function MagneticBtn({ children, onClick, className, style }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 15 });
  const sy = useSpring(y, { stiffness: 200, damping: 15 });
  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - r.left - r.width / 2) * 0.22);
    y.set((e.clientY - r.top - r.height / 2) * 0.22);
  };
  const onLeave = () => { x.set(0); y.set(0); };
  return (
    <motion.button ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
      whileTap={{ scale: 0.95 }}
      style={{ ...style, x: sx, y: sy, cursor: 'pointer', border: 'none', fontFamily: '"Inter",sans-serif' }}
      onClick={onClick} className={className}
    >{children}</motion.button>
  );
}

const workflowSteps = [
  { num:'01', title:'Map Construction', desc:'Reality seed extraction & Individual and group memory injection & GraphRAG construction', accent:'#3b82f6', tags:['Reality seed extraction','Individual and group memory injection','GraphRAG construction'] },
  { num:'02', title:'Environment setup', desc:'Entity Relationship Extraction & Persona Generation & Environment Configuration Agent Injection Simulation Parameters', accent:'#f97316', tags:['Entity Relationship Extraction','Persona Generation','Environment Configuration','Agent Injection Simulation Parameters'] },
  { num:'03', title:'Start simulation', desc:'Dual-platform parallel simulation & automatic demand analysis & dynamic updating of time series memory', accent:'#22c55e', tags:['Dual-platform parallel simulation','automatic demand analysis','dynamic updating of time series memory'] },
  { num:'04', title:'Report generation', desc:'ReportAgent offers a rich toolset and allows for in-depth interaction with simulated environments.', accent:'#a855f7', tags:['ReportAgent toolset','in-depth interaction'] },
  { num:'05', title:'Deep Interaction', desc:'Engage in conversation with any character in the simulated world & Engage in conversation with ReportAgent', accent:'#ef4444', tags:['Engage in conversation with any character in the simulated world','Engage in conversation with ReportAgent'] },
];

const listV  = { hidden:{}, show:{ transition:{ staggerChildren:0.08, delayChildren:0.3 } } };
const stepV  = { hidden:{ opacity:0, x:-24, filter:'blur(6px)' }, show:{ opacity:1, x:0, filter:'blur(0px)', transition:{ duration:0.55, ease:[0.22,1,0.36,1] } } };
const panelV = { hidden:{ opacity:0, x:24, filter:'blur(6px)' }, show:{ opacity:1, x:0, filter:'blur(0px)', transition:{ duration:0.55, ease:[0.22,1,0.36,1] } } };
const rightV = { hidden:{}, show:{ transition:{ staggerChildren:0.1, delayChildren:0.35 } } };

export default function AnalysisPage() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(null);

  return (
    <div style={{ height:'100vh', overflow:'hidden', background:'#05080f', color:'white', fontFamily:"'Inter','Segoe UI',system-ui,sans-serif", display:'flex', flexDirection:'column' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        .an-navbar { background:rgba(5,8,15,0.92); backdrop-filter:blur(16px); border-bottom:1px solid rgba(255,255,255,0.06); flex-shrink:0; }
        .an-step { cursor:pointer; border:1px solid rgba(255,255,255,0.07); background:rgba(255,255,255,0.015); border-radius:14px; padding:16px 18px; transition:all 0.18s ease; }
        .an-step:hover { border-color:rgba(249,115,22,0.3); background:rgba(249,115,22,0.03); }
        .an-step.active { border-color:rgba(249,115,22,0.45); background:rgba(249,115,22,0.04); }
        .an-panel { background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.07); border-radius:12px; }
        .an-exp-btn { background:linear-gradient(135deg,#dc2626 0%,#f97316 100%); box-shadow:0 0 20px rgba(220,38,38,0.3); border:none; border-radius:10px; padding:12px 18px; display:flex; align-items:center; justify-content:space-between; cursor:pointer; color:white; width:100%; }
        .an-exp-btn:hover { box-shadow:0 0 36px rgba(220,38,38,0.6); }
        .status-dot { width:7px; height:7px; border-radius:50%; background:#22c55e; box-shadow:0 0 8px rgba(34,197,94,0.7); animation:sPulse 2s ease-in-out infinite; flex-shrink:0; }
        @keyframes sPulse { 0%,100%{box-shadow:0 0 5px rgba(34,197,94,0.5);} 50%{box-shadow:0 0 14px rgba(34,197,94,0.9);} }
        .divider { height:1px; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.07),transparent); flex-shrink:0; }
        .left-scroll { overflow-y:auto; flex:1; }
        .left-scroll::-webkit-scrollbar { width:3px; }
        .left-scroll::-webkit-scrollbar-track { background:transparent; }
        .left-scroll::-webkit-scrollbar-thumb { background:rgba(249,115,22,0.3); border-radius:2px; }
        .right-scroll { overflow-y:auto; flex:1; }
        .right-scroll::-webkit-scrollbar { width:3px; }
        .right-scroll::-webkit-scrollbar-track { background:transparent; }
        .right-scroll::-webkit-scrollbar-thumb { background:rgba(249,115,22,0.2); border-radius:2px; }
        @keyframes scanline { 0%{top:-4px} 100%{top:100%} }
        .scan-line { position:absolute; left:0; right:0; height:2px; background:linear-gradient(90deg,transparent,rgba(249,115,22,0.12),transparent); animation:scanline 4s linear infinite; pointer-events:none; }
      `}</style>

      {/* NAVBAR */}
      <motion.header className="an-navbar"
        initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }}
        transition={{ duration:0.6, ease:[0.22,1,0.36,1] }}
        style={{ padding:'10px 32px', display:'flex', alignItems:'center', justifyContent:'space-between' }}
      >
        <motion.button onClick={() => navigate('/')} whileHover={{ opacity:0.75, x:-2 }}
          style={{ display:'flex', alignItems:'center', gap:10, background:'none', border:'none', cursor:'pointer' }}
        >
          <div style={{ width:32, height:32 }}>
            <img src={logoImg} alt="KAVACH"
              style={{ width:'100%', height:'100%', objectFit:'contain', filter:'invert(1)' }} />
          </div>
          <div style={{ lineHeight:1 }}>
            <div style={{ fontSize:9, fontWeight:800, letterSpacing:'0.25em', color:'rgba(255,255,255,0.35)', textTransform:'uppercase' }}>कवच</div>
            <div style={{ fontSize:14, fontWeight:900, letterSpacing:'0.2em', color:'white' }}>KAVACH</div>
            <div style={{ fontSize:7.5, letterSpacing:'0.2em', color:'rgba(249,115,22,0.65)', textTransform:'uppercase', fontWeight:500 }}>Crisis Swarm Platform</div>
          </div>
        </motion.button>

        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.3 }}
          style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'rgba(255,255,255,0.35)' }}
        >
          <motion.button onClick={() => navigate('/')} whileHover={{ color:'rgba(255,255,255,0.7)' }}
            style={{ background:'none', border:'none', color:'rgba(255,255,255,0.35)', cursor:'pointer', fontSize:11 }}
          >Home</motion.button>
          <ChevronRight />
          <motion.span initial={{ opacity:0, x:8 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.4 }}
            style={{ color:'#f97316', fontWeight:600 }}
          >Analysis</motion.span>
        </motion.div>

        <motion.button initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} transition={{ delay:0.25 }}
          whileHover={{ scale:1.06, background:'rgba(255,255,255,0.08)' }} whileTap={{ scale:0.94 }}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', fontSize:11, fontWeight:600, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:20, color:'rgba(255,255,255,0.6)', cursor:'pointer' }}
        ><GitHubIcon size={13}/> GitHub</motion.button>
      </motion.header>

      {/* CONTENT */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', padding:'22px 36px 14px' }}>

        {/* Status row */}
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:0.6, delay:0.15, ease:[0.22,1,0.36,1] }}
          style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18, flexShrink:0 }}
        >
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
              <div className="status-dot" />
              <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.3em', color:'rgba(255,255,255,0.35)', textTransform:'uppercase' }}>System status</span>
            </div>
            <h1 style={{ fontSize:28, fontWeight:900, color:'white', lineHeight:1.2 }}>
              The system is{' '}
              <motion.span initial={{ opacity:0, filter:'blur(8px)' }} animate={{ opacity:1, filter:'blur(0px)' }}
                transition={{ delay:0.5, duration:0.7 }}
                style={{ background:'linear-gradient(135deg,#22c55e,#4ade80)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}
              >ready.</motion.span>
            </h1>
            <motion.p initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.6 }}
              style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginTop:4 }}
            >
              The system is ready and <span style={{ color:'#f97316', fontWeight:600 }}>can</span> be used.
            </motion.p>
          </div>

          <motion.div initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }} transition={{ delay:0.4, ease:[0.22,1,0.36,1] }}>
            <motion.div
              animate={{ boxShadow:['0 0 0px rgba(34,197,94,0.2)','0 0 18px rgba(34,197,94,0.45)','0 0 0px rgba(34,197,94,0.2)'] }}
              transition={{ duration:2.5, repeat:Infinity }}
              style={{ padding:'4px 10px', borderRadius:20, border:'1px solid rgba(34,197,94,0.25)', background:'rgba(34,197,94,0.08)', fontSize:10, fontWeight:700, color:'#4ade80', letterSpacing:'0.1em' }}
            >● ONLINE</motion.div>
          </motion.div>
        </motion.div>

        <motion.div className="divider"
          initial={{ scaleX:0 }} animate={{ scaleX:1 }}
          transition={{ duration:0.8, delay:0.3, ease:[0.22,1,0.36,1] }}
          style={{ marginBottom:18, transformOrigin:'left' }}
        />

        {/* Two columns */}
        <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 400px', gap:16, overflow:'hidden' }}>

          {/* LEFT — Steps */}
          <div style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <motion.div initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.35 }}
              style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10, flexShrink:0 }}
            >
              <motion.span animate={{ rotate:[45,90,45] }} transition={{ duration:4, repeat:Infinity, ease:'easeInOut' }}
                style={{ display:'inline-block', width:8, height:8, border:'1px solid rgba(255,255,255,0.2)', transform:'rotate(45deg)', flexShrink:0 }}
              />
              <p style={{ fontSize:9, fontWeight:700, letterSpacing:'0.3em', color:'rgba(255,255,255,0.28)', textTransform:'uppercase' }}>Workflow steps</p>
            </motion.div>

            <motion.div className="left-scroll" variants={listV} initial="hidden" animate="show"
              style={{ display:'flex', flexDirection:'column', gap:10 }}
            >
              {workflowSteps.map((step, i) => (
                <motion.div key={i} variants={stepV}
                  className={`an-step${activeStep === i ? ' active' : ''}`}
                  onClick={() => setActiveStep(activeStep === i ? null : i)}
                  whileHover={{ x:3 }}
                  layout
                >
                  <div style={{ display:'flex', alignItems:'flex-start', gap:13 }}>
                    <motion.div whileHover={{ scale:1.12, rotate:-4 }}
                      style={{ width:38, height:38, borderRadius:11, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, flexShrink:0, background:`${step.accent}20`, color:step.accent, border:`1px solid ${step.accent}30` }}
                    >{step.num}</motion.div>

                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                        <span style={{ fontSize:15, fontWeight:700, color:'white' }}>{step.title}</span>
                        <AnimatePresence>
                          {activeStep === i && (
                            <motion.span
                              initial={{ opacity:0, scale:0.7, x:-8 }}
                              animate={{ opacity:1, scale:1, x:0 }}
                              exit={{ opacity:0, scale:0.7, x:-8 }}
                              transition={{ duration:0.2 }}
                              style={{ fontSize:8, fontWeight:700, letterSpacing:'0.1em', padding:'1px 6px', borderRadius:10, background:'rgba(249,115,22,0.12)', color:'#f97316', border:'1px solid rgba(249,115,22,0.22)', textTransform:'uppercase' }}
                            >Active</motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                      <p style={{ fontSize:12.5, color:'rgba(255,255,255,0.38)', lineHeight:1.6, marginBottom:activeStep===i?9:0 }}>{step.desc}</p>

                      <AnimatePresence>
                        {activeStep === i && (
                          <motion.div
                            initial={{ opacity:0, height:0, y:-8 }}
                            animate={{ opacity:1, height:'auto', y:0 }}
                            exit={{ opacity:0, height:0, y:-8 }}
                            transition={{ duration:0.28, ease:[0.22,1,0.36,1] }}
                            style={{ display:'flex', flexWrap:'wrap', gap:'3px 10px', overflow:'hidden' }}
                          >
                            {step.tags.map((tag, j) => (
                              <motion.span key={j}
                                initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
                                transition={{ delay:j*0.06 }}
                                style={{ fontSize:10, fontWeight:500, color:step.accent, cursor:'pointer' }}
                              >{tag}</motion.span>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* RIGHT — Panels */}
          <motion.div className="right-scroll" variants={rightV} initial="hidden" animate="show"
            style={{ display:'flex', flexDirection:'column', gap:10 }}
          >
            {/* Panel 1 */}
            <motion.div variants={panelV} className="an-panel"
              whileHover={{ borderColor:'rgba(59,130,246,0.3)', boxShadow:'0 0 24px rgba(59,130,246,0.08)' }}
              style={{ padding:'14px 16px', transition:'box-shadow 0.3s,border-color 0.3s', position:'relative', overflow:'hidden' }}
            >
              <div className="scan-line" />
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.18em', color:'rgba(59,130,246,0.6)', textTransform:'uppercase' }}>01 / Reality Seed</span>
                <motion.span animate={{ opacity:[0.4,1,0.4] }} transition={{ duration:2, repeat:Infinity }}
                  style={{ fontSize:9, fontWeight:700, letterSpacing:'0.12em', color:'rgba(255,255,255,0.25)', background:'rgba(255,255,255,0.05)', padding:'2px 7px', borderRadius:4, textTransform:'uppercase' }}
                >PDF</motion.span>
              </div>

              <motion.div whileHover={{ borderColor:'rgba(59,130,246,0.4)', background:'rgba(59,130,246,0.1)' }}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', borderRadius:10, background:'rgba(59,130,246,0.07)', border:'1px solid rgba(59,130,246,0.2)', transition:'all 0.2s' }}
              >
                <FileIcon />
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:12, fontWeight:600, color:'white', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>NDMA_Flood_Advisory_Uttarakhand_2024.pdf</p>
                  <p style={{ fontSize:10, color:'rgba(255,255,255,0.37)', marginTop:1 }}>2.4 MB · NDMA · Chamoli &amp; Rudraprayag districts</p>
                </div>
                <motion.span initial={{ scale:0 }} animate={{ scale:1 }} transition={{ delay:0.8, type:'spring', stiffness:300 }}
                  style={{ color:'#22c55e', flexShrink:0 }}
                ><CheckIcon /></motion.span>
              </motion.div>

              <div style={{ marginTop:10, display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                {[{ lbl:'Affected Zones', val:'Chamoli, Rudraprayag' },{ lbl:'Flood Severity', val:'Extreme (Level 4)' }].map((f,i) => (
                  <motion.div key={f.lbl}
                    initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.6+i*.1 }}
                    whileHover={{ background:'rgba(255,255,255,0.05)', borderColor:'rgba(255,255,255,0.1)' }}
                    style={{ padding:'6px 8px', borderRadius:7, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', transition:'all 0.2s' }}
                  >
                    <div style={{ fontSize:9, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.15em', marginBottom:2 }}>{f.lbl}</div>
                    <div style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.75)' }}>{f.val}</div>
                  </motion.div>
                ))}
              </div>
              <p style={{ fontSize:9, color:'rgba(255,255,255,0.2)', letterSpacing:'0.3em', textTransform:'uppercase', marginTop:10 }}>Extracted parameters · Read-only</p>
            </motion.div>

            {/* Panel 2 */}
            <motion.div variants={panelV} className="an-panel"
              whileHover={{ borderColor:'rgba(249,115,22,0.2)', boxShadow:'0 0 20px rgba(249,115,22,0.06)' }}
              style={{ padding:'14px 16px', transition:'box-shadow 0.3s,border-color 0.3s' }}
            >
              <p style={{ fontSize:9, fontWeight:700, letterSpacing:'0.18em', color:'rgba(249,115,22,0.6)', textTransform:'uppercase', marginBottom:8 }}>
                &gt;_ 02 / Simulated Requirements
              </p>
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:8, padding:'12px 14px', fontFamily:"'Courier New',monospace", fontSize:12.5, lineHeight:1.7, color:'rgba(255,255,255,0.65)' }}>
                <motion.span
                  initial={{ clipPath:'inset(0 100% 0 0)' }}
                  animate={{ clipPath:'inset(0 0% 0 0)' }}
                  transition={{ duration:1.6, delay:0.8, ease:'easeInOut' }}
                  style={{ display:'block' }}
                >
                  if the Mandakini flood reaches Gopeshwar and NH-58 is blocked, several of the 50 citizens become isolated—those in remote or mobility-constrained groups are most at risk.
                </motion.span>
              </div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:8 }}>
                <span style={{ fontSize:9, color:'rgba(255,255,255,0.18)', fontStyle:'italic' }}>Engine: KAVACH-Sim v1.0 · Groq Llama 3.3</span>
                <motion.div whileHover={{ background:'rgba(220,38,38,0.15)', borderColor:'rgba(220,38,38,0.4)', color:'rgba(220,38,38,0.8)' }}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:8, background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.2)', fontSize:11, fontWeight:700, color:'rgba(220,38,38,0.5)', letterSpacing:'0.05em', cursor:'default', transition:'all 0.2s' }}
                >▶ Run</motion.div>
              </div>
            </motion.div>

            {/* Experience it now — magnetic */}
            <motion.div variants={panelV}>
              <MagneticBtn className="an-exp-btn" onClick={() => navigate('/simulation')}
                style={{ background:'linear-gradient(135deg,#dc2626 0%,#f97316 100%)', boxShadow:'0 0 20px rgba(220,38,38,0.3)', borderRadius:10, padding:'12px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', color:'white', width:'100%' }}
              >
                <span style={{ fontSize:13, fontWeight:700 }}>Experience it now</span>
                <motion.span animate={{ x:[0,5,0] }} transition={{ duration:1.5, repeat:Infinity, ease:'easeInOut' }}>
                  <ArrowRightIcon />
                </motion.span>
              </MagneticBtn>
            </motion.div>

            {/* Warning */}
            <motion.div variants={panelV}
              whileHover={{ borderColor:'rgba(234,179,8,0.35)', background:'rgba(234,179,8,0.08)' }}
              style={{ padding:'10px 12px', borderRadius:8, background:'rgba(234,179,8,0.06)', border:'1px solid rgba(234,179,8,0.18)', display:'flex', alignItems:'flex-start', gap:8, transition:'all 0.2s' }}
            >
              <motion.span animate={{ rotate:[0,8,-8,0] }} transition={{ duration:2.5, repeat:Infinity, ease:'easeInOut' }}
                style={{ color:'#eab308', fontSize:13, flexShrink:0, marginTop:1, display:'inline-block' }}
              >⚠</motion.span>
              <p style={{ fontSize:10, color:'rgba(234,179,8,0.65)', lineHeight:1.5 }}>
                Upload your own disaster advisory PDF in the simulation to run a live multi-agent analysis for any Indian district.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}