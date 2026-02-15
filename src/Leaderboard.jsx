import React, { useState } from 'react';
import { Trophy, Medal, Award, Star, BarChart3, Heart } from 'lucide-react';

const Leaderboard = ({ songs, userVotes, allVotes, allRatings = [] }) => {
  const [view, setView] = useState('ratings'); // 'ratings' or 'votes'

  // ── Ratings-based leaderboard ─────────────────────────
  const ratingsRankings = songs.map((song) => {
    const songRatings = allRatings.filter((r) => r.song_id === song.id);
    const raterCount = songRatings.length;

    if (raterCount === 0) {
      return { ...song, avgLyrics: 0, avgMelody: 0, avgMemorable: 0, avgOverall: 0, raterCount: 0 };
    }

    const avgLyrics = songRatings.reduce((s, r) => s + (r.lyrics_rating || 0), 0) / raterCount;
    const avgMelody = songRatings.reduce((s, r) => s + (r.melody_rating || 0), 0) / raterCount;
    const avgMemorable = songRatings.reduce((s, r) => s + (r.memorable_rating || 0), 0) / raterCount;
    const avgOverall = (avgLyrics + avgMelody + avgMemorable) / 3;

    return { ...song, avgLyrics, avgMelody, avgMemorable, avgOverall, raterCount };
  });

  ratingsRankings.sort((a, b) => b.avgOverall - a.avgOverall);

  // ── Vote-based leaderboard ────────────────────────────
  const voteRankings = songs.map((song) => {
    const songVotes = allVotes.filter((v) => v.song_id === song.id);
    const totalPoints = songVotes.reduce((sum, v) => sum + v.score, 0);
    const voterCount = songVotes.length;
    const userScore = userVotes[song.id] || null;
    return { ...song, totalPoints, voterCount, userScore };
  });

  voteRankings.sort((a, b) => b.totalPoints - a.totalPoints);

  const getRankIcon = (index) => {
    if (index === 0) return <Trophy size={24} className="leaderboard-icon-gold" />;
    if (index === 1) return <Medal size={24} className="leaderboard-icon-silver" />;
    if (index === 2) return <Award size={24} className="leaderboard-icon-bronze" />;
    return <span className="leaderboard-rank-num">{index + 1}</span>;
  };

  const hasAnyVotes = voteRankings.some((r) => r.totalPoints > 0);
  const hasAnyRatings = ratingsRankings.some((r) => r.raterCount > 0);

  const formatAvg = (n) => n > 0 ? n.toFixed(1) : '-';

  return (
    <div className="leaderboard">
      <div className="leaderboard-header">
        <Trophy size={28} className="leaderboard-header-icon" />
        <h2 className="leaderboard-title">Leaderboard</h2>
      </div>

      {/* View toggle */}
      <div className="leaderboard-toggle">
        <button
          onClick={() => setView('ratings')}
          className={`leaderboard-toggle-btn ${view === 'ratings' ? 'leaderboard-toggle-active' : ''}`}
        >
          <BarChart3 size={16} />
          <span>Song Ratings</span>
        </button>
        <button
          onClick={() => setView('votes')}
          className={`leaderboard-toggle-btn ${view === 'votes' ? 'leaderboard-toggle-active' : ''}`}
        >
          <Heart size={16} />
          <span>Vote Points</span>
        </button>
      </div>

      {/* Ratings view */}
      {view === 'ratings' && (
        !hasAnyRatings ? (
          <div className="leaderboard-empty">
            <Star size={48} className="leaderboard-empty-icon" />
            <p className="leaderboard-empty-title">No ratings yet!</p>
            <p className="leaderboard-empty-sub">Open a song and rate its lyrics, melody and memorability.</p>
          </div>
        ) : (
          <div className="leaderboard-list">
            {ratingsRankings.map((song, index) => (
              <div
                key={song.id}
                className={`leaderboard-row ${index < 3 && song.raterCount > 0 ? 'leaderboard-row-top' : ''}`}
              >
                <div className="leaderboard-row-rank">
                  {song.raterCount > 0 ? getRankIcon(index) : <span className="leaderboard-rank-num">-</span>}
                </div>
                <div className="leaderboard-row-flag">{song.flag}</div>
                <div className="leaderboard-row-info">
                  <p className="leaderboard-row-title">{song.title}</p>
                  <p className="leaderboard-row-meta">{song.artist} &mdash; {song.country}</p>
                </div>
                {song.raterCount > 0 ? (
                  <div className="leaderboard-row-ratings">
                    <div className="leaderboard-rating-overall">
                      {song.avgOverall.toFixed(1)}
                    </div>
                    <div className="leaderboard-rating-cats">
                      <span title="Lyrics">✏️ {formatAvg(song.avgLyrics)}</span>
                      <span title="Melody">🎵 {formatAvg(song.avgMelody)}</span>
                      <span title="Memorable">💫 {formatAvg(song.avgMemorable)}</span>
                    </div>
                    <span className="leaderboard-row-voters">
                      {song.raterCount} rating{song.raterCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                ) : (
                  <div className="leaderboard-row-stats">
                    <span className="leaderboard-row-nodata">Not rated</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Votes view */}
      {view === 'votes' && (
        !hasAnyVotes ? (
          <div className="leaderboard-empty">
            <Star size={48} className="leaderboard-empty-icon" />
            <p className="leaderboard-empty-title">No votes yet!</p>
            <p className="leaderboard-empty-sub">Be the first to vote for your favorites.</p>
          </div>
        ) : (
          <div className="leaderboard-list">
            {voteRankings.map((song, index) => (
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
        )
      )}
    </div>
  );
};

export default Leaderboard;
