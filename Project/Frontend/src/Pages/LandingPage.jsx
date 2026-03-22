import React, { useState, useEffect, useRef } from 'react';
import logoImg from '../assets/Black_Modern_A_letter_Logo__1_-removebg-preview.png';
import { useNavigate } from 'react-router-dom';
import {
  motion, useInView, useScroll, useTransform,
  useMotionValue, useSpring, animate
} from 'framer-motion';
import Chatbot from './Chatbot';

const GitHubIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.745 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);
const TwitterIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.732-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// ── Animated number counter ─────────────────────────────────────
function AnimatedCounter({ target, suffix = '' }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!isInView) return;
    const controls = animate(0, target, {
      duration: 1.8, ease: [0.22, 1, 0.36, 1],
      onUpdate: v => setDisplay(Math.floor(v))
    });
    return controls.stop;
  }, [isInView, target]);
  return <span ref={ref}>{display}{suffix}</span>;
}

// ── 3D tilt card with moving spotlight ─────────────────────────
function TiltCard({ children, style }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [7, -7]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-7, 7]), { stiffness: 300, damping: 30 });
  const [glowPos, setGlowPos] = useState({ x: '50%', y: '50%' });

  const handleMouse = (e) => {
    const rect = ref.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    x.set(nx - 0.5);
    y.set(ny - 0.5);
    setGlowPos({ x: `${nx * 100}%`, y: `${ny * 100}%` });
  };
  const handleLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      whileHover={{ scale: 1.02, borderColor: 'rgba(249,115,22,0.3)' }}
      style={{ ...style, rotateX, rotateY, transformStyle: 'preserve-3d', position: 'relative', overflow: 'hidden', transition: 'border-color 0.3s' }}
    >
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 'inherit', pointerEvents: 'none', zIndex: 0,
        background: `radial-gradient(circle at ${glowPos.x} ${glowPos.y}, rgba(249,115,22,0.07) 0%, transparent 55%)`,
        transition: 'background 0.1s'
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </motion.div>
  );
}

// ── Magnetic button ─────────────────────────────────────────────
function MagneticButton({ children, onClick, style }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 180, damping: 14 });
  const sy = useSpring(y, { stiffness: 180, damping: 14 });

  const handleMouse = (e) => {
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left - rect.width / 2) * 0.28);
    y.set((e.clientY - rect.top - rect.height / 2) * 0.28);
  };
  const handleLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.button ref={ref}
      onMouseMove={handleMouse} onMouseLeave={handleLeave}
      whileTap={{ scale: 0.95 }}
      style={{ ...style, x: sx, y: sy, cursor: 'pointer', border: 'none', fontFamily: '"Inter",sans-serif' }}
      onClick={onClick}
    >{children}</motion.button>
  );
}

