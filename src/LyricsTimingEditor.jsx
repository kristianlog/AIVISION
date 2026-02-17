import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Play, Pause, SkipBack, Save, X, Trash2 } from 'lucide-react';

const formatTime = (seconds) => {
  if (!seconds && seconds !== 0) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const parseTime = (str) => {
  if (!str) return null;
  const parts = str.split(':');
  if (parts.length === 2) {
    const mins = parseInt(parts[0], 10) || 0;
    const secs = parseInt(parts[1], 10) || 0;
    return mins * 60 + secs;
  }
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
};

const LyricsTimingEditor = ({ song, onSave, onClose }) => {
  const [timings, setTimings] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [saving, setSaving] = useState(false);
  const audioRef = useRef(null);
  const linesRef = useRef(null);

  // Parse lyrics into lines
  const lines = useMemo(() => {
    if (!song.lyrics) return [];
    return song.lyrics.split('\n').map((text, i) => ({
      index: i,
      text,
      isSection: text.startsWith('['),
      isEmpty: text.trim() === '',
      isTimeable: !text.startsWith('[') && text.trim() !== '',
    }));
  }, [song.lyrics]);

  // Load existing timing data
  useEffect(() => {
    if (song.lyrics_timing && Array.isArray(song.lyrics_timing) && song.lyrics_timing.length > 0) {
      const map = {};
      song.lyrics_timing.forEach(entry => { map[entry.line] = entry.time; });
      setTimings(map);
    }
  }, [song.lyrics_timing]);

  // Find the next un-timed line index
  const nextUntimedLine = useMemo(() => {
    for (const line of lines) {
      if (line.isTimeable && timings[line.index] === undefined) {
        return line.index;
      }
    }
    return -1;
  }, [lines, timings]);

  // Active line based on current playback time
  const activeLine = useMemo(() => {
    let active = -1;
    const entries = Object.entries(timings)
      .map(([line, time]) => ({ line: parseInt(line, 10), time }))
      .sort((a, b) => a.time - b.time);
    for (const entry of entries) {
      if (entry.time <= currentTime) active = entry.line;
      else break;
    }
    return active;
  }, [timings, currentTime]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

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
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * duration;
    setCurrentTime(audio.currentTime);
  };

  const stampLine = useCallback((lineIndex) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = Math.round(audio.currentTime * 10) / 10;
    setTimings(prev => ({ ...prev, [lineIndex]: time }));
  }, []);

  // Keyboard: Enter stamps the next un-timed line
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && nextUntimedLine >= 0) {
        e.preventDefault();
        stampLine(nextUntimedLine);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextUntimedLine, stampLine]);

  // Auto-scroll to active line
  useEffect(() => {
    if (linesRef.current) {
      const el = linesRef.current.querySelector('.timing-line-active');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeLine]);

  const handleSave = async () => {
    setSaving(true);
    const timingArray = Object.entries(timings)
      .map(([line, time]) => ({ line: parseInt(line, 10), time: parseFloat(time) }))
      .filter(entry => !isNaN(entry.time))
      .sort((a, b) => a.line - b.line);
    await onSave(song.id, timingArray);
    setSaving(false);
  };

  const clearAll = () => {
    if (confirm('Clear all timestamps?')) {
      setTimings({});
    }
  };

  const timedCount = Object.keys(timings).length;
  const timeableCount = lines.filter(l => l.isTimeable).length;

  return (
    <div className="admin-form-overlay" onClick={onClose}>
      <div className="admin-form-modal timing-editor-modal" onClick={e => e.stopPropagation()}>
        <div className="admin-form-header">
          <h3>Lyrics Timing: {song.title}</h3>
          <button onClick={onClose} className="admin-form-close">
            <X size={20} />
          </button>
        </div>

        {/* Audio element */}
        <audio ref={audioRef} src={song.audio_url} preload="metadata" />

        {/* Audio controls */}
        <div className="timing-audio-controls">
          <button onClick={restart} className="lyrics-ctrl-btn" title="Restart">
            <SkipBack size={16} />
          </button>
          <button onClick={togglePlay} className="lyrics-play-btn" title={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <div className="timing-progress-bar" onClick={seekTo}>
            <div
              className="timing-progress-fill"
              style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
            />
          </div>
          <span className="timing-current-time">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Progress indicator */}
        <p className="timing-progress-text">
          {timedCount} / {timeableCount} lines timed — Press <kbd>Enter</kbd> to stamp next line
        </p>

        {/* Lyrics lines */}
        <div className="timing-lines-container" ref={linesRef}>
          {lines.map((line) => {
            if (line.isEmpty) {
              return <div key={line.index} className="timing-line-spacer" />;
            }

            if (line.isSection) {
              return (
                <div key={line.index} className="timing-line-row">
                  <span className="timing-line-section">{line.text}</span>
                  <span className="timing-line-skipped">—</span>
                </div>
              );
            }

            const hasTime = timings[line.index] !== undefined;
            const isActive = line.index === activeLine;
            const isNext = line.index === nextUntimedLine;

            return (
              <div
                key={line.index}
                className={`timing-line-row ${isActive ? 'timing-line-active' : ''} ${isNext ? 'timing-line-next' : ''}`}
              >
                <div className="timing-line-content">
                  <span className="timing-line-text">{line.text}</span>
                  <div className="timing-line-controls">
                    <input
                      type="text"
                      className="timing-input"
                      value={hasTime ? formatTime(timings[line.index]) : ''}
                      placeholder="0:00"
                      onChange={(e) => {
                        const val = e.target.value;
                        // Allow typing, parse on blur
                        setTimings(prev => ({ ...prev, [line.index]: val }));
                      }}
                      onBlur={(e) => {
                        const parsed = parseTime(e.target.value);
                        if (parsed !== null) {
                          setTimings(prev => ({ ...prev, [line.index]: parsed }));
                        } else if (e.target.value === '') {
                          setTimings(prev => {
                            const next = { ...prev };
                            delete next[line.index];
                            return next;
                          });
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => stampLine(line.index)}
                      className="timing-stamp-btn"
                      title="Stamp current time"
                    >
                      Stamp
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="timing-actions">
          <button onClick={handleSave} disabled={saving} className="admin-submit-btn">
            <Save size={18} /> {saving ? 'Saving...' : 'Save Timing'}
          </button>
          <button onClick={clearAll} className="timing-clear-btn">
            <Trash2 size={16} /> Clear All
          </button>
        </div>
      </div>
    </div>
  );
};

export default LyricsTimingEditor;
