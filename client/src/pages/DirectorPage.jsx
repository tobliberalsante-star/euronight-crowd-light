import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import LiveControls from '../components/LiveControls';
import TimelineEditor from '../components/timeline/TimelineEditor';
import socket from '../socket';

export default function DirectorPage() {
  const [tab, setTab]               = useState('live');
  const [viewerCount, setViewerCount] = useState(0);
  const [showQR, setShowQR]         = useState(false);

  const viewerUrl = `${window.location.protocol}//${window.location.host}`;

  useEffect(() => {
    const onConnect = () => socket.emit('register_admin');
    if (socket.connected) onConnect();
    socket.on('connect', onConnect);
    socket.on('viewer_count', ({ count }) => setViewerCount(count));
    return () => {
      socket.off('connect', onConnect);
      socket.off('viewer_count');
    };
  }, []);

  // Translator : commandes timeline → événements socket du nouveau protocole
  function sendCommand(cmd) {
    if (cmd.type === 'color')  socket.emit('set_color', { color: cmd.value });
    else if (cmd.type === 'effect') socket.emit('set_effect', { effect: cmd.value, speed: cmd.speed ?? 5 });
    else if (cmd.type === 'flash')  socket.emit('flash');
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '10px 16px', background: '#16162a', borderBottom: '1px solid #2a2a4a', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flexShrink: 0 }}>
        <h1 style={{ fontSize: '15px', fontWeight: 700, color: '#a88bfa', margin: 0 }}>Euronight Director</h1>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4 }}>
          {['live', 'timeline'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={tabStyle(tab === t)}>
              {t === 'live' ? 'Live' : 'Timeline'}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Viewer count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: viewerCount > 0 ? '#2ed573' : '#444', display: 'inline-block' }} />
          <span style={{ color: '#888', fontSize: 13 }}>{viewerCount} connecté{viewerCount !== 1 ? 's' : ''}</span>
        </div>

        {/* QR Button */}
        <button onClick={() => setShowQR(true)} style={{ padding: '5px 10px', background: '#1a1a2e', border: '1px solid #333355', borderRadius: 6, color: '#aaa', fontSize: 13, cursor: 'pointer' }}>
          QR Code
        </button>
      </header>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'live'
          ? <LiveControls />
          : <TimelineEditor onSend={sendCommand} />
        }
      </div>

      {/* QR Modal */}
      {showQR && (
        <div onClick={() => setShowQR(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 200, gap: 16 }}>
          <QRCodeSVG value={viewerUrl} size={280} bgColor="#ffffff" fgColor="#000000" />
          <p style={{ color: '#ccc', fontFamily: 'monospace', fontSize: 14 }}>{viewerUrl}</p>
          <p style={{ color: '#666', fontSize: 13 }}>Toucher pour fermer</p>
        </div>
      )}
    </div>
  );
}

const tabStyle = active => ({
  padding: '5px 14px', borderRadius: 6,
  border: `1px solid ${active ? '#6c63ff' : '#333355'}`,
  background: active ? '#6c63ff22' : 'transparent',
  color: active ? '#a88bfa' : '#666',
  fontSize: 13, fontWeight: active ? 600 : 400, cursor: 'pointer',
});
