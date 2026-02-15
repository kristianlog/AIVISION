import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack } from 'lucide-react';

const LyricsPlayer = ({ lyrics, audioUrl }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLine, setCurrentLine] = useState(0);
  const [progress, setProgress] = useState(0);
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
          // Skip empty lines and section headers faster
          const line = lines[next];
          if (line && (line.isEmpty || line.isSection)) {
            return next; // These will advance quickly on next tick
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

      // Distribute lyrics evenly across audio duration
      const lineIndex = Math.floor((audio.currentTime / audio.duration) * lines.length);
      setCurrentLine(Math.min(lineIndex, lines.length - 1));
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentLine(0);
      setProgress(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [lines.length]);

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
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

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
              onClick={() => setCurrentLine(i)}
            >
              {line.text}
            </p>
          );
        })}
      </div>
    </div>
  );
};

export default LyricsPlayer;
