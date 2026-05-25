const PRESETS = [
  '#ff0000', '#ff4500', '#ff8c00', '#ffd700',
  '#aaff00', '#00ff88', '#00ffff', '#00aaff',
  '#0000ff', '#8800ff', '#ff00aa', '#ffffff',
  '#ff6b6b', '#ffa07a', '#ffe066', '#b5ead7',
];

export default function ColorPicker({ color, onChange }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '8px', marginBottom: '12px' }}>
        {PRESETS.map(c => (
          <button
            key={c}
            onClick={() => onChange(c)}
            title={c}
            style={{
              width: '100%',
              aspectRatio: '1',
              background: c,
              borderRadius: '6px',
              border: `2px solid ${color === c ? '#ffffff' : 'transparent'}`,
              boxShadow: color === c ? `0 0 0 1px ${c}` : 'none',
              transition: 'border-color 0.1s',
            }}
          />
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <input
          type="color"
          value={color}
          onChange={e => onChange(e.target.value)}
          style={{ width: '44px', height: '40px', border: 'none', background: 'none', cursor: 'pointer', borderRadius: '6px', padding: 0 }}
        />
        <input
          type="text"
          value={color}
          maxLength={7}
          onChange={e => {
            if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onChange(e.target.value);
          }}
          style={{ flex: 1, padding: '8px 12px', background: '#0a0a0f', border: '1px solid #333355', borderRadius: '6px', color: '#e0e0f0', fontFamily: 'monospace', fontSize: '14px' }}
        />
        <div style={{ width: '40px', height: '40px', background: color, borderRadius: '6px', border: '1px solid #333355', flexShrink: 0 }} />
      </div>
    </div>
  );
}
