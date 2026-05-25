import { useState, useEffect, useRef } from 'react';
import NoSleep from 'nosleep.js';
import socket from '../socket';
import { getEffectColor } from '../utils/effects';

const noSleep = new NoSleep();
const isIOSChrome = /CriOS/i.test(navigator.userAgent);

export default function ViewerPage() {
  const [bgColor, setBgColor]       = useState('#000000');
  const [brightness, setBrightness] = useState(1);
  const [displayText, setDisplayText] = useState('');
  const [isFlashing, setIsFlashing] = useState(false);
  const [showTap, setShowTap]       = useState(true);
  const [showSafariMsg, setShowSafariMsg] = useState(isIOSChrome);
  const [countdownLabel, setCountdownLabel] = useState('');
  const countdownEndRef = useRef(null);

  const st = useRef({
    color: '#000000',
    effect: null,
    speed: 5,
    phase: 0,
    effectStartTime: 0,
  });

  // ── RAF animation loop ───────────────────────────────────────────────────
  useEffect(() => {
    let rafId;
    function loop() {
      const s = st.current;
      if (s.effect) {
        const t = Date.now() - s.effectStartTime;
        setBgColor(getEffectColor(s.effect, t, s.phase, s.speed, s.color));
        if (s.effect === 'fadeout' && t >= 5200) {
          s.effect = null;
          s.color = '#000000';
          setBgColor('#000000');
        }
      }
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // ── Socket events ────────────────────────────────────────────────────────
  useEffect(() => {
    function onConnect() {
      socket.emit('register_viewer');
      // Dérive un offset de phase unique depuis socket.id pour l'effet wave
      const id = socket.id || '0000';
      st.current.phase = parseInt(id.slice(-4), 16) / 65535;
    }

    if (socket.connected) onConnect();
    socket.on('connect', onConnect);

    socket.on('init_state', ({ color, effect, speed, brightness: b, text, countdown }) => {
      st.current.color = color || '#000000';
      st.current.speed = speed ?? 5;
      setBrightness(b ?? 1);
      setDisplayText(text ?? '');
      if (effect) {
        st.current.effect = effect;
        st.current.effectStartTime = Date.now();
      } else {
        st.current.effect = null;
        setBgColor(color || '#000000');
      }
      if (countdown?.endsAt && countdown.endsAt > Date.now()) {
        countdownEndRef.current = countdown.endsAt;
      }
    });

    socket.on('color_update', ({ color }) => {
      st.current.color = color;
      st.current.effect = null;
      setBgColor(color);
    });

    socket.on('effect_update', ({ effect, speed }) => {
      st.current.effect = effect;
      if (speed !== undefined) st.current.speed = speed;
      st.current.effectStartTime = Date.now();
    });

    socket.on('effect_stop', () => {
      st.current.effect = null;
      setBgColor(st.current.color);
    });

    socket.on('flash', () => {
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 120);
    });

    socket.on('brightness_update', ({ value }) => setBrightness(value));
    socket.on('text_update', ({ text }) => setDisplayText(text ?? ''));

    socket.on('countdown_start', ({ endsAt }) => {
      countdownEndRef.current = endsAt;
    });

    socket.on('countdown_stop', () => {
      countdownEndRef.current = null;
      setCountdownLabel('');
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('init_state');
      socket.off('color_update');
      socket.off('effect_update');
      socket.off('effect_stop');
      socket.off('flash');
      socket.off('brightness_update');
      socket.off('text_update');
      socket.off('countdown_start');
      socket.off('countdown_stop');
    };
  }, []);

  // ── Countdown ticker ─────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      const endsAt = countdownEndRef.current;
      if (!endsAt) return;
      const remaining = Math.ceil((endsAt - Date.now()) / 1000);
      if (remaining > 0) {
        setCountdownLabel(String(remaining));
      } else if (remaining > -3) {
        setCountdownLabel('GO !');
      } else {
        countdownEndRef.current = null;
        setCountdownLabel('');
      }
    }, 100);
    return () => clearInterval(id);
  }, []);

  function handleClick() {
    setShowTap(false);
    noSleep.enable();
    document.documentElement.requestFullscreen?.().catch(() => {});
  }

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: isFlashing ? '#ffffff' : bgColor,
        cursor: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
        WebkitTapHighlightColor: 'transparent',
        overflow: 'hidden',
      }}
    >
      {/* Overlay noir dont l'opacité simule la luminosité — fiable sur tous les navigateurs */}
      {brightness < 1 && (
        <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: 1 - brightness, pointerEvents: 'none', zIndex: 5 }} />
      )}

      {/* Compte à rebours */}
      {countdownLabel ? (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 15 }}>
          <span style={{
            color: '#ffffff',
            fontSize: 'clamp(6rem, 40vw, 22rem)',
            fontFamily: 'system-ui, sans-serif',
            fontWeight: 900,
            textAlign: 'center',
            letterSpacing: '-0.04em',
            lineHeight: 1,
            textShadow: '0 4px 40px rgba(0,0,0,0.9), 0 0 80px rgba(0,0,0,0.6)',
          }}>
            {countdownLabel}
          </span>
        </div>
      ) : null}

      {/* Texte affiché par le régisseur */}
      {!countdownLabel && displayText ? (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 10, padding: '0 5vw' }}>
          <span style={{
            color: '#ffffff',
            fontSize: 'clamp(2rem, 12vw, 8rem)',
            fontFamily: 'system-ui, sans-serif',
            fontWeight: 900,
            textAlign: 'center',
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            textShadow: '0 2px 20px rgba(0,0,0,0.8), 0 0 60px rgba(0,0,0,0.5)',
            wordBreak: 'break-word',
          }}>
            {displayText}
          </span>
        </div>
      ) : !countdownLabel && showTap && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 10 }}>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '1.1rem', fontFamily: 'sans-serif', letterSpacing: '0.05em' }}>
            Touche l'écran
          </span>
        </div>
      )}

      {showSafariMsg && (
        <div
          onClick={e => { e.stopPropagation(); setShowSafariMsg(false); }}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.85)', color: '#fff', fontFamily: 'sans-serif', fontSize: '0.9rem', padding: '16px 20px', textAlign: 'center', lineHeight: 1.5, borderTop: '1px solid rgba(255,255,255,0.15)', zIndex: 20 }}
        >
          Pour un affichage plein écran, ouvre ce lien dans <strong>Safari</strong> puis "Partager → Sur l'écran d'accueil"
          <br />
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>Touche ici pour fermer</span>
        </div>
      )}
    </div>
  );
}
