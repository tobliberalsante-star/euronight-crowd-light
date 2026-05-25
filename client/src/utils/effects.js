// Calcule la couleur d'un effet animé à l'instant t (ms depuis le début de l'effet)
// phase : offset 0-1 par device (basé sur socket.id) pour créer des décalages entre téléphones

export function getEffectColor(effect, t, phase, speed, baseColor) {
  const s = Math.max(1, Math.min(10, speed));

  switch (effect) {
    case 'rainbow': {
      const hue = ((t * s * 0.05) + phase * 360) % 360;
      return `hsl(${hue},100%,50%)`;
    }
    case 'strobe': {
      const period = Math.max(40, 1000 / s);
      return Math.floor(t / period) % 2 === 0 ? '#ffffff' : '#000000';
    }
    case 'pulse': {
      const factor = 0.15 + 0.85 * (0.5 + 0.5 * Math.sin(t * s * 0.001 * Math.PI * 2 * 0.5));
      return blendWithBlack(baseColor, factor);
    }
    case 'wave': {
      const factor = 0.15 + 0.85 * (0.5 + 0.5 * Math.sin(t * s * 0.001 * Math.PI * 2 * 0.5 + phase * Math.PI * 2));
      return blendWithBlack(baseColor, factor);
    }
    case 'fire': {
      const noise = Math.sin(t * 0.017) + Math.sin(t * 0.0234 * s) + Math.sin(t * 0.037 * s);
      const hue = 8 + ((noise + 3) / 6) * 35;
      const lightness = 35 + ((Math.sin(t * 0.011 * s + phase) + 1) / 2) * 30;
      return `hsl(${hue},100%,${lightness}%)`;
    }
    case 'ocean': {
      const wave = Math.sin(t * s * 0.0008 + phase * Math.PI * 2);
      const hue = 200 + wave * 20;
      const lightness = 25 + ((wave + 1) / 2) * 30;
      return `hsl(${hue},70%,${lightness}%)`;
    }
    case 'disco': {
      const period = Math.max(80, 1000 / s);
      const step = Math.floor(t / period);
      const seed = (step * 7919 + Math.floor(phase * 10000)) >>> 0;
      const hue = (seed * 137) % 360;
      return `hsl(${hue},100%,60%)`;
    }
    case 'aurora': {
      const cycle = ((t * s * 0.0003) + phase) % 1;
      const hue = 120 + cycle * 180;
      return `hsl(${hue},80%,55%)`;
    }
    case 'gold': {
      const factor = 0.5 + 0.5 * Math.sin(t * s * 0.002);
      const hue = 40 + factor * 15;
      const lightness = 45 + factor * 25;
      return `hsl(${hue},85%,${lightness}%)`;
    }
    case 'heartbeat': {
      const period = Math.max(400, 2000 / s);
      const pt = (t % period) / period;
      let intensity;
      if      (pt < 0.08) intensity = pt / 0.08;
      else if (pt < 0.16) intensity = 1 - (pt - 0.08) / 0.08;
      else if (pt < 0.24) intensity = (pt - 0.16) / 0.08;
      else if (pt < 0.32) intensity = 1 - (pt - 0.24) / 0.08;
      else                intensity = 0;
      return blendWithBlack(baseColor, 0.05 + 0.95 * intensity);
    }
    case 'police': {
      const period = Math.max(80, 600 / s);
      return Math.floor(t / period) % 2 === 0 ? '#ff0000' : '#0055ff';
    }
    case 'candlelight': {
      const f1 = Math.sin(t * 0.013);
      const f2 = Math.sin(t * 0.0234) * 0.5;
      const flicker = f1 + f2;
      return `hsl(${28 + flicker * 6},90%,${42 + flicker * 12}%)`;
    }
    case 'matrix': {
      const noise = Math.sin(t * 0.015 * s + phase) + Math.sin(t * 0.0234 * s) * 0.5;
      const lightness = 15 + ((noise + 1.5) / 3) * 50;
      return `hsl(120,100%,${lightness}%)`;
    }
    case 'sunrise': {
      const cycle = ((t * s * 0.0002) + phase) % 1;
      if (cycle < 0.3) {
        const f = cycle / 0.3;
        return `rgb(${Math.round(60 * f)},0,0)`;
      } else if (cycle < 0.6) {
        const f = (cycle - 0.3) / 0.3;
        return `rgb(${Math.round(60 + 195 * f)},${Math.round(80 * f)},0)`;
      } else {
        const f = (cycle - 0.6) / 0.4;
        return `rgb(255,${Math.round(80 + 175 * f)},${Math.round(200 * f)})`;
      }
    }
    case 'party': {
      const hue = ((t * s * 0.12) + phase * 360) % 360;
      const flashPeriod = Math.max(400, 3000 / s);
      return (t % flashPeriod) < 80 ? '#ffffff' : `hsl(${hue},100%,55%)`;
    }
    case 'fadeout': {
      return blendWithBlack(baseColor, Math.max(0, 1 - t / 5000));
    }
    default:
      return baseColor;
  }
}

function blendWithBlack(hex, factor) {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return `rgb(0,0,0)`;
  const f = Math.max(0, Math.min(1, factor));
  const n = parseInt(hex.replace('#', ''), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`;
}
