import { useState, useEffect, useRef } from 'react';
import NoSleep from 'nosleep.js';
import socket from '../socket';
import { getEffectColor } from '../utils/effects';

const noSleep = new NoSleep();
const isIOSChrome = /CriOS/i.test(navigator.userAgent);

export default function ViewerPage() {
  const [bgColor, setBgColor]       = useState('#000000');
  const [brightness, setBrightness] = useState(1);
  const [isFlashing, setIsFlashing] = useState(false);
  const [showTap, setShowTap]       = useState(true);
  const [showSafariMsg, setShowSafariMsg] = useState(isIOSChrome);

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

    socket.on('init_state', ({ color, effect, speed, brightness: b }) => {
      st.current.color = color || '#000000';
      st.current.speed = speed ?? 5;
      setBrightness(b ?? 1);
      if (effect) {
        st.current.effect = effect;
        st.current.effectStartTime = Date.now();
      } else {
        st.current.effect = null;
        setBgColor(color || '#000000');
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

    return () => {
      socket.off('connect', onConnect);
      socket.off('init_state');
      socket.off('color_update');
      socket.off('effect_update');
      socket.off('effect_stop');
      socket.off('flash');
      socket.off('brightness_update');
    };
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
        filter: `brightness(${brightness})`,
        cursor: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
        WebkitTapHighlightColor: 'transparent',
        overflow: 'hidden',
      }}
    >
      {showTap && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '1.1rem', fontFamily: 'sans-serif', letterSpacing: '0.05em' }}>
            Touche l'écran
          </span>
        </div>
      )}

      {showSafariMsg && (
        <div
          onClick={e => { e.stopPropagation(); setShowSafariMsg(false); }}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.85)', color: '#fff', fontFamily: 'sans-serif', fontSize: '0.9rem', padding: '16px 20px', textAlign: 'center', lineHeight: 1.5, borderTop: '1px solid rgba(255,255,255,0.15)', zIndex: 10 }}
        >
          Pour un affichage plein écran, ouvre ce lien dans <strong>Safari</strong> puis "Partager → Sur l'écran d'accueil"
          <br />
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>Touche ici pour fermer</span>
        </div>
      )}
    </div>
  );
}
