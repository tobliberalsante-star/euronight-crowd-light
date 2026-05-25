import { useEffect } from 'react';
import { useWakeLock } from '../hooks/useWakeLock';
import { useColorEffect } from '../hooks/useColorEffect';
import socket from '../socket';

export default function ViewerPage() {
  useWakeLock();
  const { displayColor, applyCommand } = useColorEffect('#000000');

  useEffect(() => {
    socket.on('command', applyCommand);
    return () => { socket.off('command', applyCommand); };
  }, [applyCommand]);

  function handleTap() {
    // Enter fullscreen on first tap (required gesture for mobile)
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  }

  return (
    <div
      onClick={handleTap}
      style={{
        position: 'fixed',
        inset: 0,
        background: displayColor,
        cursor: 'none',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'none',
      }}
    />
  );
}
