import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, Star, Check, Play, Pause, SkipBack } from 'lucide-react';
import { supabase } from './supabaseClient';
import useFlagColors from './useFlagColors';

const POINTS = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12];

const formatTime = (s) => {
  if (!s && s !== 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

const SongDetail = ({ song, userScore, onVote, onClose, userProfile, videoUrl }) => {
  const [selectedIndex, setSelectedIndex] = useState(
    userScore ? POINTS.indexOf(userScore) : 4
  );
  const sliderValue = POINTS[selectedIndex] ?? POINTS[4];
  const [saved, setSaved] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Audio state
  const audioRef = useRef(null);
  const lyricsRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentLine, setCurrentLine] = useState(-1);

  // Rating categories
  const [ratings, setRatings] = useState({ lyrics: 5, melody: 5, memorable: 5 });
  const [ratingSaved, setRatingSaved] = useState(false);

  const hasAudio = !!song.audio_url;

  // Flag colors for dynamic effects
  const flagColors = useFlagColors(song.flag);

  // Always set CSS vars so transitions work smoothly when pausing
  const flagColorStyle = useMemo(() => {
    if (!flagColors) return {};
    const c1 = flagColors[0] || '#8b5cf6';
    const c2 = flagColors[1] || flagColors[0] || '#ec4899';
    const c3 = flagColors[2] || c1;
    return {
      '--flag-color-1': c1,
      '--flag-color-2': c2,
      '--flag-color-3': c3,
    };
  }, [flagColors]);

  // Parse lyrics
  const lines = useMemo(() => {
    if (!song.lyrics) return [];
    return song.lyrics.split('\n').map((text, i) => ({
      index: i,
      text,
      isSection: text.startsWith('['),
      isEmpty: text.trim() === '',
    }));
  }, [song.lyrics]);

  // Timing data
  const hasTimingData = song.lyrics_timing && Array.isArray(song.lyrics_timing) && song.lyrics_timing.length > 0;
  const sortedTimings = useMemo(() => {
    if (!hasTimingData) return [];
    return [...song.lyrics_timing].sort((a, b) => a.time - b.time);
  }, [song.lyrics_timing, hasTimingData]);

  // Build a map from line index to time for click-to-seek
  const lineTimeMap = useMemo(() => {
    if (!hasTimingData) return {};
    const map = {};
    song.lyrics_timing.forEach(entry => { map[entry.line] = entry.time; });
    return map;
  }, [song.lyrics_timing, hasTimingData]);

  // Load existing ratings
  useEffect(() => {
    if (!userProfile?.id) return;
    const loadRatings = async () => {
      try {
        const { data } = await supabase
          .from('ratings')
          .select('*')
          .eq('user_id', userProfile.id)
          .eq('song_id', song.id)
          .single();
        if (data) {
          setRatings({
            lyrics: data.lyrics_rating || 5,
            melody: data.melody_rating || 5,
            memorable: data.memorable_rating || 5,
          });
        }
      } catch { /* No existing rating */ }
    };
    loadRatings();
  }, [song.id, userProfile?.id]);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration || 0);

      // Update active line
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
    if (currentLine >= 0 && lyricsRef.current && isPlaying) {
      const el = lyricsRef.current.querySelector('.lyrics-line-active');
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

  const seekTo = useCallback((e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * duration;
  }, [duration]);

  const seekToLine = useCallback((lineIndex) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (lineTimeMap[lineIndex] !== undefined) {
      audio.currentTime = lineTimeMap[lineIndex];
      if (!isPlaying) {
        audio.play();
        setIsPlaying(true);
      }
    }
  }, [lineTimeMap, isPlaying]);

  const handleVote = useCallback(() => {
    setShowConfirmation(true);
  }, []);

  const confirmVote = useCallback(() => {
    onVote(song.id, sliderValue);
    setShowConfirmation(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, [onVote, song.id, sliderValue]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showConfirmation) {
        if (e.key === 'Escape') {
          setShowConfirmation(false);
          e.preventDefault();
        }
        if (e.key === 'Enter') {
          confirmVote();
          e.preventDefault();
        }
        return;
      }

      if (e.key === 'Escape') {
        onClose();
        e.preventDefault();
        return;
      }

      const keyMap = {
        '1': 0, '2': 1, '3': 2, '4': 3, '5': 4,
        '6': 5, '7': 6, '8': 7, '9': 8, '0': 9
      };
      if (keyMap[e.key] !== undefined) {
        setSelectedIndex(keyMap[e.key]);
        e.preventDefault();
        return;
      }

      if (e.key === ' ' && hasAudio) {
        togglePlay();
        e.preventDefault();
        return;
      }

      if (e.key === 'Enter') {
        handleVote();
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showConfirmation, onClose, hasAudio, togglePlay, handleVote, confirmVote]);

  const handleClearVote = () => {
    onVote(song.id, null);
    setSelectedIndex(4);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleRatingSave = async () => {
    if (!userProfile?.id) return;
    try {
      await supabase.from('ratings').upsert({
        user_id: userProfile.id,
        song_id: song.id,
        lyrics_rating: ratings.lyrics,
        melody_rating: ratings.melody,
        memorable_rating: ratings.memorable,
      }, { onConflict: 'user_id,song_id' });
      setRatingSaved(true);
      setTimeout(() => setRatingSaved(false), 1500);
    } catch {
      setRatingSaved(true);
      setTimeout(() => setRatingSaved(false), 1500);
    }
  };

  const getSliderLabel = (value) => {
    if (value <= 2) return 'Meh';
    if (value <= 4) return 'Okay';
    if (value <= 6) return 'Good';
    if (value <= 8) return 'Great';
    if (value <= 10) return 'Amazing';
    return 'DOUZE POINTS!';
  };

  const getSliderColor = (value) => {
    if (value <= 4) return '#8b5cf6';
    if (value <= 8) return '#ec4899';
    if (value <= 10) return '#f59e0b';
    return '#fbbf24';
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div
        className={`detail-modal ${isPlaying && flagColors ? 'detail-modal-playing' : ''}`}
        onClick={(e) => e.stopPropagation()}
        style={flagColorStyle}
      >
        {/* Background video */}
        {videoUrl && (
          <div className="detail-bg-video">
            <video
              src={videoUrl}
              autoPlay
              muted
              loop
              playsInline
              className="detail-bg-video-el"
            />
          </div>
        )}

        <button onClick={onClose} className="detail-close">
          <X size={20} />
        </button>

        <div className="detail-header">
          <span className="detail-flag">{song.flag}</span>
          <div>
            <h2 className="detail-title">{song.title}</h2>
            <p className="detail-artist">{song.artist} &mdash; {song.country}</p>
            <span className="detail-genre">{song.genre}</span>
          </div>
        </div>

        {/* Audio Player */}
        {hasAudio && (
          <div className="song-player">
            <audio ref={audioRef} src={song.audio_url} preload="metadata" />
            <div className="song-player-controls">
              <button onClick={restart} className="song-player-btn" title="Restart">
                <SkipBack size={16} />
              </button>
              <button onClick={togglePlay} className="song-player-play" title={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
              <div className="song-player-progress" onClick={seekTo}>
                <div className="song-player-progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
              <span className="song-player-time">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
          </div>
        )}

        {/* Lyrics */}
        <div className="detail-lyrics-container">
          <h3 className="detail-lyrics-heading">Lyrics</h3>
          <div className="detail-lyrics" ref={lyricsRef}>
            {lines.map((line, i) => {
              if (line.isEmpty) return <div key={i} className="lyrics-line-spacer" />;

              const isActive = i === currentLine;
              const isPast = i < currentLine && currentLine >= 0;
              const canSeek = hasAudio && lineTimeMap[i] !== undefined;

              if (line.isSection) {
                return (
                  <p
                    key={i}
                    className={`detail-lyrics-section ${isActive ? 'lyrics-line-active' : ''} ${isPast ? 'lyrics-line-past' : ''}`}
                  >
                    {line.text}
                  </p>
                );
              }

              return (
                <p
                  key={i}
                  className={`detail-lyrics-line ${isActive ? 'lyrics-line-active' : ''} ${isPast ? 'lyrics-line-past' : ''} ${canSeek ? 'lyrics-line-clickable' : ''}`}
                  onClick={canSeek ? () => seekToLine(i) : undefined}
                >
                  {line.text}
                </p>
              );
            })}
          </div>
        </div>

        {/* Voting Slider */}
        <div className="detail-voting">
          <h3 className="detail-voting-heading">Give your points</h3>

          <div className="vote-slider-container">
            <div className="vote-slider-value" style={{ color: getSliderColor(sliderValue) }}>
              <span className="vote-slider-number">{sliderValue}</span>
              <span className="vote-slider-label">{getSliderLabel(sliderValue)}</span>
            </div>

            <div className="vote-slider-track-wrapper">
              <input
                type="range"
                min="0"
                max="9"
                value={selectedIndex}
                onChange={(e) => setSelectedIndex(parseInt(e.target.value))}
                className="vote-slider"
                style={{
                  '--slider-pct': `${(selectedIndex / 9) * 100}%`,
                  '--slider-color': getSliderColor(sliderValue),
                }}
              />
              <div className="vote-slider-markers">
                {POINTS.map(p => <span key={p}>{p}</span>)}
              </div>
            </div>
          </div>

          <div className="detail-actions">
            <button onClick={handleVote} className="detail-submit-btn">
              {saved ? (
                <><Check size={18} /><span>Saved!</span></>
              ) : (
                <><Star size={18} /><span>{userScore ? 'Update Vote' : 'Cast Vote'}</span></>
              )}
            </button>
            {userScore && (
              <button onClick={handleClearVote} className="detail-clear-btn">
                Remove Vote
              </button>
            )}
          </div>
        </div>

        {/* Rating Categories */}
        <div className="rating-categories">
          <h3 className="detail-voting-heading">Rate this song</h3>
          <p className="rating-subtitle">How does this song score?</p>

          {[
            { key: 'lyrics', label: 'Lyrics', emoji: '\u{270D}\u{FE0F}' },
            { key: 'melody', label: 'Melody', emoji: '\u{1F3B5}' },
            { key: 'memorable', label: 'Memorable', emoji: '\u{1F4AB}' },
          ].map(({ key, label, emoji }) => (
            <div key={key} className="rating-row">
              <div className="rating-row-label">
                <span className="rating-emoji">{emoji}</span>
                <span className="rating-name">{label}</span>
              </div>
              <div className="rating-slider-wrap">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={ratings[key]}
                  onChange={(e) => setRatings(prev => ({ ...prev, [key]: parseInt(e.target.value) }))}
                  className="rating-slider"
                  style={{ '--rating-pct': `${((ratings[key] - 1) / 9) * 100}%` }}
                />
                <span className="rating-value">{ratings[key]}</span>
              </div>
            </div>
          ))}

          <button onClick={handleRatingSave} className="rating-save-btn">
            {ratingSaved ? <><Check size={16} /> Saved!</> : 'Save Ratings'}
          </button>
        </div>

        {/* Vote Confirmation Modal */}
        {showConfirmation && (
          <div className="confirmation-overlay" onClick={() => setShowConfirmation(false)}>
            <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
              <h3 className="confirmation-title">Confirm Your Vote</h3>
              <div className="confirmation-content">
                <div className="confirmation-song">
                  <span className="confirmation-flag">{song.flag}</span>
                  <div>
                    <p className="confirmation-song-title">{song.title}</p>
                    <p className="confirmation-song-artist">{song.artist}</p>
                  </div>
                </div>
                <div className="confirmation-points">
                  <div className="confirmation-points-value" style={{ color: getSliderColor(sliderValue) }}>
                    {sliderValue}
                  </div>
                  <p className="confirmation-points-label">points</p>
                  <p className="confirmation-points-desc">{getSliderLabel(sliderValue)}</p>
                </div>
              </div>
              <div className="confirmation-actions">
                <button onClick={() => setShowConfirmation(false)} className="confirmation-cancel">
                  Cancel
                </button>
                <button onClick={confirmVote} className="confirmation-confirm">
                  <Check size={18} />
                  Confirm Vote
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SongDetail;
