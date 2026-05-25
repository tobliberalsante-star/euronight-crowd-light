import { useEffect, useRef } from 'react';

export function useWakeLock() {
  const lockRef = useRef(null);

  useEffect(() => {
    let active = true;

    async function acquire() {
      if (!active || !('wakeLock' in navigator)) return;
      try {
        lockRef.current = await navigator.wakeLock.request('screen');
        lockRef.current.addEventListener('release', () => {
          if (active) acquire(); // re-acquire automatically
        });
      } catch {
        // Silently ignore: some browsers / contexts don't support it
      }
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') acquire();
    };

    acquire();
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      active = false;
      document.removeEventListener('visibilitychange', onVisible);
      lockRef.current?.release();
    };
  }, []);
}
