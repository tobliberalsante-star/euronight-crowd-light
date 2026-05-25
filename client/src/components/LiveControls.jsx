import { useState } from 'react';
import ColorPicker from './ColorPicker';

const EFFECTS = [
  { id: 'solid',   label: 'Solid' },
  { id: 'strobe',  label: 'Strobe' },
  { id: 'rainbow', label: 'Rainbow' },
  { id: 'pulse',   label: 'Pulse' },
  { id: 'wave',    label: 'Wave' },
];

export default function LiveControls({ onSend }) {
  const [color, setColor] = useState('#ff0000');
  const [effect, setEffect] = useState('solid');
  const [speed, setSpeed] = useState(1);

  function sendColor(c) {
    setColor(c);
    if (effect === 'solid') onSend({ type: 'color', value: c });
    else onSend({ type: 'effect', value: effect, color: c, speed });
  }

  function sendEffect(e) {
    setEffect(e);
    if (e === 'solid') onSend({ type: 'color', value: color });
    else onSend({ type: 'effect', value: e, color, speed });
  }

  function sendSpeed(s) {
    setSpeed(s);
    if (effect !== 'solid') onSend({ type: 'effect', value: effect, color, speed: s });
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>

      <section style={card}>
        <h2 style={cardTitle}>Couleur</h2>
        <ColorPicker color={color} onChange={sendColor} />
      </section>

      <section style={card}>
        <h2 style={cardTitle}>Effet</h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {EFFECTS.map(e => (
            <button key={e.id} style={effectBtn(effect === e.id)} onClick={() => sendEffect(e.id)}>
              {e.label}
            </button>
          ))}
        </div>
      </section>

      {effect !== 'solid' && (
        <section style={card}>
          <h2 style={cardTitle}>Vitesse — {speed.toFixed(1)}×</h2>
          <input
            type="range" min="0.2" max="5" step="0.1" value={speed}
            onChange={e => sendSpeed(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#6c63ff' }}
          />
        </section>
      )}

      <section style={card}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            style={{ flex: 1, padding: '22px', fontSize: '22px', fontWeight: 700, background: '#ff4757', color: '#fff', borderRadius: '12px' }}
            onPointerDown={() => onSend({ type: 'flash' })}
          >
            ⚡ Flash
          </button>
          <button
            style={{ flex: 1, padding: '22px', fontSize: '22px', fontWeight: 700, background: '#111', color: '#fff', border: '2px solid #333', borderRadius: '12px' }}
            onClick={() => { setEffect('solid'); setColor('#000000'); onSend({ type: 'color', value: '#000000' }); }}
          >
            ■ Black
          </button>
        </div>
      </section>
    </div>
  );
}

const card = { marginBottom: '20px', background: '#16162a', borderRadius: '12px', padding: '16px' };
const cardTitle = { fontSize: '11px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' };
const effectBtn = active => ({
  padding: '8px 18px',
  borderRadius: '8px',
  border: `1px solid ${active ? '#6c63ff' : '#333355'}`,
  background: active ? '#6c63ff' : '#1a1a2e',
  color: active ? '#fff' : '#888',
  fontSize: '14px',
  fontWeight: active ? 600 : 400,
  transition: 'all 0.12s',
});
