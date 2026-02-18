import React, { useState, useRef } from 'react';
import { Music, Star } from 'lucide-react';

const SongCard = ({ song, userScore, onClick, videoUrl, videoPosition }) => {
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
      {/* Static first-frame thumbnail from hover video */}
      {videoUrl && (
        <div className={`song-card-cover-bg ${isHovering ? 'song-card-cover-hidden' : ''}`}>
          <video
            src={videoUrl}
            muted
            playsInline
            preload="metadata"
            className="song-card-cover-media"
            style={videoPosition ? { objectPosition: `${videoPosition.posX}% ${videoPosition.posY}%` } : undefined}
          />
        </div>
      )}

      {/* Video overlay on hover — plays on hover */}
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
            style={videoPosition ? { objectPosition: `${videoPosition.posX}% ${videoPosition.posY}%` } : undefined}
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
