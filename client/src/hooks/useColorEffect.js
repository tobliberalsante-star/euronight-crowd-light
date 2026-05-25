import { useState, useEffect, useRef, useCallback } from 'react';

// Per-device wave phase offset based on component mount time
const WAVE_OFFSET = (Date.now() % 30000) / 30000;

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function applyBrightness(hex, factor) {
  try {
    const [r, g, b] = hexToRgb(hex);
    return `rgb(${Math.round(r * factor)},${Math.round(g * factor)},${Math.round(b * factor)})`;
  } catch {
    return hex;
  }
}

export function useColorEffect(initialColor = '#000000') {
  const [displayColor, setDisplayColor] = useState(initialColor);

  // All mutable animation state lives in a ref so RAF closure is always fresh
  const s = useRef({
    type: 'solid',
    color: initialColor,
    speed: 1,
    waveOffset: WAVE_OFFSET,
    frameId: null,
    startTime: null,
  });

  const startAnimation = useCallback(() => {
    const st = s.current;
    if (st.frameId) cancelAnimationFrame(st.frameId);
    st.startTime = null;

    function tick(ts) {
      if (!st.startTime) st.startTime = ts;
      const t = (ts - st.startTime) / 1000;
      const speed = st.speed;
      let color = st.color;

      switch (st.type) {
        case 'strobe':
          color = Math.sin(t * Math.PI * 2 * speed * 5) > 0 ? st.color : '#000000';
          break;
        case 'rainbow':
          color = `hsl(${(t * speed * 60) % 360},100%,50%)`;
          break;
        case 'pulse':
          color = applyBrightness(st.color, (Math.sin(t * Math.PI * 2 * speed) + 1) / 2);
          break;
        case 'wave': {
          const hue = ((t * speed * 0.3 + st.waveOffset) * 360) % 360;
          color = `hsl(${hue},100%,50%)`;
          break;
        }
        default:
          return;
      }

      setDisplayColor(color);
      st.frameId = requestAnimationFrame(tick);
    }

    st.frameId = requestAnimationFrame(tick);
  }, []);

  const applyCommand = useCallback((cmd) => {
    const st = s.current;

    if (cmd.type === 'color') {
      st.type = 'solid';
      st.color = cmd.value;
      if (st.frameId) { cancelAnimationFrame(st.frameId); st.frameId = null; }
      setDisplayColor(cmd.value);

    } else if (cmd.type === 'effect') {
      st.type = cmd.value;
      if (cmd.color) st.color = cmd.color;
      st.speed = cmd.speed ?? 1;
      startAnimation();

    } else if (cmd.type === 'flash') {
      const prevType = st.type;
      if (st.frameId) { cancelAnimationFrame(st.frameId); st.frameId = null; }
      setDisplayColor('#ffffff');
      setTimeout(() => {
        if (prevType !== 'solid') {
          st.type = prevType;
          startAnimation();
        } else {
          setDisplayColor(st.color);
        }
      }, 80);
    }
  }, [startAnimation]);

  useEffect(() => {
    return () => {
      if (s.current.frameId) cancelAnimationFrame(s.current.frameId);
    };
  }, []);

  return { displayColor, applyCommand };
}
