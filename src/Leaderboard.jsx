import React from 'react';
import { Trophy, Medal, Award, Star } from 'lucide-react';

const Leaderboard = ({ songs, userVotes, allVotes }) => {
  // Build leaderboard from all votes
  const rankings = songs.map((song) => {
    const songVotes = allVotes.filter((v) => v.song_id === song.id);
    const totalPoints = songVotes.reduce((sum, v) => sum + v.score, 0);
    const voterCount = songVotes.length;
    const userScore = userVotes[song.id] || null;
    return { ...song, totalPoints, voterCount, userScore };
  });

  rankings.sort((a, b) => b.totalPoints - a.totalPoints);

  const getRankIcon = (index) => {
    if (index === 0) return <Trophy size={24} className="leaderboard-icon-gold" />;
    if (index === 1) return <Medal size={24} className="leaderboard-icon-silver" />;
    if (index === 2) return <Award size={24} className="leaderboard-icon-bronze" />;
    return <span className="leaderboard-rank-num">{index + 1}</span>;
  };

  const hasAnyVotes = rankings.some((r) => r.totalPoints > 0);

  return (
    <div className="leaderboard">
      <div className="leaderboard-header">
        <Trophy size={28} className="leaderboard-header-icon" />
        <h2 className="leaderboard-title">Leaderboard</h2>
      </div>

      {!hasAnyVotes ? (
        <div className="leaderboard-empty">
          <Star size={48} className="leaderboard-empty-icon" />
          <p className="leaderboard-empty-title">No votes yet!</p>
          <p className="leaderboard-empty-sub">Be the first to vote for your favorites.</p>
        </div>
      ) : (
        <div className="leaderboard-list">
          {rankings.map((song, index) => (
            <div
              key={song.id}
              className={`leaderboard-row ${index < 3 && song.totalPoints > 0 ? 'leaderboard-row-top' : ''}`}
            >
              <div className="leaderboard-row-rank">
                {getRankIcon(index)}
              </div>
              <div className="leaderboard-row-flag">{song.flag}</div>
              <div className="leaderboard-row-info">
                <p className="leaderboard-row-title">{song.title}</p>
                <p className="leaderboard-row-meta">{song.artist} &mdash; {song.country}</p>
              </div>
              <div className="leaderboard-row-stats">
                <span className="leaderboard-row-points">{song.totalPoints} pts</span>
                <span className="leaderboard-row-voters">{song.voterCount} vote{song.voterCount !== 1 ? 's' : ''}</span>
              </div>
              {song.userScore && (
                <div className="leaderboard-row-yourvote">
                  You: {song.userScore}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