// ── Word-by-word blur reveal ────────────────────────────────────
function WordReveal({ text, style, delay = 0 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <span ref={ref} style={{ ...style, display: 'inline' }}>
      {text.split(' ').map((word, i) => (
        <motion.span key={i}
          initial={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
          animate={isInView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
          transition={{ duration: 0.65, delay: delay + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: 'inline-block', marginRight: '0.25em' }}
        >{word}</motion.span>
      ))}
    </span>
  );
}

// ── Orange underline clip reveal for section labels ─────────────
function LabelReveal({ children }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.p ref={ref}
      initial={{ opacity: 0, x: -20 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      style={{ fontSize: '12px', fontWeight: 900, letterSpacing: '2px', color: '#fb923c', textTransform: 'uppercase', marginBottom: '24px' }}
    >{children}</motion.p>
  );
}

// ── Stagger variants ────────────────────────────────────────────
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const item = {
  hidden: { opacity: 0, y: 44, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } }
};

// ── Pulsing live dot ────────────────────────────────────────────
const PulseDot = () => (
  <span style={{ position: 'relative', display: 'inline-flex' }}>
    <motion.span animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
      style={{ position: 'absolute', inset: 0, borderRadius: '9999px', background: '#ef4444', display: 'inline-flex' }} />
    <span style={{ position: 'relative', display: 'inline-flex', borderRadius: '9999px', width: '8px', height: '8px', background: '#ef4444' }} />
  </span>
);

// ── Disaster canvas ─────────────────────────────────────────────
const DisasterCanvas = () => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const P = 10;
    let cols, rows, terrain, flood, agents, rain, frame = 0, id;
    const rand = (a, b) => Math.random() * (b - a) + a;
    const resize = () => {
      canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;
      cols = Math.floor(canvas.width / P); rows = Math.floor(canvas.height / P); init();
    };
    const init = () => {
      terrain = Array.from({ length: rows }, () => Array.from({ length: cols }, () => { const r = Math.random(); return r < .12 ? 2 : r < .22 ? 1 : 0; }));
      flood = Array.from({ length: rows }, () => new Float32Array(cols));
      [[Math.floor(rows*.75),Math.floor(cols*.08)],[Math.floor(rows*.82),Math.floor(cols*.20)],[Math.floor(rows*.68),Math.floor(cols*.15)]].forEach(([r,c])=>{ if(r<rows&&c<cols) flood[r][c]=0.6; });
      agents = Array.from({ length: 22 }, (_,i) => ({ x:rand(0,cols),y:rand(0,rows),vx:rand(-.15,.15),vy:rand(-.15,.15),color:i<9?'#ef4444':i<15?'#f97316':'#22c55e',trapped:false,bp:rand(0,Math.PI*2) }));
      rain = Array.from({ length: 100 }, () => ({ x:rand(0,cols),y:rand(0,rows),s:rand(.4,.9) }));
    };
    const spreadFlood = () => {
      if (frame%6!==0) return;
      const next = flood.map(r=>new Float32Array(r));
      for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) if(flood[r][c]>.05){[[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr,dc])=>{const nr=r+dr,nc=c+dc;if(nr>=0&&nr<rows&&nc>=0&&nc<cols&&next[nr][nc]<.1&&terrain[nr][nc]!==2)if(Math.random()<.12)next[nr][nc]=flood[r][c]*rand(.55,.82);});next[r][c]=Math.min(next[r][c]+.008,.88);}
      flood=next;
    };
    const draw = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){const fl=flood[r][c];if(fl>.05){const w=.7+.3*Math.sin(frame*.04+r*.3+c*.2);ctx.fillStyle=`rgba(20,100,220,${fl*.65*w})`;ctx.fillRect(c*P,r*P,P,P);if(fl<.3){ctx.fillStyle=`rgba(180,220,255,${(.3-fl)*1.2})`;ctx.fillRect(c*P,r*P,P,2);}}else{ctx.fillStyle=terrain[r][c]===2?'rgba(45,55,80,.55)':terrain[r][c]===1?'rgba(55,60,80,.35)':'rgba(15,28,52,.28)';ctx.fillRect(c*P,r*P,P,P);}}
      ctx.strokeStyle='rgba(255,255,255,.035)';ctx.lineWidth=.5;
      for(let r=0;r<=rows;r++){ctx.beginPath();ctx.moveTo(0,r*P);ctx.lineTo(canvas.width,r*P);ctx.stroke();}
      for(let c=0;c<=cols;c++){ctx.beginPath();ctx.moveTo(c*P,0);ctx.lineTo(c*P,canvas.height);ctx.stroke();}
      [{r:Math.floor(rows*.25),c:Math.floor(cols*.55),w:9,h:5},{r:Math.floor(rows*.55),c:Math.floor(cols*.70),w:7,h:4}].forEach(z=>{const p=.12+.10*Math.sin(frame*.04);ctx.fillStyle=`rgba(220,38,38,${p})`;ctx.fillRect(z.c*P,z.r*P,z.w*P,z.h*P);});
      ctx.fillStyle='rgba(147,200,255,.18)';rain.forEach(d=>{ctx.fillRect(Math.floor(d.x)*P+P/2,Math.floor(d.y)*P,1,P*2);d.y+=d.s;if(d.y>rows){d.y=-1;d.x=rand(0,cols);}});
      agents.forEach(a=>{const r=Math.floor(a.y),c=Math.floor(a.x);if(r>=0&&r<rows&&c>=0&&c<cols&&flood[r][c]>.5)a.trapped=true;if(!a.trapped){let fx=0,fy=0;if(r>0&&flood[r-1]?.[c]>.1)fy+=.4;if(r<rows-1&&flood[r+1]?.[c]>.1)fy-=.4;if(c>0&&flood[r]?.[c-1]>.1)fx+=.4;if(c<cols-1&&flood[r]?.[c+1]>.1)fx-=.4;a.x=Math.max(0,Math.min(cols-1,a.x+a.vx+fx*.08));a.y=Math.max(0,Math.min(rows-1,a.y+a.vy+fy*.08));}const px=Math.floor(a.x)*P,py=Math.floor(a.y)*P;ctx.globalAlpha=a.trapped?(Math.sin(frame*.15+a.bp)>0?1:.2):1;ctx.fillStyle=a.color;ctx.fillRect(px,py,P,P);ctx.globalAlpha=1;});
      frame++;
    };
    const loop=()=>{spreadFlood();draw();id=requestAnimationFrame(loop);};
    resize();id=requestAnimationFrame(loop);
    const ro=new ResizeObserver(resize);ro.observe(canvas);
    return()=>{cancelAnimationFrame(id);ro.disconnect();};
  },[]);
  return <canvas ref={canvasRef} style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',imageRendering:'pixelated'}}/>;
};

