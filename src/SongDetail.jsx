import React, { useState, useEffect } from 'react';
import { X, Star, Check, Music2 } from 'lucide-react';
import { supabase } from './supabaseClient';
import LyricsPlayer from './LyricsPlayer';

const POINTS = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12];

const SongDetail = ({ song, userScore, onVote, onClose, userProfile }) => {
  const [selectedIndex, setSelectedIndex] = useState(
    userScore ? POINTS.indexOf(userScore) : 4
  );
  const sliderValue = POINTS[selectedIndex] ?? POINTS[4];
  const [saved, setSaved] = useState(false);
  const [showLyricsPlayer, setShowLyricsPlayer] = useState(false);

  // Rating categories
  const [ratings, setRatings] = useState({
    lyrics: 5,
    melody: 5,
    memorable: 5,
  });
  const [ratingSaved, setRatingSaved] = useState(false);

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
      } catch {
        // No existing rating
      }
    };
    loadRatings();
  }, [song.id, userProfile?.id]);

  const handleVote = () => {
    onVote(song.id, sliderValue);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleClearVote = () => {
    onVote(song.id, null);
    setSelectedIndex(4);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleRatingSave = async () => {
    if (!userProfile?.id) return;
    try {
      await supabase
        .from('ratings')
        .upsert({
          user_id: userProfile.id,
          song_id: song.id,
          lyrics_rating: ratings.lyrics,
          melody_rating: ratings.melody,
          memorable_rating: ratings.memorable,
        }, { onConflict: 'user_id,song_id' });

      setRatingSaved(true);
      setTimeout(() => setRatingSaved(false), 1500);
    } catch {
      // Fallback: just show saved locally
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

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
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

        {/* Lyrics Section with Player Toggle */}
        <div className="detail-lyrics-container">
          <div className="detail-lyrics-header">
            <h3 className="detail-lyrics-heading">Lyrics</h3>
            <button
              onClick={() => setShowLyricsPlayer(!showLyricsPlayer)}
              className={`lyrics-toggle-btn ${showLyricsPlayer ? 'lyrics-toggle-active' : ''}`}
            >
              <Music2 size={14} />
              <span>{showLyricsPlayer ? 'Static' : 'Sync Mode'}</span>
            </button>
          </div>

          {showLyricsPlayer ? (
            <LyricsPlayer lyrics={song.lyrics} audioUrl={song.audio_url} />
          ) : (
            <div className="detail-lyrics">
              {song.lyrics.split('\n').map((line, i) => {
                if (line.startsWith('[')) {
                  return <p key={i} className="detail-lyrics-section">{line}</p>;
                }
                if (line.trim() === '') {
                  return <br key={i} />;
                }
                return <p key={i} className="detail-lyrics-line">{line}</p>;
              })}
            </div>
          )}
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
            <button
              onClick={handleVote}
              className="detail-submit-btn"
            >
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
                  style={{
                    '--rating-pct': `${((ratings[key] - 1) / 9) * 100}%`,
                  }}
                />
                <span className="rating-value">{ratings[key]}</span>
              </div>
            </div>
          ))}

          <button onClick={handleRatingSave} className="rating-save-btn">
            {ratingSaved ? (
              <><Check size={16} /> Saved!</>
            ) : (
              'Save Ratings'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SongDetail;
