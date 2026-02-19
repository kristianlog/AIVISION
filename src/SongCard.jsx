import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Music, Star } from 'lucide-react';

const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;

const SongCard = ({ song, userScore, onClick, videoUrl, videoPosition }) => {
  const [isHovering, setIsHovering] = useState(false);
  const videoRef = useRef(null);
  const touchTimerRef = useRef(null);
  const didPreview = useRef(false);

  const startPreview = useCallback(() => {
    setIsHovering(true);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, []);

  const stopPreview = useCallback(() => {
    setIsHovering(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, []);

  // Desktop: mouse hover
  const handleMouseEnter = () => {
    if (!isTouchDevice()) startPreview();
  };
  const handleMouseLeave = () => {
    if (!isTouchDevice()) stopPreview();
  };

  // Mobile: quick tap = preview video, second tap or long-hold = open detail
  const handleTouchStart = useCallback((e) => {
    if (!videoUrl) return;
    didPreview.current = false;
    touchTimerRef.current = setTimeout(() => {
      // After 150ms of holding, start video preview
      if (!isHovering) {
        startPreview();
        didPreview.current = true;
      }
    }, 150);
  }, [videoUrl, isHovering, startPreview]);

  const handleTouchEnd = useCallback((e) => {
    clearTimeout(touchTimerRef.current);

    if (isHovering && didPreview.current) {
      // Video is playing from a previous tap — stop it and open detail
      stopPreview();
      didPreview.current = false;
      // Let the onClick handler fire naturally
    } else if (!didPreview.current && !isHovering && videoUrl) {
      // Quick tap — show video preview, prevent opening detail
      e.preventDefault();
      startPreview();
      didPreview.current = true;
      // Auto-stop preview after 4 seconds
      setTimeout(stopPreview, 4000);
    }
  }, [isHovering, videoUrl, startPreview, stopPreview]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => clearTimeout(touchTimerRef.current);
  }, []);

  return (
    <button
      onClick={onClick}
      className="song-card group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
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

      {/* Video overlay — plays on hover (desktop) or tap (mobile) */}
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
