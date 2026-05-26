import { useState, useRef, useEffect, useCallback } from 'react';

// ─── Constants ──────────────────────────────────────────────────────────────

const EFFECT_NAMES = ['strobe', 'rainbow', 'pulse', 'wave'];
const PRESET_COLORS = ['#ff0000', '#ff8c00', '#ffd700', '#00ff88', '#00aaff', '#8800ff', '#ffffff', '#ff00aa'];

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toFixed(1).padStart(4, '0');
  return `${m}:${s}`;
}

function eventToCommand(ev) {
  if (ev.type === 'color') return { type: 'color', value: ev.value };
  return { type: 'effect', value: ev.value, color: ev.color ?? '#ff0000', speed: ev.speed ?? 1 };
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function TimelineEditor({ onSend }) {
  const [events, setEvents]           = useState([]);
  const [selectedId, setSelectedId]   = useState(null);
  const [duration, setDuration]       = useState(60);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying]     = useState(false);
  const [scale, setScale]             = useState(40);       // px/sec
  const [audioUrl, setAudioUrl]       = useState(null);
  const [audioName, setAudioName]     = useState('');
  const [timelineName, setTimelineName] = useState('ma-timeline');
  const [savedList, setSavedList]     = useState([]);
  const [modal, setModal]             = useState(null);     // { time, event | null }
  const [dragging, setDragging]       = useState(null);    // { id, startX, startTime }

  const audioRef      = useRef(null);
  const trackRef      = useRef(null);
  const rafRef        = useRef(null);
  const scrollRef     = useRef(null);
  const playStartRef  = useRef(null); // Date.now() - currentTime*1000 at play start

  // Load saved timeline names on mount
  useEffect(() => {
    fetch('/api/timelines').then(r => r.json()).then(setSavedList).catch(() => {});
  }, []);

  // ── Audio ──────────────────────────────────────────────────────────────────

  function handleAudioFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(URL.createObjectURL(file));
    setAudioName(file.name);
  }

  function handleMetadata() {
    if (audioRef.current?.duration) setDuration(audioRef.current.duration);
  }

  // ── Playback engine (timer-based — audio optionnel) ──────────────────────

  useEffect(() => {
    if (!isPlaying) return;
    const fired = new Set();
    const sorted = [...events].sort((a, b) => a.time - b.time);

    function tick() {
      const ct = Math.min(duration, (Date.now() - playStartRef.current) / 1000);
      setCurrentTime(ct);
      for (const ev of sorted) {
        if (ev.time <= ct && !fired.has(ev.id)) {
          fired.add(ev.id);
          onSend(eventToCommand(ev));
        }
      }
      if (ct >= duration) { setIsPlaying(false); return; }
      if (scrollRef.current) {
        const px = ct * scale;
        const w  = scrollRef.current.offsetWidth;
        const sl = scrollRef.current.scrollLeft;
        if (px > sl + w * 0.8) scrollRef.current.scrollLeft = px - w * 0.2;
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isPlaying, events, scale, onSend, duration]);

  function play() {
    playStartRef.current = Date.now() - currentTime * 1000;
    audioRef.current?.play().catch(() => {});
    setIsPlaying(true);
  }

  function pause() {
    audioRef.current?.pause();
    setIsPlaying(false);
  }

  function stop() {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    setIsPlaying(false);
    setCurrentTime(0);
  }

  function handleMark() {
    setModal({ time: currentTime, event: null });
  }

  // ── Timeline interactions ──────────────────────────────────────────────────

  function handleTrackClick(e) {
    if (dragging) return;
    const rect = trackRef.current.getBoundingClientRect();
    const sl   = scrollRef.current?.scrollLeft ?? 0;
    const t    = Math.max(0, Math.min(duration, (e.clientX - rect.left + sl) / scale));
    setModal({ time: t, event: null });
    setSelectedId(null);
  }

  function handleEventClick(e, ev) {
    e.stopPropagation();
    setSelectedId(ev.id);
    setModal({ time: ev.time, event: ev });
  }

  function handleEventMouseDown(e, ev) {
    e.stopPropagation();
    e.preventDefault();
    setDragging({ id: ev.id, startX: e.clientX, startTime: ev.time });
  }

  // Global drag handler
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const dt = (e.clientX - dragging.startX) / scale;
      setEvents(prev => prev.map(ev =>
        ev.id === dragging.id
          ? { ...ev, time: Math.max(0, Math.min(duration, dragging.startTime + dt)) }
          : ev
      ));
    };
    const onUp = () => setDragging(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging, scale, duration]);

  // ── Modal actions ──────────────────────────────────────────────────────────

  function handleModalSave(data) {
    if (modal.event) {
      setEvents(prev => prev.map(ev => ev.id === modal.event.id ? { ...ev, ...data } : ev));
    } else {
      setEvents(prev => [...prev, { id: crypto.randomUUID(), time: modal.time, ...data }]);
    }
    setModal(null);
  }

  function handleModalDelete() {
    setEvents(prev => prev.filter(ev => ev.id !== modal.event.id));
    setSelectedId(null);
    setModal(null);
  }

  // Preview selected event immediately
  const previewEvent = useCallback((data) => {
    onSend(eventToCommand({ ...data, id: '__preview__', time: 0 }));
  }, [onSend]);

  // ── Save / Load ────────────────────────────────────────────────────────────

  async function saveTimeline() {
    const name = timelineName.trim() || 'timeline';
    await fetch(`/api/timelines/${encodeURIComponent(name)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, duration, events }),
    });
    const names = await fetch('/api/timelines').then(r => r.json());
    setSavedList(names);
  }

  async function loadTimeline(name) {
    const data = await fetch(`/api/timelines/${encodeURIComponent(name)}`).then(r => r.json());
    setTimelineName(data.name ?? name);
    setEvents(data.events ?? []);
    setDuration(data.duration ?? 60);
    setCurrentTime(0);
    stop();
  }

  // ── Ruler ticks ───────────────────────────────────────────────────────────

  const tickStep = scale >= 40 ? 1 : scale >= 20 ? 5 : 10;
  const ticks = [];
  for (let t = 0; t <= duration; t += tickStep) ticks.push(t);

  const totalWidth = Math.max(duration * scale + 60, 400);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '16px', maxWidth: '960px', margin: '0 auto' }}>

      {/* Timeline name + save/load */}
      <div style={row}>
        <input
          value={timelineName}
          onChange={e => setTimelineName(e.target.value)}
          style={input}
          placeholder="Nom de la timeline"
        />
        <button style={btn('#6c63ff')} onClick={saveTimeline}>Sauvegarder</button>
        {savedList.length > 0 && (
          <select
            style={{ ...input, flex: 'none', width: 'auto', cursor: 'pointer' }}
            defaultValue=""
            onChange={e => { if (e.target.value) loadTimeline(e.target.value); }}
          >
            <option value="" disabled>Charger…</option>
            {savedList.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        )}
      </div>

      {/* Audio optionnel */}
      <div style={{ ...panel, ...row }}>
        <label style={{ ...btn('#2a2a4a'), cursor: 'pointer', whiteSpace: 'nowrap' }}>
          Audio (référence)
          <input type="file" accept="audio/*" style={{ display: 'none' }} onChange={handleAudioFile} />
        </label>
        {audioName
          ? <span style={{ color: '#aaa', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{audioName}</span>
          : <span style={{ color: '#555', fontSize: '13px' }}>Optionnel — pour caler les cues pendant la création</span>
        }
        {audioUrl && (
          <audio ref={audioRef} src={audioUrl} onLoadedMetadata={handleMetadata}
            onEnded={() => { setIsPlaying(false); setCurrentTime(audioRef.current?.duration ?? duration); }}
            style={{ display: 'none' }} />
        )}
      </div>

      {/* Transport */}
      <div style={{ ...panel, ...row }}>
        <button style={iconBtn} onClick={isPlaying ? pause : play} title={isPlaying ? 'Pause' : 'Lecture'}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button style={iconBtn} onClick={stop} disabled={!isPlaying && currentTime === 0} title="Stop">⏹</button>
        <span style={{ color: '#888', fontFamily: 'monospace', fontSize: '13px', minWidth: '100px' }}>
          {fmt(currentTime)} / {fmt(duration)}
        </span>
        {isPlaying && (
          <button
            onClick={handleMark}
            style={{ padding: '6px 12px', background: '#ff475722', border: '1px solid #ff4757', borderRadius: 6, color: '#ff4757', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            ✦ Marquer ici
          </button>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ color: '#555', fontSize: '12px' }}>Zoom</span>
        <input type="range" min="8" max="120" value={scale}
          onChange={e => setScale(Number(e.target.value))}
          style={{ width: '80px', accentColor: '#6c63ff' }} />
      </div>

      {/* Timeline track */}
      <div style={{ ...panel, padding: 0, overflow: 'hidden' }}>
        <div ref={scrollRef} style={{ overflowX: 'auto', overflowY: 'hidden' }}>
          <div style={{ width: totalWidth + 'px', position: 'relative', userSelect: 'none' }}>

            {/* Ruler */}
            <div style={{ height: '28px', position: 'relative', borderBottom: '1px solid #2a2a4a', background: '#0d0d1a' }}>
              {ticks.map(t => (
                <div key={t} style={{ position: 'absolute', left: t * scale, top: 0, height: '100%' }}>
                  <div style={{ width: 1, height: 10, background: '#3a3a5a' }} />
                  <span style={{ display: 'block', fontSize: '9px', color: '#555', paddingLeft: 2, whiteSpace: 'nowrap', lineHeight: 1 }}>
                    {t % (tickStep * 5) === 0 || tickStep >= 10 ? fmt(t) : ''}
                  </span>
                </div>
              ))}

              {/* Playhead on ruler */}
              <div style={{ position: 'absolute', left: currentTime * scale, top: 0, width: 2, height: '100%', background: '#ff4757', pointerEvents: 'none', zIndex: 5 }} />
            </div>

            {/* Event track */}
            <div
              ref={trackRef}
              onClick={handleTrackClick}
              style={{ height: '72px', position: 'relative', cursor: 'crosshair',
                backgroundImage: `repeating-linear-gradient(90deg, transparent 0px, transparent ${scale * tickStep - 1}px, #1a1a2e ${scale * tickStep - 1}px, #1a1a2e ${scale * tickStep}px)` }}
            >
              {events.map(ev => (
                <div
                  key={ev.id}
                  style={{
                    position: 'absolute',
                    left: ev.time * scale - 10,
                    top: 10,
                    width: 20,
                    height: 52,
                    background: ev.type === 'color' ? ev.value : '#6c63ff',
                    border: `2px solid ${selectedId === ev.id ? '#fff' : 'rgba(255,255,255,0.25)'}`,
                    borderRadius: 5,
                    cursor: dragging ? 'grabbing' : 'grab',
                    zIndex: selectedId === ev.id ? 3 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, color: 'rgba(255,255,255,0.8)', fontWeight: 700,
                    overflow: 'hidden',
                    boxShadow: selectedId === ev.id ? '0 0 0 2px rgba(168,139,250,0.6)' : 'none',
                  }}
                  onMouseDown={e => handleEventMouseDown(e, ev)}
                  onClick={e => handleEventClick(e, ev)}
                  title={`${ev.type === 'color' ? ev.value : ev.value} @ ${fmt(ev.time)}`}
                >
                  {ev.type === 'effect' ? ev.value[0].toUpperCase() : ''}
                </div>
              ))}

              {/* Playhead */}
              <div style={{ position: 'absolute', left: currentTime * scale, top: 0, width: 2, height: '100%', background: '#ff4757', pointerEvents: 'none', zIndex: 10 }}>
                <div style={{ width: 8, height: 8, background: '#ff4757', borderRadius: '50%', transform: 'translateX(-3px)' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <p style={{ textAlign: 'center', color: '#444', fontSize: '12px', marginTop: '8px' }}>
        Cliquez sur la timeline pour ajouter un cue · Glissez pour déplacer · En lecture : "Marquer ici" pose un cue au temps courant
      </p>

      {modal && (
        <EventModal
          initialEvent={modal.event}
          initialTime={modal.time}
          onSave={handleModalSave}
          onDelete={modal.event ? handleModalDelete : null}
          onPreview={previewEvent}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ─── Event Modal ─────────────────────────────────────────────────────────────

function EventModal({ initialEvent, initialTime, onSave, onDelete, onPreview, onClose }) {
  const [type, setType]               = useState(initialEvent?.type ?? 'color');
  const [colorValue, setColorValue]   = useState(initialEvent?.type === 'color' ? initialEvent.value : '#ff0000');
  const [effectName, setEffectName]   = useState(initialEvent?.type === 'effect' ? initialEvent.value : 'strobe');
  const [effectColor, setEffectColor] = useState(initialEvent?.color ?? '#ff0000');
  const [speed, setSpeed]             = useState(initialEvent?.speed ?? 1);

  function currentData() {
    return type === 'color'
      ? { type: 'color', value: colorValue }
      : { type: 'effect', value: effectName, color: effectColor, speed };
  }

  function handleSave() { onSave(currentData()); }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#16162a', borderRadius: 12, padding: 24, width: 360, border: '1px solid #2a2a4a', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
      >
        <h3 style={{ marginBottom: 16, color: '#a88bfa', fontSize: 15 }}>
          {initialEvent ? 'Modifier' : 'Ajouter'} événement — {fmt(initialTime)}
        </h3>

        {/* Type toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {['color', 'effect'].map(t => (
            <button key={t} style={modalTab(type === t)} onClick={() => setType(t)}>
              {t === 'color' ? 'Couleur' : 'Effet'}
            </button>
          ))}
        </div>

        {type === 'color' ? (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6, marginBottom: 8 }}>
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => setColorValue(c)} style={{ aspectRatio: 1, background: c, borderRadius: 4, border: `2px solid ${colorValue === c ? '#fff' : 'transparent'}` }} />
              ))}
            </div>
            <input type="color" value={colorValue} onChange={e => setColorValue(e.target.value)}
              style={{ width: '100%', height: 40, border: 'none', borderRadius: 6, cursor: 'pointer', padding: 0 }} />
          </div>
        ) : (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {EFFECT_NAMES.map(ef => (
                <button key={ef} style={modalTab(effectName === ef)} onClick={() => setEffectName(ef)}>{ef}</button>
              ))}
            </div>
            <label style={label}>Couleur de base</label>
            <input type="color" value={effectColor} onChange={e => setEffectColor(e.target.value)}
              style={{ width: '100%', height: 40, border: 'none', borderRadius: 6, cursor: 'pointer', padding: 0, marginBottom: 10 }} />
            <label style={label}>Vitesse — {speed.toFixed(1)}×</label>
            <input type="range" min="0.2" max="5" step="0.1" value={speed}
              onChange={e => setSpeed(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#6c63ff' }} />
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={btn('#6c63ff')} onClick={handleSave}>
            {initialEvent ? 'Mettre à jour' : 'Ajouter'}
          </button>
          <button style={btn('#2a2a4a')} onClick={() => onPreview(currentData())}>
            Prévisualiser
          </button>
          {onDelete && <button style={btn('#ff4757')} onClick={onDelete}>Supprimer</button>}
          <button style={{ ...btn('#1a1a2e'), marginLeft: 'auto', border: '1px solid #333355' }} onClick={onClose}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Shared micro-styles ──────────────────────────────────────────────────────

const panel = { background: '#16162a', borderRadius: 8, padding: '12px', marginBottom: 12, border: '1px solid #1e1e38' };
const row   = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' };
const input = { flex: 1, padding: '8px 12px', background: '#0a0a0f', border: '1px solid #333355', borderRadius: 6, color: '#e0e0f0', fontSize: 14 };
const iconBtn = { width: 36, height: 36, background: '#1a1a2e', border: '1px solid #333355', borderRadius: 6, color: '#e0e0f0', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const label = { display: 'block', color: '#666', fontSize: 11, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' };

const btn = bg => ({ padding: '8px 16px', background: bg, color: '#fff', borderRadius: 6, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', cursor: 'pointer', border: 'none' });
const modalTab = active => ({ padding: '6px 12px', borderRadius: 6, border: `1px solid ${active ? '#6c63ff' : '#333355'}`, background: active ? '#6c63ff' : 'transparent', color: active ? '#fff' : '#777', fontSize: 13, cursor: 'pointer' });
