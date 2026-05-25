import { useState } from 'react';
import socket from '../socket';
import ColorPicker from './ColorPicker';

const EFFECTS = [
  { id: null,          label: 'Solid',    emoji: '⬛' },
  { id: 'rainbow',    label: 'Rainbow',  emoji: '🌈' },
  { id: 'strobe',     label: 'Strobe',   emoji: '⚡' },
  { id: 'pulse',      label: 'Pulse',    emoji: '💫' },
  { id: 'wave',       label: 'Vague',    emoji: '🌊' },
  { id: 'fire',       label: 'Feu',      emoji: '🔥' },
  { id: 'ocean',      label: 'Océan',    emoji: '🐋' },
  { id: 'disco',      label: 'Disco',    emoji: '🕺' },
  { id: 'aurora',     label: 'Aurore',   emoji: '🌌' },
  { id: 'gold',       label: 'Or',       emoji: '✨' },
  { id: 'heartbeat',  label: 'Cœur',     emoji: '💓' },
  { id: 'police',     label: 'Police',   emoji: '🚨' },
  { id: 'candlelight',label: 'Bougie',   emoji: '🕯️' },
  { id: 'matrix',     label: 'Matrix',   emoji: '💻' },
  { id: 'sunrise',    label: 'Lever',    emoji: '🌅' },
  { id: 'party',      label: 'Party',    emoji: '🎉' },
];

export default function PresetManager({ presets, onSave, onDelete }) {
  const [name, setName]     = useState('');
  const [color, setColor]   = useState('#ff0000');
  const [effect, setEffect] = useState(null);
  const [speed, setSpeed]   = useState(5);

  function preview() {
    if (effect) socket.emit('set_effect', { effect, speed });
    else socket.emit('set_color', { color });
  }

  function save() {
    if (!name.trim()) return;
    onSave({ id: crypto.randomUUID(), name: name.trim(), color, effect, speed });
    setName('');
  }

  return (
    <div style={{ padding: 16, maxWidth: 640, margin: '0 auto' }}>

      {/* Création */}
      <section style={card}>
        <h2 style={cardTitle}>Créer un preset</h2>

        <p style={label}>Couleur</p>
        <ColorPicker color={color} onChange={setColor} />

        <p style={{ ...label, marginTop: 16 }}>Effet</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {EFFECTS.map(e => (
            <button key={String(e.id)} onClick={() => setEffect(e.id)} style={chip(effect === e.id)}>
              {e.emoji} {e.label}
            </button>
          ))}
        </div>

        {effect && (
          <div style={{ marginBottom: 12 }}>
            <p style={label}>Vitesse — {speed}</p>
            <input type="range" min={1} max={10} value={speed}
              onChange={e => setSpeed(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#6c63ff' }} />
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && save()}
            placeholder="Nom du preset (ex: Drop, Romantique…)"
            style={{ flex: 1, minWidth: 160, padding: '8px 12px', background: '#0a0a0f', border: '1px solid #333355', borderRadius: 6, color: '#e0e0f0', fontSize: 14 }}
          />
          <button onClick={preview} style={btn('#2a2a4a', '#333355')}>Aperçu</button>
          <button onClick={save} style={btn('#6c63ff', 'transparent')}>Sauvegarder</button>
        </div>
      </section>

      {/* Liste */}
      {presets.length > 0 && (
        <section style={card}>
          <h2 style={cardTitle}>Presets sauvegardés — {presets.length}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {presets.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#0d0d1a', borderRadius: 8, border: '1px solid #1e1e38' }}>
                <div style={{ width: 30, height: 30, background: p.color, borderRadius: 6, flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#e0e0f0', fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                  <div style={{ color: '#555', fontSize: 11, marginTop: 2 }}>
                    {p.effect ? `${p.effect} · vitesse ${p.speed}` : 'Couleur solide'} · {p.color}
                  </div>
                </div>
                <button onClick={() => onDelete(p.id)} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid #3a1a1a', borderRadius: 6, color: '#ff4757', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>
                  Supprimer
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {presets.length === 0 && (
        <p style={{ textAlign: 'center', color: '#444', fontSize: 13, marginTop: 8 }}>
          Aucun preset — crée-en un ci-dessus
        </p>
      )}
    </div>
  );
}

const card     = { marginBottom: 16, background: '#16162a', borderRadius: 10, padding: 14, border: '1px solid #1e1e38' };
const cardTitle = { fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 };
const label    = { fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 };
const btn      = (bg, border) => ({ padding: '8px 14px', background: bg, border: `1px solid ${border}`, borderRadius: 6, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' });
const chip     = active => ({ padding: '5px 10px', borderRadius: 20, border: `1px solid ${active ? '#6c63ff' : '#2a2a4a'}`, background: active ? '#6c63ff22' : 'transparent', color: active ? '#a88bfa' : '#666', fontSize: 12, cursor: 'pointer' });
