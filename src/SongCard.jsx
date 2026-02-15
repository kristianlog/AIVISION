import React from 'react';
import { Music, Star } from 'lucide-react';

const SongCard = ({ song, userScore, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="song-card group"
    >
      <div className="song-card-flag">{song.flag}</div>
      <div className="song-card-body">
        <span className="song-card-genre">{song.genre}</span>
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
