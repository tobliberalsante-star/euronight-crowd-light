const PRESETS = [
  '#ffffff', '#000000', '#ff1a1a', '#ff69b4',
  '#f0c060', '#ffe566', '#2ef0a0', '#3f6cff',
  '#00bfff', '#a855f7', '#ff8c42', '#ff6b6b',
  '#00ffff', '#aaff00', '#ff00ff', '#ff8c00',
];

export default function ColorPicker({ color, onChange }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 8, marginBottom: 12 }}>
        {PRESETS.map(c => (
          <button
            key={c}
            onClick={() => onChange(c)}
            title={c}
            style={{
              width: '100%', aspectRatio: '1', background: c, borderRadius: 6,
              border: `2px solid ${color === c ? '#ffffff' : c === '#000000' ? '#444' : 'transparent'}`,
              boxShadow: color === c ? `0 0 0 1px ${c}` : 'none',
              transition: 'border-color 0.1s',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input
          type="color"
          value={color}
          onChange={e => onChange(e.target.value)}
          style={{ width: 44, height: 40, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 6, padding: 0 }}
        />
        <input
          type="text"
          value={color}
          maxLength={7}
          onChange={e => { if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onChange(e.target.value); }}
          style={{ flex: 1, padding: '8px 12px', background: '#0a0a0f', border: '1px solid #333355', borderRadius: 6, color: '#e0e0f0', fontFamily: 'monospace', fontSize: 14 }}
          placeholder="#rrggbb"
        />
        <div style={{ width: 40, height: 40, background: color, borderRadius: 6, border: '1px solid #333355', flexShrink: 0 }} />
      </div>
    </div>
  );
}