// ── Landing Page ────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroParallaxY   = useTransform(scrollYProgress, [0, 1], ['0%', '25%']);
  const heroFadeOpacity = useTransform(scrollYProgress, [0, 0.65], [1, 0]);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  const problems = [
    { title: 'The Plan Problem', desc: 'Disaster response plans are written months in advance on paper. The moment a real disaster is different from what was planned — which is every time — the plan is wrong.' },
    { title: 'The Simulation Problem', desc: 'No tool exists that lets government officials stress-test their plan before the disaster. No system simulates human behavior inside a disaster — who panics, who helps, who ignores alerts, who gets trapped.' },
    { title: 'The Report Problem', desc: 'After every disaster India produces reports. They name what went wrong. They name it six months later. KAVACH names it six months before.' },
  ];

  const steps = [
    { icon: '📄', num: '01', title: 'Upload',   desc: 'Upload any real government disaster advisory PDF.' },
    { icon: '🧠', num: '02', title: 'Extract',  desc: 'Gemini AI extracts affected zones, roads, shelters, hospitals.' },
    { icon: '👥', num: '03', title: 'Generate', desc: 'Generate 20 real citizens specific to the zones.' },
    { icon: '🗺️', num: '04', title: 'Simulate', desc: 'Watch tick-by-tick simulation unfold in real time.' },
    { icon: '⚡', num: '05', title: 'Interact',  desc: 'Break things in real time and see the cascade.' },
    { icon: '📊', num: '06', title: 'Report',   desc: 'Get government-style bottleneck report.' },
  ];

  const cardBase = { padding: '32px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' };

  return (
    <div style={{ width:'100%', minHeight:'100vh', backgroundColor:'#05080f', color:'white', fontFamily:'"Inter","Segoe UI",system-ui,sans-serif', overflowX:'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        body{margin:0;padding:0;}html{scroll-behavior:smooth;}::selection{background:rgba(239,68,68,0.25);}
        @keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
        .kavach-shimmer{
          background:linear-gradient(90deg,#ef4444 0%,#f97316 25%,#fbbf24 50%,#f97316 75%,#ef4444 100%);
          background-size:200% auto;background-clip:text;-webkit-background-clip:text;-webkit-text-fill-color:transparent;
          animation:shimmer 4s linear infinite;
        }
      `}</style>

      {/* NAVBAR */}
      <motion.header
        initial={{ opacity:0, y:-32 }}
        animate={{ opacity:1, y:0 }}
        transition={{ duration:0.7, ease:[0.22,1,0.36,1] }}
        style={{ position:'fixed',top:0,left:0,right:0,zIndex:50,transition:'all 0.3s', background:scrolled?'rgba(5,8,15,0.9)':'transparent', backdropFilter:scrolled?'blur(16px)':'none', borderBottom:scrolled?'1px solid rgba(255,255,255,0.05)':'none' }}
      >
        <div style={{ maxWidth:'80rem',margin:'0 auto',padding:'0 1rem',display:'flex',alignItems:'center',justifyContent:'space-between',height:'64px' }}>
          <motion.a href="#" whileHover={{ scale:1.05 }} style={{ display:'flex',alignItems:'center',gap:'12px',textDecoration:'none' }}>
            <div style={{ width:'36px',height:'36px' }}>
              <img src={logoImg} alt="KAVACH" style={{ width:'100%',height:'100%',objectFit:'contain',filter:'invert(1)' }} />
            </div>
            <div>
              <div style={{ fontSize:'10px',fontWeight:900,letterSpacing:'2px',color:'rgba(255,255,255,0.4)',margin:0 }}>कवच</div>
              <div style={{ fontSize:'16px',fontWeight:900,letterSpacing:'2px',color:'white',lineHeight:1,margin:0 }}>KAVACH</div>
              <div style={{ fontSize:'7.5px',letterSpacing:'0.2em',color:'rgba(249,115,22,0.65)',textTransform:'uppercase',fontWeight:500 }}>Crisis Swarm Platform</div>
            </div>
          </motion.a>

          <nav style={{ display:'flex',gap:'32px',alignItems:'center' }}>
            {['The Problem','How It Works','Why India'].map((l,i) => (
              <motion.a key={l} href={`#${l.toLowerCase().replace(/\s+/g,'-')}`}
                initial={{ opacity:0,y:-12 }} animate={{ opacity:1,y:0 }}
                transition={{ duration:0.5,delay:0.15+i*.08 }}
                whileHover={{ color:'white',y:-2 }}
                style={{ fontSize:'12px',fontWeight:500,color:'rgba(255,255,255,0.5)',textDecoration:'none',letterSpacing:'1px',textTransform:'uppercase' }}
              >{l}</motion.a>
            ))}
          </nav>

          <motion.button
            initial={{ opacity:0,scale:.9 }} animate={{ opacity:1,scale:1 }} transition={{ delay:.4 }}
            whileHover={{ scale:1.06 }} whileTap={{ scale:.95 }}
            style={{ display:'flex',alignItems:'center',gap:'8px',padding:'8px 16px',fontSize:'12px',fontWeight:600,color:'rgba(255,255,255,0.6)',border:'1px solid rgba(255,255,255,0.1)',background:'transparent',borderRadius:'9999px',cursor:'pointer' }}
          ><GitHubIcon size={14}/> GitHub</motion.button>
        </div>
      </motion.header>

      {/* HERO */}
      <section ref={heroRef} style={{ position:'relative',minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',paddingTop:'80px',paddingBottom:'128px',overflow:'hidden',background:'#05080f' }}>
        <DisasterCanvas />
        <motion.div style={{ position:'absolute',inset:0,pointerEvents:'none',opacity:heroFadeOpacity,background:'radial-gradient(ellipse 80% 60% at 50% 50%,rgba(5,8,15,0.45) 0%,rgba(5,8,15,0.92) 100%)' }} />
        <div style={{ position:'absolute',top:0,left:'50%',transform:'translateX(-50%)',width:'600px',height:'300px',borderRadius:'9999px',pointerEvents:'none',background:'radial-gradient(ellipse at 50% 0%,rgba(220,38,38,0.18) 0%,transparent 70%)' }} />

        <motion.div style={{ position:'relative',zIndex:10,maxWidth:'80rem',margin:'0 auto',padding:'0 1rem',textAlign:'center', y:heroParallaxY }}>

          {/* Badge */}
          <motion.div
            initial={{ opacity:0,scale:.7,y:20 }}
            animate={{ opacity:1,scale:1,y:0 }}
            transition={{ duration:.7,delay:.1,ease:[0.22,1,0.36,1] }}
            style={{ display:'inline-flex',alignItems:'center',gap:'8px',padding:'8px 16px',borderRadius:'9999px',border:'1px solid rgba(239,68,68,0.3)',background:'rgba(239,68,68,0.1)',color:'#f87171',fontSize:'12px',fontWeight:600,letterSpacing:'1px',textTransform:'uppercase',marginBottom:'40px' }}
          >
            <PulseDot /> Live Simulation Platform
          </motion.div>

          {/* Main headline — word by word */}
          <div style={{ fontSize:'clamp(2rem,8vw,4rem)',fontWeight:900,letterSpacing:'-1px',lineHeight:1.2,marginBottom:'12px' }}>
            <div style={{ marginBottom:'4px' }}>
              {['विपदं','पूर्वं','अभ्यस्य,'].map((w,i) => (
                <motion.span key={i}
                  initial={{ opacity:0,y:40,filter:'blur(10px)' }}
                  animate={{ opacity:1,y:0,filter:'blur(0px)' }}
                  transition={{ duration:.7,delay:.2+i*.09,ease:[0.22,1,0.36,1] }}
                  style={{ display:'inline-block',marginRight:'.3em',color:'white' }}
                >{w}</motion.span>
              ))}
            </div>
            <div>
              {['यत्','सा','त्वां','न','अभ्यसेत्'].map((w,i) => (
                <motion.span key={i}
                  initial={{ opacity:0,y:40,filter:'blur(10px)' }}
                  animate={{ opacity:1,y:0,filter:'blur(0px)' }}
                  transition={{ duration:.7,delay:.5+i*.08,ease:[0.22,1,0.36,1] }}
                  style={{ display:'inline-block',marginRight:'.3em' }}
                  className="kavach-shimmer"
                >{w}</motion.span>
              ))}
            </div>
          </div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity:0,filter:'blur(8px)' }}
            animate={{ opacity:1,filter:'blur(0px)' }}
            transition={{ duration:.8,delay:.95 }}
            style={{ fontSize:'16px',color:'rgba(255,255,255,0.4)',fontStyle:'italic',marginBottom:'32px',letterSpacing:'.5px' }}
          >
            "Rehearse the disaster before it rehearses you"
          </motion.p>

          {/* Description */}
          <motion.p
            initial={{ opacity:0,y:20 }}
            animate={{ opacity:1,y:0 }}
            transition={{ duration:.7,delay:1.05,ease:[0.22,1,0.36,1] }}
            style={{ fontSize:'16px',color:'rgba(255,255,255,0.55)',maxWidth:'48rem',margin:'0 auto 36px',lineHeight:1.6 }}
          >
            Kavach is a multi-agent disaster simulation platform that uses real government advisories to model how diverse populations respond to disasters.
          </motion.p>

          {/* CTA Buttons — magnetic */}
          <motion.div
            initial={{ opacity:0,y:24 }}
            animate={{ opacity:1,y:0 }}
            transition={{ duration:.7,delay:1.15,ease:[0.22,1,0.36,1] }}
            style={{ display:'flex',gap:'16px',justifyContent:'center',marginBottom:'32px',flexWrap:'wrap' }}
          >
            <MagneticButton onClick={() => navigate('/analysis')}
              style={{ display:'flex',alignItems:'center',gap:'12px',padding:'16px 36px',borderRadius:'9999px',fontWeight:700,fontSize:'14px',letterSpacing:'.5px',background:'linear-gradient(135deg,#dc2626 0%,#f97316 100%)',color:'white',boxShadow:'0 0 32px rgba(220,38,38,0.45),inset 0 1px 0 rgba(255,255,255,0.15)' }}
            ><span>▶</span> Start Analysis</MagneticButton>

            <MagneticButton style={{ padding:'16px 36px',borderRadius:'9999px',fontWeight:600,fontSize:'14px',border:'1px solid rgba(255,255,255,0.2)',background:'transparent',color:'rgba(255,255,255,0.8)' }}>
              About Us →
            </MagneticButton>
          </motion.div>

          {/* Stat pills — animated counters */}
          <motion.div
            initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:1.25,duration:.6 }}
            style={{ display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap' }}
          >
            {[{target:20,suffix:'+',label:'AI-generated agents'},{target:10,suffix:'+',label:'Simulation ticks'},{target:1,suffix:'',label:'Bottleneck report'}].map(({target,suffix,label},i) => (
              <motion.div key={label}
                initial={{ opacity:0,scale:.7,y:20 }}
                animate={{ opacity:1,scale:1,y:0 }}
                transition={{ duration:.55,delay:1.3+i*.1,ease:[0.22,1,0.36,1] }}
                whileHover={{ scale:1.07,borderColor:'rgba(249,115,22,0.35)' }}
                style={{ display:'flex',alignItems:'center',gap:'12px',padding:'12px 24px',borderRadius:'9999px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',backdropFilter:'blur(8px)' }}
              >
                <span style={{ fontSize:'24px',fontWeight:900,color:'#fb923c' }}>
                  <AnimatedCounter target={target} suffix={suffix} />
                </span>
                <span style={{ fontSize:'12px',color:'rgba(255,255,255,0.4)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.5px' }}>{label}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* PROBLEM SECTION */}
      <section id="the-problem" style={{ position:'relative',paddingTop:'112px',paddingBottom:'112px',background:'#07091a',borderTop:'1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth:'80rem',margin:'0 auto',padding:'0 1rem' }}>
          <div style={{ textAlign:'center',marginBottom:'80px' }}>
            <LabelReveal>The Problem</LabelReveal>
            <h2 style={{ fontSize:'clamp(2rem,6vw,3.5rem)',fontWeight:900,lineHeight:1.2,maxWidth:'64rem',margin:'0 auto' }}>
              <WordReveal text="India's Disaster Plans Are Written For" style={{ color:'white' }} delay={0.05} /><br/>
              <WordReveal text="The Wrong Disaster" style={{ backgroundImage:'linear-gradient(135deg,#ef4444,#f97316)',backgroundClip:'text',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent' }} delay={0.25} />
            </h2>
          </div>

          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once:true,margin:'-80px' }}
            style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:'24px',marginBottom:'80px' }}
          >
            {problems.map((p,i) => (
              <motion.div key={i} variants={item}>
                <TiltCard style={cardBase}>
                  <div style={{ width:'40px',height:'40px',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'24px',background:'linear-gradient(135deg,rgba(220,38,38,0.2),rgba(249,115,22,0.1))' }}>
                    <span style={{ color:'#fb923c',fontWeight:900,fontSize:'14px' }}>0{i+1}</span>
                  </div>
                  <h3 style={{ fontSize:'18px',fontWeight:700,marginBottom:'16px',color:'white' }}>{p.title}</h3>
                  <p style={{ fontSize:'14px',color:'rgba(255,255,255,0.45)',lineHeight:1.6 }}>{p.desc}</p>
                </TiltCard>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity:0,y:32,scale:.98 }}
            whileInView={{ opacity:1,y:0,scale:1 }}
            viewport={{ once:true,margin:'-60px' }}
            transition={{ duration:.8,ease:[0.22,1,0.36,1] }}
            style={{ padding:'48px',borderRadius:'24px',border:'1px solid rgba(239,68,68,0.2)',background:'rgba(220,38,38,0.04)',textAlign:'center' }}
          >
            <p style={{ fontSize:'16px',color:'rgba(255,255,255,0.7)',lineHeight:1.6,maxWidth:'64rem',margin:'0 auto' }}>
              The <span style={{ color:'white',fontWeight:700 }}>2013 Kedarnath disaster</span> killed over 5,000 people. The <span style={{ color:'white',fontWeight:700 }}>2021 Chamoli GLOF</span> wiped out entire villages. <span style={{ color:'#fb923c',fontWeight:700 }}>Joshimath is sinking right now.</span> The plans exist. No one has stress-tested them. <span style={{ color:'white',fontWeight:700 }}>Until now.</span>
            </p>
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ position:'relative',paddingTop:'112px',paddingBottom:'112px',background:'#05080f' }}>
        <div style={{ maxWidth:'80rem',margin:'0 auto',padding:'0 1rem' }}>
          <div style={{ textAlign:'center',marginBottom:'80px' }}>
            <LabelReveal>How It Works</LabelReveal>
            <h2 style={{ fontSize:'clamp(2rem,6vw,3.5rem)',fontWeight:900,lineHeight:1.2,maxWidth:'64rem',margin:'0 auto' }}>
              <WordReveal text="From PDF to Bottleneck Report" style={{ color:'white' }} delay={0.05} /><br/>
              <WordReveal text="In Under 30 Seconds" style={{ backgroundImage:'linear-gradient(135deg,#f97316,#fbbf24)',backgroundClip:'text',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent' }} delay={0.22} />
            </h2>
          </div>

          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once:true,margin:'-60px' }}
            style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'16px' }}
          >
            {steps.map((step,i) => (
              <motion.div key={i} variants={item}>
                <TiltCard style={{ ...cardBase,padding:'24px',display:'flex',flexDirection:'column',alignItems:'flex-start' }}>
                  <motion.div whileHover={{ rotate:[0,-12,12,0],scale:1.25 }} transition={{ duration:.35 }}
                    style={{ width:'48px',height:'48px',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:'12px',marginBottom:'16px',fontSize:'24px',background:'linear-gradient(135deg,rgba(249,115,22,0.15),rgba(220,38,38,0.1))' }}
                  >{step.icon}</motion.div>
                  <span style={{ fontSize:'10px',fontWeight:900,color:'rgba(251,146,60,0.6)',letterSpacing:'1px',marginBottom:'8px',textTransform:'uppercase' }}>{step.num}</span>
                  <h4 style={{ fontWeight:700,color:'white',marginBottom:'12px' }}>{step.title}</h4>
                  <p style={{ fontSize:'12px',color:'rgba(255,255,255,0.4)',lineHeight:1.5 }}>{step.desc}</p>
                </TiltCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ paddingTop:'80px',paddingBottom:'80px',background:'linear-gradient(to right,rgba(220,38,38,0.1) 0%,rgba(249,115,22,0.08) 100%)',textAlign:'center' }}>
        <motion.div
          initial={{ opacity:0,y:40 }}
          whileInView={{ opacity:1,y:0 }}
          viewport={{ once:true,margin:'-80px' }}
          transition={{ duration:.8,ease:[0.22,1,0.36,1] }}
          style={{ maxWidth:'56rem',margin:'0 auto',padding:'0 1rem' }}
        >
          <h2 style={{ fontSize:'clamp(1.5rem,5vw,3rem)',fontWeight:900,marginBottom:'24px',lineHeight:1.2 }}>
            <WordReveal text="Stress-test your disaster plan" style={{ color:'white' }} delay={0} /><br/>
            <WordReveal text="before the disaster does." style={{ backgroundImage:'linear-gradient(135deg,#ef4444,#f97316)',backgroundClip:'text',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent' }} delay={0.18} />
          </h2>
          <motion.p initial={{ opacity:0 }} whileInView={{ opacity:1 }} viewport={{ once:true }} transition={{ delay:.3,duration:.6 }}
            style={{ color:'rgba(255,255,255,0.5)',marginBottom:'40px',fontSize:'14px',lineHeight:1.6 }}
          >
            Upload any disaster advisory. Watch citizens survive or get trapped in real time. Get a report naming every gap.
          </motion.p>
          <MagneticButton onClick={() => navigate('/analysis')}
            style={{ padding:'16px 48px',borderRadius:'9999px',fontWeight:700,fontSize:'14px',background:'linear-gradient(135deg,#dc2626 0%,#f97316 100%)',color:'white',boxShadow:'0 0 40px rgba(220,38,38,0.4)' }}
          >▶ Start Analysis</MagneticButton>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer style={{ paddingTop:'40px',paddingBottom:'40px',borderTop:'1px solid rgba(255,255,255,0.06)',background:'#03040a' }}>
        <div style={{ maxWidth:'80rem',margin:'0 auto',padding:'0 1rem',display:'flex',flexDirection:'column',alignItems:'center',gap:'24px',textAlign:'center' }}>
          <p style={{ fontSize:'12px',color:'rgba(255,255,255,0.25)',lineHeight:1.6 }}>
            A multi-agent disaster simulation platform built for Uttarakhand and India's most disaster-prone regions.
          </p>
          <div style={{ display:'flex',gap:'16px' }}>
            {[TwitterIcon,GitHubIcon].map((Icon,i) => (
              <motion.a key={i} href="#" whileHover={{ scale:1.25,color:'white' }} style={{ color:'rgba(255,255,255,0.3)' }}>
                <Icon size={18}/>
              </motion.a>
            ))}
          </div>
        </div>
      </footer>

      <Chatbot />
    </div>
  );
}