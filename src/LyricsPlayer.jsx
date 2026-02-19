import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Play, Pause, SkipBack } from 'lucide-react';

const LyricsPlayer = ({ lyrics, audioUrl, lyricsTiming }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLine, setCurrentLine] = useState(0);
  const [progress, setProgress] = useState(0);
  const [lineProgress, setLineProgress] = useState(0);
  const audioRef = useRef(null);
  const lyricsContainerRef = useRef(null);
  const intervalRef = useRef(null);

  // Parse lyrics into lines
  const lines = lyrics
    ? lyrics.split('\n').map((line, i) => ({
        index: i,
        text: line,
        isSection: line.startsWith('['),
        isEmpty: line.trim() === '',
      }))
    : [];

  // Check if real timing data is available
  const hasTimingData = lyricsTiming && Array.isArray(lyricsTiming) && lyricsTiming.length > 0;
  const sortedTimings = useMemo(() => {
    if (!hasTimingData) return [];
    return [...lyricsTiming].sort((a, b) => a.time - b.time);
  }, [lyricsTiming, hasTimingData]);

  // Build a map from line index → time for click-to-seek
  const lineTimeMap = useMemo(() => {
    if (!hasTimingData) return {};
    const map = {};
    for (const entry of sortedTimings) {
      map[entry.line] = entry.time;
    }
    return map;
  }, [sortedTimings, hasTimingData]);

  // Auto-scroll lyrics based on audio progress or timer
  useEffect(() => {
    if (isPlaying && !audioUrl) {
      // No audio: auto-scroll through lyrics every 2.5 seconds
      intervalRef.current = setInterval(() => {
        setCurrentLine(prev => {
          const next = prev + 1;
          if (next >= lines.length) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }, 2500);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, audioUrl, lines.length]);

  // Scroll active line into view
  useEffect(() => {
    if (lyricsContainerRef.current) {
      const activeEl = lyricsContainerRef.current.querySelector('.lyrics-line-active');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentLine]);

  // Audio time update handler
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const pct = (audio.currentTime / audio.duration) * 100;
      setProgress(pct);

      if (hasTimingData && sortedTimings.length > 0) {
        // Use real timing data: find the last line whose timestamp <= currentTime
        let activeLine = 0;
        let activeTime = 0;
        let nextTime = audio.duration;
        for (let i = 0; i < sortedTimings.length; i++) {
          if (sortedTimings[i].time <= audio.currentTime) {
            activeLine = sortedTimings[i].line;
            activeTime = sortedTimings[i].time;
            nextTime = i + 1 < sortedTimings.length ? sortedTimings[i + 1].time : audio.duration;
          } else {
            break;
          }
        }
        setCurrentLine(activeLine);

        // Calculate intra-line progress
        const lineDuration = nextTime - activeTime;
        if (lineDuration > 0) {
          const elapsed = audio.currentTime - activeTime;
          setLineProgress(Math.min(Math.max(elapsed / lineDuration, 0), 1));
        } else {
          setLineProgress(0);
        }
      } else {
        // Fallback: distribute lyrics evenly across audio duration
        const lineIndex = Math.floor((audio.currentTime / audio.duration) * lines.length);
        setCurrentLine(Math.min(lineIndex, lines.length - 1));
        setLineProgress(0);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentLine(0);
      setProgress(0);
      setLineProgress(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [lines.length, hasTimingData, sortedTimings]);

  // Update progress for non-audio mode
  useEffect(() => {
    if (!audioUrl && lines.length > 0) {
      setProgress((currentLine / lines.length) * 100);
    }
  }, [currentLine, audioUrl, lines.length]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
    setIsPlaying(!isPlaying);
  };

  const restart = () => {
    setCurrentLine(0);
    setProgress(0);
    setLineProgress(0);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  // Click-to-seek: jump audio to a line's timestamp
  const handleLineClick = useCallback((lineIndex) => {
    if (audioRef.current && hasTimingData && lineTimeMap[lineIndex] !== undefined) {
      audioRef.current.currentTime = lineTimeMap[lineIndex];
      setCurrentLine(lineIndex);
      if (!isPlaying) {
        audioRef.current.play();
        setIsPlaying(true);
      }
    } else {
      setCurrentLine(lineIndex);
    }
  }, [hasTimingData, lineTimeMap, isPlaying]);

  if (!lyrics || lines.length === 0) return null;

  return (
    <div className="lyrics-player">
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="metadata" />}

      {/* Progress bar */}
      <div className="lyrics-progress-bar">
        <div className="lyrics-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Controls */}
      <div className="lyrics-controls">
        <button onClick={restart} className="lyrics-ctrl-btn" title="Restart">
          <SkipBack size={16} />
        </button>
        <button onClick={togglePlay} className="lyrics-play-btn" title={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
      </div>

      {/* Scrolling Lyrics */}
      <div className="lyrics-scroll-container" ref={lyricsContainerRef}>
        {lines.map((line, i) => {
          if (line.isEmpty) return <div key={i} className="lyrics-line-spacer" />;

          const isActive = i === currentLine;
          const isPast = i < currentLine;

          if (line.isSection) {
            return (
              <p
                key={i}
                className={`lyrics-section-label ${isActive ? 'lyrics-line-active' : ''} ${isPast ? 'lyrics-line-past' : ''}`}
              >
                {line.text}
              </p>
            );
          }

          return (
            <p
              key={i}
              className={`lyrics-sync-line ${isActive ? 'lyrics-line-active' : ''} ${isPast ? 'lyrics-line-past' : ''}`}
              onClick={() => handleLineClick(i)}
            >
              {isActive && hasTimingData && (
                <span
                  className="lyrics-line-fill"
                  style={{ width: `${lineProgress * 100}%` }}
                />
              )}
              <span className="lyrics-line-text-inner">{line.text}</span>
            </p>
          );
        })}
      </div>
    </div>
  );
};

export default LyricsPlayer;
