import { useState, useCallback } from 'react';
import LiveControls from '../components/LiveControls';
import TimelineEditor from '../components/timeline/TimelineEditor';
import socket from '../socket';

export default function DirectorPage() {
  const [tab, setTab] = useState('live');

  const sendCommand = useCallback((cmd) => {
    socket.emit('command', cmd);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '12px 20px', background: '#16162a', borderBottom: '1px solid #2a2a4a', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', flexShrink: 0 }}>
        <h1 style={{ fontSize: '16px', fontWeight: 700, color: '#a88bfa', letterSpacing: '-0.01em' }}>
          Euronight Director
        </h1>
        <div style={{ display: 'flex', gap: '4px' }}>
          {['live', 'timeline'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: `1px solid ${tab === t ? '#6c63ff' : '#333355'}`,
                background: tab === t ? '#6c63ff22' : 'transparent',
                color: tab === t ? '#a88bfa' : '#666',
                fontSize: '13px',
                fontWeight: tab === t ? 600 : 400,
              }}
            >
              {t === 'live' ? 'Live' : 'Timeline'}
            </button>
          ))}
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'live'
          ? <LiveControls onSend={sendCommand} />
          : <TimelineEditor onSend={sendCommand} />
        }
      </div>
    </div>
  );
}
