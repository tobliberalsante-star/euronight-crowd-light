import { useState, useRef } from 'react';
import socket from '../socket';
import ColorPicker from './ColorPicker';

const QUICK_MESSAGES = [
  'BIENVENUE', 'BRAVO !', 'APPLAUDISSEZ', 'ON DANSE !',
  'SILENCE', 'MERCI', '🎉', '❤️',
];


const EFFECTS = [
  { id: 'rainbow',     label: 'Rainbow',    emoji: '🌈' },
  { id: 'strobe',      label: 'Strobe',     emoji: '⚡' },
  { id: 'pulse',       label: 'Pulse',      emoji: '💫' },
  { id: 'wave',        label: 'Vague',      emoji: '🌊' },
  { id: 'fire',        label: 'Feu',        emoji: '🔥' },
  { id: 'ocean',       label: 'Océan',      emoji: '🐋' },
  { id: 'disco',       label: 'Disco',      emoji: '🕺' },
  { id: 'aurora',      label: 'Aurore',     emoji: '🌌' },
  { id: 'gold',        label: 'Or',         emoji: '✨' },
  { id: 'heartbeat',   label: 'Cœur',       emoji: '💓' },
  { id: 'police',      label: 'Police',     emoji: '🚨' },
  { id: 'candlelight', label: 'Bougie',     emoji: '🕯️' },
  { id: 'matrix',      label: 'Matrix',     emoji: '💻' },
  { id: 'sunrise',     label: 'Lever',      emoji: '🌅' },
  { id: 'party',       label: 'Party',      emoji: '🎉' },
];

