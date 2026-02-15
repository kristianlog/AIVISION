import React, { useState } from 'react';
import { X, Star, Check } from 'lucide-react';

const POINTS = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12];

const SongDetail = ({ song, userScore, onVote, onClose }) => {
  const [selectedScore, setSelectedScore] = useState(userScore || null);
  const [saved, setSaved] = useState(false);

  const handleVote = () => {
    if (selectedScore) {
      onVote(song.id, selectedScore);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  };

  const handleClearVote = () => {
    onVote(song.id, null);
    setSelectedScore(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
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

        <div className="detail-lyrics-container">
          <h3 className="detail-lyrics-heading">Lyrics</h3>
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
        </div>

        <div className="detail-voting">
          <h3 className="detail-voting-heading">Give your points</h3>
          <div className="detail-points-grid">
            {POINTS.map((pts) => (
              <button
                key={pts}
                onClick={() => setSelectedScore(pts)}
                className={`detail-point-btn ${selectedScore === pts ? 'detail-point-btn-active' : ''} ${pts === 12 ? 'detail-point-btn-twelve' : ''} ${pts === 10 ? 'detail-point-btn-ten' : ''}`}
              >
                {pts}
              </button>
            ))}
          </div>
          <div className="detail-actions">
            <button
              onClick={handleVote}
              disabled={!selectedScore}
              className="detail-submit-btn"
            >
              {saved ? (
                <>
                  <Check size={18} />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Star size={18} />
                  <span>{userScore ? 'Update Vote' : 'Cast Vote'}</span>
                </>
              )}
            </button>
            {userScore && (
              <button onClick={handleClearVote} className="detail-clear-btn">
                Remove Vote
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SongDetail;
