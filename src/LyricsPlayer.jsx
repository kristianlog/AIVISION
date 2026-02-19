import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Play, Pause, SkipBack } from 'lucide-react';

const LyricsPlayer = ({ lyrics, audioUrl, lyricsTiming }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLine, setCurrentLine] = useState(0);
  const [progress, setProgress] = useState(0);
  const [lineProgress, setLineProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);
  const lyricsContainerRef = useRef(null);
  const intervalRef = useRef(null);
  const animFrameRef = useRef(null);

  // Parse lyrics into lines
  const lines = lyrics
    ? lyrics.split('\n').map((line, i) => ({
        index: i,
        text: line,
        isSection: line.startsWith('['),
        isEmpty: line.trim() === '',
        words: line.trim() ? line.trim().split(/\s+/) : [],
      }))
    : [];

  // Check if real timing data is available
  const hasTimingData = lyricsTiming && Array.isArray(lyricsTiming) && lyricsTiming.length > 0;
  const sortedTimings = useMemo(() => {
    if (!hasTimingData) return [];
    return [...lyricsTiming].sort((a, b) => a.time - b.time);
  }, [lyricsTiming, hasTimingData]);

  // Build maps for line timing and word timing
  const lineTimeMap = useMemo(() => {
    if (!hasTimingData) return {};
    const map = {};
    for (const entry of sortedTimings) {
      map[entry.line] = entry.time;
    }
    return map;
  }, [sortedTimings, hasTimingData]);

  const wordTimeMap = useMemo(() => {
    if (!hasTimingData) return {};
    const map = {};
    for (const entry of lyricsTiming) {
      if (entry.words && Array.isArray(entry.words) && entry.words.length > 0) {
        map[entry.line] = entry.words;
      }
    }
    return map;
  }, [lyricsTiming, hasTimingData]);

  const hasWordTimings = Object.keys(wordTimeMap).length > 0;

  // Auto-scroll lyrics based on audio progress or timer
  useEffect(() => {
    if (isPlaying && !audioUrl) {
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

  // Audio updates via requestAnimationFrame for smooth word highlighting
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {};
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentLine(0);
      setProgress(0);
      setLineProgress(0);
      setCurrentTime(0);
      cancelAnimationFrame(animFrameRef.current);
    };

    const tick = () => {
      if (audio && !audio.paused) {
        const time = audio.currentTime;
        setCurrentTime(time);
        const pct = (time / audio.duration) * 100;
        setProgress(pct);

        if (hasTimingData && sortedTimings.length > 0) {
          let activeLine = 0;
          let activeTime = 0;
          let nextTime = audio.duration;
          for (let i = 0; i < sortedTimings.length; i++) {
            if (sortedTimings[i].time <= time) {
              activeLine = sortedTimings[i].line;
              activeTime = sortedTimings[i].time;
              nextTime = i + 1 < sortedTimings.length ? sortedTimings[i + 1].time : audio.duration;
            } else {
              break;
            }
          }
          setCurrentLine(activeLine);

          const lineDuration = nextTime - activeTime;
          if (lineDuration > 0) {
            const elapsed = time - activeTime;
            setLineProgress(Math.min(Math.max(elapsed / lineDuration, 0), 1));
          } else {
            setLineProgress(0);
          }
        } else {
          const lineIndex = Math.floor((time / audio.duration) * lines.length);
          setCurrentLine(Math.min(lineIndex, lines.length - 1));
          setLineProgress(0);
        }
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      cancelAnimationFrame(animFrameRef.current);
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
    setCurrentTime(0);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  // Click-to-seek
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

  // Get active word index for a line based on current time
  const getActiveWordIndex = useCallback((lineIndex) => {
    const words = wordTimeMap[lineIndex];
    if (!words || words.length === 0) return -1;
    let active = -1;
    for (let i = 0; i < words.length; i++) {
      if (words[i].time <= currentTime) active = i;
      else break;
    }
    return active;
  }, [wordTimeMap, currentTime]);

  // Get word progress (for the active word fill effect)
  const getWordProgress = useCallback((lineIndex, wordIndex) => {
    const words = wordTimeMap[lineIndex];
    if (!words || !words[wordIndex]) return 0;
    const wordTime = words[wordIndex].time;
    const nextTime = wordIndex + 1 < words.length ? words[wordIndex + 1].time : null;
    if (nextTime === null) return currentTime >= wordTime ? 1 : 0;
    const dur = nextTime - wordTime;
    if (dur <= 0) return 1;
    return Math.min(Math.max((currentTime - wordTime) / dur, 0), 1);
  }, [wordTimeMap, currentTime]);

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

          // Word-level rendering for active line with word timings
          const lineWords = wordTimeMap[i];
          const showWordHighlight = isActive && hasWordTimings && lineWords && lineWords.length > 0;
          const activeWordIdx = showWordHighlight ? getActiveWordIndex(i) : -1;

          return (
            <p
              key={i}
              className={`lyrics-sync-line ${isActive ? 'lyrics-line-active' : ''} ${isPast ? 'lyrics-line-past' : ''}`}
              onClick={() => handleLineClick(i)}
            >
              {isActive && hasTimingData && !showWordHighlight && (
                <span
                  className="lyrics-line-fill"
                  style={{ width: `${lineProgress * 100}%` }}
                />
              )}
              {showWordHighlight ? (
                <span className="lyrics-words-container">
                  {line.words.map((word, wi) => {
                    const matchedWord = lineWords.find(w => w.word === word && lineWords.indexOf(w) === wi)
                      || lineWords[wi];
                    const isWordActive = wi === activeWordIdx;
                    const isWordPast = wi < activeWordIdx;
                    const wordProg = isWordActive ? getWordProgress(i, wi) : 0;

                    return (
                      <span key={wi} className="lyrics-word-wrapper">
                        <span
                          className={`lyrics-word ${isWordActive ? 'lyrics-word-active' : ''} ${isWordPast ? 'lyrics-word-past' : ''}`}
                        >
                          {isWordActive && (
                            <span className="lyrics-word-fill" style={{ width: `${wordProg * 100}%` }} />
                          )}
                          <span className="lyrics-word-text">{word}</span>
                        </span>
                        {wi < line.words.length - 1 && <span className="lyrics-word-space"> </span>}
                      </span>
                    );
                  })}
                </span>
              ) : (
                <span className="lyrics-line-text-inner">{line.text}</span>
              )}
            </p>
          );
        })}
      </div>
    </div>
  );
};

export default LyricsPlayer;