export default function LiveControls({ presets = [], onApplyPreset }) {
  const [activeColor, setActiveColor]   = useState('#ffffff');
  const [activeEffect, setActiveEffect] = useState(null);
  const [speed, setSpeed]               = useState(5);
  const [brightness, setBrightness]     = useState(1);
  const [textInput, setTextInput]       = useState('');
  const speedRef   = useRef(5);
  const bouquetRef = useRef(null);
  const prevRef    = useRef(null);

  // ── Couleur ───────────────────────────────────────────────────────────────

  function sendColor(color) {
    setActiveColor(color);
    setActiveEffect(null);
    socket.emit('set_color', { color });
  }

  // ── Effet ────────────────────────────────────────────────────────────────

  function sendEffect(effectId, overrideSpeed) {
    const s = overrideSpeed ?? speedRef.current;
    setActiveEffect(effectId);
    socket.emit('set_effect', { effect: effectId, speed: s });
  }

  function stopEffect() {
    setActiveEffect(null);
    socket.emit('stop_effect');
  }

  function handleSpeedChange(val) {
    speedRef.current = val;
    setSpeed(val);
    if (activeEffect) socket.emit('set_effect', { effect: activeEffect, speed: val });
  }

  // ── Luminosité ────────────────────────────────────────────────────────────

  function handleBrightness(val) {
    setBrightness(val);
    socket.emit('set_brightness', { value: val });
  }

  // ── Flash ────────────────────────────────────────────────────────────────

  function handleFlash() {
    for (let i = 0; i < 3; i++) setTimeout(() => socket.emit('flash'), i * 220);
  }

  // ── Moments spéciaux ─────────────────────────────────────────────────────

  function handleEntreeMaries() {
    sendColor('#ffffff');
    setTimeout(() => sendEffect('pulse', 2), 50);
  }

  function handlePremiereDanse() {
    sendEffect('gold', 3);
  }

  function handleBouquet() {
    prevRef.current = { color: activeColor, effect: activeEffect, speed: speedRef.current };
    sendEffect('party', 8);
    if (bouquetRef.current) clearTimeout(bouquetRef.current);
    bouquetRef.current = setTimeout(() => {
      const prev = prevRef.current;
      if (prev?.effect) sendEffect(prev.effect, prev.speed);
      else sendColor(prev?.color || '#ffffff');
    }, 10000);
  }

  function handleSlow() {
    sendEffect('candlelight', 3);
  }

  function handleFin() {
    sendEffect('fadeout', 5);
    setTimeout(() => { setActiveEffect(null); setActiveColor('#000000'); }, 5500);
  }

  function sendText(text) {
    setTextInput(text);
    socket.emit('set_text', { text });
  }

  function clearText() {
    setTextInput('');
    socket.emit('set_text', { text: '' });
  }

  return (
    <div style={{ padding: '16px', maxWidth: '640px', margin: '0 auto' }}>

      {/* Presets */}
      {presets.length > 0 && (
        <section style={card}>
          <h2 style={cardTitle}>Mes presets</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {presets.map(p => (
              <button
                key={p.id}
                onClick={() => onApplyPreset(p)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 8, background: '#1a1a2e', border: '1px solid #333355', color: '#e0e0f0', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                {p.name}
                {p.effect && <span style={{ fontSize: 11, color: '#666', fontWeight: 400 }}>{p.effect}</span>}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Couleurs */}
      <section style={card}>
        <h2 style={cardTitle}>Couleurs</h2>
        <ColorPicker color={activeColor} onChange={sendColor} />
      </section>

      {/* Effets */}
      <section style={card}>
        <h2 style={cardTitle}>Effets</h2>
        <div style={{ marginBottom: 10 }}>
          <span style={{ color: '#888', fontSize: 12 }}>Vitesse : {speed}</span>
          <input type="range" min={1} max={10} value={speed}
            onChange={e => handleSpeedChange(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#6c63ff', marginTop: 4 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          {EFFECTS.map(({ id, label, emoji }) => (
            <button
              key={id}
              onClick={() => activeEffect === id ? stopEffect() : sendEffect(id)}
              style={{
                padding: '10px 4px', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                border: `1px solid ${activeEffect === id ? '#6c63ff' : '#2a2a4a'}`,
                background: activeEffect === id ? '#6c63ff22' : '#1a1a2e',
              }}
            >
              <span style={{ fontSize: 20 }}>{emoji}</span>
              <span style={{ fontSize: 10, color: activeEffect === id ? '#a88bfa' : '#666', fontWeight: activeEffect === id ? 700 : 400 }}>{label}</span>
            </button>
          ))}
        </div>
        {activeEffect && (
          <button onClick={stopEffect} style={{ marginTop: 10, width: '100%', padding: '8px', background: '#2a1a1a', border: '1px solid #ff4757', borderRadius: 6, color: '#ff4757', fontSize: 13 }}>
            ⏹ Stopper l'effet
          </button>
        )}
      </section>

      {/* Luminosité */}
      <section style={card}>
        <h2 style={cardTitle}>Luminosité — {Math.round(brightness * 100)}%</h2>
        <input type="range" min={0} max={1} step={0.01} value={brightness}
          onChange={e => handleBrightness(Number(e.target.value))}
          style={{ width: '100%', accentColor: '#6c63ff' }} />
      </section>

      {/* Texte */}
      <section style={card}>
        <h2 style={cardTitle}>Texte sur les écrans</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {QUICK_MESSAGES.map(msg => (
            <button
              key={msg}
              onClick={() => sendText(msg)}
              style={{ padding: '6px 12px', borderRadius: 6, background: textInput === msg ? '#6c63ff' : '#1a1a2e', border: `1px solid ${textInput === msg ? '#6c63ff' : '#333355'}`, color: '#fff', fontSize: 13, cursor: 'pointer' }}
            >
              {msg}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendText(textInput)}
            placeholder="Texte libre…"
            style={{ flex: 1, padding: '8px 12px', background: '#0a0a0f', border: '1px solid #333355', borderRadius: 6, color: '#e0e0f0', fontSize: 14 }}
          />
          <button onClick={() => sendText(textInput)} style={{ padding: '8px 14px', background: '#6c63ff', borderRadius: 6, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Envoyer
          </button>
          <button onClick={clearText} style={{ padding: '8px 14px', background: '#2a2a4a', border: '1px solid #333355', borderRadius: 6, color: '#aaa', fontSize: 13, cursor: 'pointer' }}>
            Effacer
          </button>
        </div>
      </section>

      {/* Moments spéciaux */}
      <section style={card}>
        <h2 style={cardTitle}>Moments spéciaux</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button style={momentBtn('#ff4757')} onClick={handleFlash}>⚡ Flash ×3</button>
          <button style={momentBtn('#a855f7')} onClick={handleEntreeMaries}>💍 Entrée mariés</button>
          <button style={momentBtn('#f0c060')} onClick={handlePremiereDanse}>💃 Première danse</button>
          <button style={momentBtn('#2ef0a0')} onClick={handleBouquet}>🎉 Bouquet (10s)</button>
          <button style={momentBtn('#00bfff')} onClick={handleSlow}>🕯️ Slow</button>
          <button style={momentBtn('#888888')} onClick={handleFin}>🏁 Fin (fade)</button>
        </div>
      </section>
    </div>
  );
}

const card      = { marginBottom: 16, background: '#16162a', borderRadius: 10, padding: 14, border: '1px solid #1e1e38' };
const cardTitle = { fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 };

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const momentBtn = bg => ({ padding: '12px 8px', background: hexToRgba(bg, 0.15), border: `1px solid ${bg}`, borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' });
