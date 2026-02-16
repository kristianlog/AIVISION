import React, { useState, useRef } from 'react';
import { Music, Star } from 'lucide-react';

const SongCard = ({ song, userScore, onClick, videoUrl }) => {
  const [isHovering, setIsHovering] = useState(false);
  const videoRef = useRef(null);

  const handleMouseEnter = () => {
    setIsHovering(true);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <button
      onClick={onClick}
      className="song-card group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Video overlay on hover */}
      {videoUrl && (
        <div className={`song-card-video-overlay ${isHovering ? 'song-card-video-visible' : ''}`}>
          <video
            ref={videoRef}
            src={videoUrl}
            muted
            loop
            playsInline
            preload="metadata"
            className="song-card-video"
          />
        </div>
      )}

      <div className="song-card-flag">{song.flag}</div>
      <div className="song-card-body">
        <h3 className="song-card-title">{song.title}</h3>
        <p className="song-card-artist">{song.artist}</p>
        <p className="song-card-country">{song.country}</p>
      </div>
      <div className="song-card-footer">
        {userScore ? (
          <div className="song-card-score">
            <Star className="song-card-score-icon" />
            <span>{userScore} pts</span>
          </div>
        ) : (
          <div className="song-card-vote-prompt">
            <Music className="song-card-vote-icon" />
            <span>Tap to vote</span>
          </div>
        )}
      </div>
    </button>
  );
};

export default SongCard;
