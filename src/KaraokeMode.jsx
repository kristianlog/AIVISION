import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, Play, Pause, SkipBack, Maximize2, Minimize2 } from 'lucide-react';

const formatTime = (s) => {
  if (!s && s !== 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

const KaraokeMode = ({ song, onClose }) => {
  const audioRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentLine, setCurrentLine] = useState(-1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const lines = useMemo(() => {
    if (!song.lyrics) return [];
    return song.lyrics.split('\n').map((text, i) => ({
      index: i,
      text,
      isSection: text.startsWith('['),
      isEmpty: text.trim() === '',
    }));
  }, [song.lyrics]);

  const hasTimingData = song.lyrics_timing && Array.isArray(song.lyrics_timing) && song.lyrics_timing.length > 0;
  const sortedTimings = useMemo(() => {
    if (!hasTimingData) return [];
    return [...song.lyrics_timing].sort((a, b) => a.time - b.time);
  }, [song.lyrics_timing, hasTimingData]);

  const lineTimeMap = useMemo(() => {
    if (!hasTimingData) return {};
    const map = {};
    song.lyrics_timing.forEach(entry => { map[entry.line] = entry.time; });
    return map;
  }, [song.lyrics_timing, hasTimingData]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration || 0);

      if (hasTimingData && sortedTimings.length > 0) {
        let active = -1;
        for (const entry of sortedTimings) {
          if (entry.time <= audio.currentTime) active = entry.line;
          else break;
        }
        setCurrentLine(active);
      } else if (lines.length > 0 && audio.duration) {
        const idx = Math.floor((audio.currentTime / audio.duration) * lines.length);
        setCurrentLine(Math.min(idx, lines.length - 1));
      }
    };

    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onEnded = () => { setIsPlaying(false); setCurrentLine(-1); };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, [hasTimingData, sortedTimings, lines.length]);

  // Auto-scroll to active line
  useEffect(() => {
    if (currentLine >= 0 && isPlaying) {
      const el = document.querySelector('.karaoke-line-active');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentLine, isPlaying]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const restart = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setCurrentTime(0);
    setCurrentLine(-1);
    setIsPlaying(false);
  }, []);

  const seekToLine = useCallback((lineIndex) => {
    const audio = audioRef.current;
    if (!audio || lineTimeMap[lineIndex] === undefined) return;
    audio.currentTime = lineTimeMap[lineIndex];
    if (!isPlaying) {
      audio.play();
      setIsPlaying(true);
    }
  }, [lineTimeMap, isPlaying]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') { onClose(); e.preventDefault(); }
      if (e.key === ' ') { togglePlay(); e.preventDefault(); }
      if (e.key === 'f' || e.key === 'F') { toggleFullscreen(); e.preventDefault(); }
      if (e.key === 'r' || e.key === 'R') { restart(); e.preventDefault(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, togglePlay, toggleFullscreen, restart]);

  // Auto-play on mount
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && song.audio_url) {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [song.audio_url]);

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Get 3 lines: previous, current, next for the focused view
  const getVisibleLines = () => {
    const nonEmptyLines = lines.filter(l => !l.isEmpty);
    const currentIdx = nonEmptyLines.findIndex(l => l.index === currentLine);

    if (currentIdx === -1) return { prev: null, current: null, next: nonEmptyLines[0] || null };

    return {
      prev: currentIdx > 0 ? nonEmptyLines[currentIdx - 1] : null,
      current: nonEmptyLines[currentIdx],
      next: currentIdx < nonEmptyLines.length - 1 ? nonEmptyLines[currentIdx + 1] : null,
    };
  };

  const visible = getVisibleLines();

  return (
    <div className="karaoke-overlay" ref={containerRef}>
      <audio ref={audioRef} src={song.audio_url} preload="metadata" />

      {/* Header */}
      <div className="karaoke-header">
        <div className="karaoke-song-info">
          <span className="karaoke-flag">{song.flag}</span>
          <div>
            <p className="karaoke-song-title">{song.title}</p>
            <p className="karaoke-song-artist">{song.artist}</p>
          </div>
        </div>
        <div className="karaoke-header-actions">
          <button onClick={toggleFullscreen} className="karaoke-control-btn" title="Fullscreen (F)">
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          <button onClick={onClose} className="karaoke-control-btn" title="Close (Esc)">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Centered lyrics display */}
      <div className="karaoke-lyrics-center">
        {visible.prev && (
          <p className={`karaoke-line karaoke-line-prev ${visible.prev.isSection ? 'karaoke-line-section' : ''}`}>
            {visible.prev.text}
          </p>
        )}
        {visible.current ? (
          <p className={`karaoke-line karaoke-line-active ${visible.current.isSection ? 'karaoke-line-section' : ''}`}>
            {visible.current.text}
          </p>
        ) : (
          <p className="karaoke-line karaoke-line-waiting">
            {isPlaying ? '♪ ♪ ♪' : 'Press play to start'}
          </p>
        )}
        {visible.next && (
          <p className={`karaoke-line karaoke-line-next ${visible.next.isSection ? 'karaoke-line-section' : ''}`}>
            {visible.next.text}
          </p>
        )}
      </div>

      {/* Scrollable full lyrics (dimmed) */}
      <div className="karaoke-full-lyrics">
        {lines.map((line, i) => {
          if (line.isEmpty) return <div key={i} className="karaoke-spacer" />;
          const isActive = i === currentLine;
          const isPast = i < currentLine && currentLine >= 0;
          const canSeek = hasTimingData && lineTimeMap[i] !== undefined;

          return (
            <p
              key={i}
              className={`karaoke-full-line ${isActive ? 'karaoke-line-active' : ''} ${isPast ? 'karaoke-full-line-past' : ''} ${line.isSection ? 'karaoke-line-section' : ''} ${canSeek ? 'karaoke-full-line-clickable' : ''}`}
              onClick={canSeek ? () => seekToLine(i) : undefined}
            >
              {line.text}
            </p>
          );
        })}
      </div>

      {/* Controls bar */}
      <div className="karaoke-controls">
        <button onClick={restart} className="karaoke-control-btn" title="Restart (R)">
          <SkipBack size={18} />
        </button>
        <button onClick={togglePlay} className="karaoke-play-btn" title="Play/Pause (Space)">
          {isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </button>
        <div className="karaoke-progress">
          <div className="karaoke-progress-track">
            <div className="karaoke-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
        <span className="karaoke-time">{formatTime(currentTime)} / {formatTime(duration)}</span>
      </div>
    </div>
  );
};

export default KaraokeMode;
