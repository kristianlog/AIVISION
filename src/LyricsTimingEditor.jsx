import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Play, Pause, SkipBack, Save, X, Trash2, Undo2, Type, AlignLeft, ChevronLeft, Minus, Plus, Check } from 'lucide-react';

const formatTime = (seconds) => {
  if (!seconds && seconds !== 0) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
};

const formatTimeShort = (seconds) => {
  if (!seconds && seconds !== 0) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const parseTime = (str) => {
  if (!str) return null;
  const dotMatch = str.match(/^(\d+):(\d+)\.(\d+)$/);
  if (dotMatch) {
    const mins = parseInt(dotMatch[1], 10);
    const secs = parseInt(dotMatch[2], 10);
    const frac = parseInt(dotMatch[3], 10) / Math.pow(10, dotMatch[3].length);
    return mins * 60 + secs + frac;
  }
  const parts = str.split(':');
  if (parts.length === 2) {
    const mins = parseInt(parts[0], 10) || 0;
    const secs = parseInt(parts[1], 10) || 0;
    return mins * 60 + secs;
  }
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
};

const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5];

const LyricsTimingEditor = ({ song, onSave, onClose }) => {
  // ── State ──
  const [timings, setTimings] = useState({});
  const [wordTimings, setWordTimings] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [saving, setSaving] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [stampHistory, setStampHistory] = useState([]);
  const [lastStampedLine, setLastStampedLine] = useState(null);
  const [mode, setMode] = useState('line');
  const [wordSyncLine, setWordSyncLine] = useState(null);
  const [nextWordIndex, setNextWordIndex] = useState(0);
  const [lastStampedWord, setLastStampedWord] = useState(null);
  const [expandedSlider, setExpandedSlider] = useState(null); // lineIndex of expanded slider
  const [sliderBaseTime, setSliderBaseTime] = useState(null); // anchor time when slider opened
  const audioRef = useRef(null);
  const linesRef = useRef(null);
  const wordContainerRef = useRef(null);
  const animFrameRef = useRef(null);

  // ── Parse lyrics ──
  const lines = useMemo(() => {
    if (!song.lyrics) return [];
    return song.lyrics.split('\n').map((text, i) => ({
      index: i,
      text,
      isSection: text.startsWith('['),
      isEmpty: text.trim() === '',
      isTimeable: !text.startsWith('[') && text.trim() !== '',
      words: text.trim() ? text.trim().split(/\s+/) : [],
    }));
  }, [song.lyrics]);

  // ── Load existing timing data ──
  useEffect(() => {
    if (song.lyrics_timing && Array.isArray(song.lyrics_timing) && song.lyrics_timing.length > 0) {
      const lineMap = {};
      const wordMap = {};
      song.lyrics_timing.forEach(entry => {
        lineMap[entry.line] = entry.time;
        if (entry.words && Array.isArray(entry.words)) {
          wordMap[entry.line] = entry.words;
        }
      });
      setTimings(lineMap);
      setWordTimings(wordMap);
    }
  }, [song.lyrics_timing]);

  // ── Next un-timed line ──
  const nextUntimedLine = useMemo(() => {
    for (const line of lines) {
      if (line.isTimeable && timings[line.index] === undefined) {
        return line.index;
      }
    }
    return -1;
  }, [lines, timings]);

  // ── Active line based on playback (for live preview) ──
  const activeLine = useMemo(() => {
    if (!isPlaying && currentTime === 0) return -1;
    let active = -1;
    const entries = Object.entries(timings)
      .map(([line, time]) => ({ line: parseInt(line, 10), time: typeof time === 'number' ? time : parseFloat(time) }))
      .filter(e => !isNaN(e.time))
      .sort((a, b) => a.time - b.time);
    for (const entry of entries) {
      if (entry.time <= currentTime) active = entry.line;
      else break;
    }
    return active;
  }, [timings, currentTime, isPlaying]);

  // ── Active word in word-sync view ──
  const activeWordInView = useMemo(() => {
    if (wordSyncLine === null) return -1;
    const wt = wordTimings[wordSyncLine];
    if (!wt || wt.length === 0) return -1;
    let active = -1;
    for (let i = 0; i < wt.length; i++) {
      if (wt[i].time <= currentTime) active = i;
      else break;
    }
    return active;
  }, [wordSyncLine, wordTimings, currentTime]);

  // ── Audio with requestAnimationFrame ──
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => { setIsPlaying(false); cancelAnimationFrame(animFrameRef.current); };
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    const tick = () => {
      if (audio && !audio.paused) setCurrentTime(audio.currentTime);
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackSpeed;
  }, [playbackSpeed]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.pause(); else audio.play();
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const restart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const seekTo = (e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * duration;
    setCurrentTime(audio.currentTime);
  };

  // ── Line stamping ──
  const stampLine = useCallback((lineIndex) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = Math.round(audio.currentTime * 100) / 100;
    setStampHistory(prev => [...prev, { type: 'line', lineIndex, prevTime: timings[lineIndex] }]);
    setTimings(prev => ({ ...prev, [lineIndex]: time }));
    setLastStampedLine(lineIndex);
    setTimeout(() => setLastStampedLine(null), 600);
  }, [timings]);

  // ── Nudge line timing ±0.25s ──
  const nudgeLineTiming = useCallback((lineIndex, delta) => {
    setTimings(prev => {
      const current = prev[lineIndex];
      if (current === undefined) return prev;
      const t = typeof current === 'number' ? current : parseFloat(current);
      if (isNaN(t)) return prev;
      return { ...prev, [lineIndex]: Math.max(0, Math.round((t + delta) * 100) / 100) };
    });
  }, []);

  // ── Slider adjust line timing (range ±2s, 0.25 steps) ──
  const sliderAdjustLine = useCallback((lineIndex, newValue) => {
    setTimings(prev => {
      const current = prev[lineIndex];
      if (current === undefined) return prev;
      return { ...prev, [lineIndex]: Math.max(0, newValue) };
    });
  }, []);

  // ── Word stamping ──
  const stampWord = useCallback((lineIndex, wordIndex) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = Math.round(audio.currentTime * 100) / 100;
    const line = lines.find(l => l.index === lineIndex);
    if (!line) return;
    const word = line.words[wordIndex];
    setStampHistory(prev => [...prev, {
      type: 'word', lineIndex, wordIndex,
      prevWords: wordTimings[lineIndex] ? [...wordTimings[lineIndex]] : undefined,
    }]);
    setWordTimings(prev => {
      const existing = prev[lineIndex] ? [...prev[lineIndex]] : [];
      while (existing.length <= wordIndex) existing.push({ word: line.words[existing.length], time: null });
      existing[wordIndex] = { word, time };
      return { ...prev, [lineIndex]: existing };
    });
    if (wordIndex === 0) {
      setTimings(prev => {
        if (prev[lineIndex] === undefined) return { ...prev, [lineIndex]: time };
        return prev;
      });
    }
    setLastStampedWord({ line: lineIndex, word: wordIndex });
    setTimeout(() => setLastStampedWord(null), 400);
    if (wordIndex + 1 < line.words.length) {
      setNextWordIndex(wordIndex + 1);
    } else {
      setNextWordIndex(0);
      const nextLine = lines.find(l => l.index > lineIndex && l.isTimeable);
      if (nextLine) setWordSyncLine(nextLine.index);
    }
  }, [lines, wordTimings, timings]);

  // ── Nudge word timing ──
  const nudgeWordTime = useCallback((lineIndex, wordIndex, delta) => {
    setWordTimings(prev => {
      const existing = prev[lineIndex] ? [...prev[lineIndex]] : [];
      if (!existing[wordIndex] || existing[wordIndex].time === null) return prev;
      existing[wordIndex] = { ...existing[wordIndex], time: Math.max(0, existing[wordIndex].time + delta) };
      return { ...prev, [lineIndex]: existing };
    });
  }, []);

  // ── Undo ──
  const undoLastStamp = useCallback(() => {
    if (stampHistory.length === 0) return;
    const last = stampHistory[stampHistory.length - 1];
    setStampHistory(prev => prev.slice(0, -1));
    if (last.type === 'word') {
      setWordTimings(prev => {
        if (last.prevWords !== undefined) return { ...prev, [last.lineIndex]: last.prevWords };
        const next = { ...prev }; delete next[last.lineIndex]; return next;
      });
      setWordSyncLine(last.lineIndex);
      setNextWordIndex(last.wordIndex);
    } else {
      setTimings(prev => {
        const next = { ...prev };
        if (last.prevTime !== undefined) next[last.lineIndex] = last.prevTime;
        else delete next[last.lineIndex];
        return next;
      });
    }
  }, [stampHistory]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault(); togglePlay();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (mode === 'word' && wordSyncLine !== null) {
          const line = lines.find(l => l.index === wordSyncLine);
          if (line && nextWordIndex < line.words.length) stampWord(wordSyncLine, nextWordIndex);
        } else if (nextUntimedLine >= 0) stampLine(nextUntimedLine);
      } else if (e.key === 'Backspace') {
        e.preventDefault(); undoLastStamp();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const audio = audioRef.current;
        if (audio) { audio.currentTime = Math.max(0, audio.currentTime - (e.shiftKey ? 0.5 : 3)); setCurrentTime(audio.currentTime); }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const audio = audioRef.current;
        if (audio) { audio.currentTime = Math.min(duration, audio.currentTime + (e.shiftKey ? 0.5 : 3)); setCurrentTime(audio.currentTime); }
      } else if (e.key === 'Escape' && wordSyncLine !== null) {
        e.preventDefault(); setWordSyncLine(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextUntimedLine, stampLine, stampWord, togglePlay, undoLastStamp, duration, mode, wordSyncLine, nextWordIndex, lines]);

  // ── Auto-scroll ──
  useEffect(() => {
    if (wordSyncLine !== null && wordContainerRef.current) {
      const el = wordContainerRef.current.querySelector('.word-sync-active');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else if (linesRef.current) {
      const el = linesRef.current.querySelector('.timing-line-active, .timing-line-next');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeLine, activeWordInView, wordSyncLine]);

  // ── Save ──
  const handleSave = async () => {
    setSaving(true);
    const timingArray = Object.entries(timings)
      .map(([line, time]) => {
        const lineIdx = parseInt(line, 10);
        const t = typeof time === 'number' ? time : parseFloat(time);
        const entry = { line: lineIdx, time: isNaN(t) ? 0 : t };
        if (wordTimings[lineIdx] && wordTimings[lineIdx].length > 0) {
          entry.words = wordTimings[lineIdx].filter(w => w.time !== null);
        }
        return entry;
      })
      .filter(entry => !isNaN(entry.time))
      .sort((a, b) => a.line - b.line);
    await onSave(song.id, timingArray);
    setSaving(false);
  };

  const clearAll = () => {
    if (confirm('Clear all timestamps?')) {
      setTimings({}); setWordTimings({}); setStampHistory([]); setWordSyncLine(null); setExpandedSlider(null); setSliderBaseTime(null);
    }
  };

  const enterWordSync = (lineIndex) => {
    setWordSyncLine(lineIndex);
    const wt = wordTimings[lineIndex];
    if (wt) {
      const firstUntimed = wt.findIndex(w => w.time === null);
      setNextWordIndex(firstUntimed >= 0 ? firstUntimed : 0);
    } else {
      setNextWordIndex(0);
    }
  };

  const seekToTime = (time) => {
    const audio = audioRef.current;
    if (!audio || time === null || time === undefined) return;
    audio.currentTime = Math.max(0, time - 0.3);
    setCurrentTime(audio.currentTime);
  };

  // ── Progress stats ──
  const timedCount = Object.keys(timings).length;
  const timeableCount = lines.filter(l => l.isTimeable).length;
  const progressPct = timeableCount > 0 ? Math.round((timedCount / timeableCount) * 100) : 0;
  const totalWords = lines.filter(l => l.isTimeable).reduce((acc, l) => acc + l.words.length, 0);
  const timedWords = Object.values(wordTimings).reduce((acc, wt) => acc + wt.filter(w => w.time !== null).length, 0);
  const wordPct = totalWords > 0 ? Math.round((timedWords / totalWords) * 100) : 0;

  const lineHasWords = (lineIndex) => {
    const wt = wordTimings[lineIndex];
    return wt && wt.some(w => w.time !== null);
  };

  return (
    <div className="admin-form-overlay" onClick={onClose}>
      <div className="admin-form-modal timing-editor-modal" onClick={e => e.stopPropagation()}>
        <div className="admin-form-header" style={{ paddingBottom: '8px' }}>
          <h3 style={{ fontSize: '0.95rem', margin: 0 }}>Sync: {song.title}</h3>
          <button onClick={onClose} className="admin-form-close"><X size={18} /></button>
        </div>

        <audio ref={audioRef} src={song.audio_url} preload="metadata" />

        {/* Audio controls — compact */}
        <div className="timing-audio-controls">
          <button onClick={restart} className="lyrics-ctrl-btn" title="Restart"><SkipBack size={14} /></button>
          <button onClick={togglePlay} className="lyrics-play-btn" title={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <div className="timing-progress-bar" onClick={seekTo}>
            <div className="timing-progress-fill" style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }} />
          </div>
          <span className="timing-current-time">{formatTime(currentTime)}</span>
        </div>

        {/* Toolbar — compact single row */}
        <div className="timing-toolbar">
          <div style={{ display: 'flex', gap: '3px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="timing-mode-toggle">
              <button className={`timing-mode-btn ${mode === 'line' ? 'timing-mode-active' : ''}`}
                onClick={() => { setMode('line'); setWordSyncLine(null); }}>
                <AlignLeft size={11} /> Lines
              </button>
              <button className={`timing-mode-btn ${mode === 'word' ? 'timing-mode-active' : ''}`}
                onClick={() => setMode('word')}>
                <Type size={11} /> Words
              </button>
            </div>
            <div className="timing-speed-controls">
              {SPEED_OPTIONS.map(speed => (
                <button key={speed}
                  className={`timing-speed-btn ${playbackSpeed === speed ? 'timing-speed-active' : ''}`}
                  onClick={() => setPlaybackSpeed(speed)}>
                  {speed}x
                </button>
              ))}
            </div>
          </div>
          <button onClick={undoLastStamp} disabled={stampHistory.length === 0}
            className="timing-undo-btn" title="Undo (Backspace)">
            <Undo2 size={12} /> Undo
          </button>
        </div>

        {/* Progress bar */}
        <div className="timing-progress-info">
          <div className="timing-progress-bar-mini">
            <div className="timing-progress-fill-mini" style={{ width: `${mode === 'word' ? wordPct : progressPct}%` }} />
          </div>
          <div className="timing-progress-text">
            {mode === 'word'
              ? `${timedWords}/${totalWords} words (${wordPct}%)`
              : `${timedCount}/${timeableCount} lines (${progressPct}%)`
            }
            <span className="timing-shortcuts-inline">
              <kbd>Space</kbd> play <kbd>Enter</kbd> stamp <kbd>←→</kbd> seek <kbd>⇧←→</kbd> fine
            </span>
          </div>
        </div>

        {/* ── Word Sync Detail View ── */}
        {mode === 'word' && wordSyncLine !== null && (() => {
          const line = lines.find(l => l.index === wordSyncLine);
          if (!line) return null;
          const wt = wordTimings[wordSyncLine] || [];

          return (
            <div className="word-sync-panel">
              <div className="word-sync-header">
                <button onClick={() => setWordSyncLine(null)} className="word-sync-back" title="Back">
                  <ChevronLeft size={14} /> Back
                </button>
                <span className="word-sync-line-label">Line {line.index + 1}</span>
                <span className="word-sync-line-preview">{line.text}</span>
              </div>
              <div className="word-sync-words" ref={wordContainerRef}>
                {line.words.map((word, wi) => {
                  const hasTime = wt[wi] && wt[wi].time !== null;
                  const isNext = wi === nextWordIndex;
                  const isActive = wi === activeWordInView;
                  const justStamped = lastStampedWord && lastStampedWord.line === wordSyncLine && lastStampedWord.word === wi;

                  return (
                    <div key={wi}
                      className={`word-sync-item ${isActive ? 'word-sync-active' : ''} ${isNext ? 'word-sync-next' : ''} ${justStamped ? 'word-sync-stamped' : ''} ${hasTime ? 'word-sync-timed' : ''}`}>
                      <span className="word-sync-text"
                        onClick={() => { if (!hasTime) stampWord(wordSyncLine, wi); else seekToTime(wt[wi].time); }}>
                        {word}
                      </span>
                      {hasTime && (
                        <div className="word-sync-time-row">
                          <button className="word-nudge-btn" onClick={() => nudgeWordTime(wordSyncLine, wi, -0.05)} title="-50ms"><Minus size={9} /></button>
                          <span className="word-sync-time" onClick={() => seekToTime(wt[wi].time)}>{formatTime(wt[wi].time)}</span>
                          <button className="word-nudge-btn" onClick={() => nudgeWordTime(wordSyncLine, wi, 0.05)} title="+50ms"><Plus size={9} /></button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="word-sync-hint">
                <kbd>Enter</kbd> stamp next &middot; Click word to stamp/seek &middot; <kbd>Esc</kbd> back
              </p>
            </div>
          );
        })()}

        {/* ── Lines List ── */}
        {(mode === 'line' || (mode === 'word' && wordSyncLine === null)) && (
          <div className="timing-lines-container" ref={linesRef}>
            {lines.map((line) => {
              if (line.isEmpty) return <div key={line.index} className="timing-line-spacer" />;

              if (line.isSection) {
                return (
                  <div key={line.index} className="timing-line-row timing-line-section-row">
                    <span className="timing-line-section">{line.text}</span>
                  </div>
                );
              }

              const hasTime = timings[line.index] !== undefined;
              const hasWords = lineHasWords(line.index);
              const isActive = line.index === activeLine;
              const isNext = line.index === nextUntimedLine;
              const justStamped = line.index === lastStampedLine;
              const isSliderOpen = expandedSlider === line.index;

              // Color classes: timed=green, active=purple, next=yellow, untimed=dim
              let rowClass = 'timing-line-row';
              if (isActive) rowClass += ' timing-line-playing';
              else if (hasTime) rowClass += ' timing-line-done';
              if (isNext && mode === 'line') rowClass += ' timing-line-next';
              if (justStamped) rowClass += ' timing-line-stamped';

              return (
                <div key={line.index} className={rowClass}>
                  <div className="timing-line-content">
                    {/* Status indicator */}
                    {hasTime && !isActive && (
                      <span className="timing-line-check"><Check size={11} strokeWidth={3} /></span>
                    )}
                    {isActive && (
                      <span className="timing-line-playing-dot" />
                    )}

                    {/* Text — live preview glow on active */}
                    <span className={`timing-line-text ${isActive ? 'timing-line-text-playing' : ''}`}>{line.text}</span>

                    <div className="timing-line-controls">
                      {hasWords && <span className="timing-word-badge" title="Word timings">W</span>}

                      {mode === 'line' && hasTime && (
                        <>
                          <button className="timing-nudge-sm" onClick={() => nudgeLineTiming(line.index, -0.25)} title="-0.25s"><Minus size={9} /></button>
                          <span className="timing-time-badge" onClick={() => { seekToTime(timings[line.index]); }}
                            title="Click to seek">{formatTimeShort(timings[line.index])}</span>
                          <button className="timing-nudge-sm" onClick={() => nudgeLineTiming(line.index, 0.25)} title="+0.25s"><Plus size={9} /></button>
                          <button className="timing-slider-toggle" onClick={() => {
                            if (isSliderOpen) {
                              setExpandedSlider(null);
                              setSliderBaseTime(null);
                            } else {
                              setExpandedSlider(line.index);
                              const t = timings[line.index];
                              setSliderBaseTime(typeof t === 'number' ? t : parseFloat(t) || 0);
                            }
                          }} title="Fine adjust slider">
                            ◆
                          </button>
                        </>
                      )}
                      {mode === 'line' && !hasTime && (
                        <button type="button" onClick={() => stampLine(line.index)} className="timing-stamp-btn-sm" title="Stamp">
                          Stamp
                        </button>
                      )}
                      {mode === 'word' && (
                        <button type="button" onClick={() => enterWordSync(line.index)}
                          className="timing-stamp-btn-sm timing-word-btn">
                          <Type size={10} /> Words
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Slider row — ±2s range, 0.25s steps */}
                  {isSliderOpen && hasTime && sliderBaseTime !== null && (
                    <div className="timing-slider-row">
                      <span className="timing-slider-label">-2s</span>
                      <input
                        type="range"
                        className="timing-range-slider"
                        min={Math.max(0, sliderBaseTime - 2)}
                        max={sliderBaseTime + 2}
                        step={0.25}
                        value={typeof timings[line.index] === 'number' ? timings[line.index] : parseFloat(timings[line.index]) || 0}
                        onChange={(e) => sliderAdjustLine(line.index, parseFloat(e.target.value))}
                      />
                      <span className="timing-slider-label">+2s</span>
                      <span className="timing-slider-value">{formatTime(timings[line.index])}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Actions — compact */}
        <div className="timing-actions">
          <button onClick={handleSave} disabled={saving} className="admin-submit-btn" style={{ padding: '8px 16px', fontSize: '0.82rem' }}>
            <Save size={15} /> {saving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={clearAll} className="timing-clear-btn" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
            <Trash2 size={14} /> Clear
          </button>
        </div>
      </div>
    </div>
  );
};

export default LyricsTimingEditor;
