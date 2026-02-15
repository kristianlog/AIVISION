import React, { useState, useEffect, useCallback } from 'react';
import { Music, BarChart3, Heart } from 'lucide-react';
import { supabase } from './supabaseClient';
import SONGS from './songs';
import SongCard from './SongCard';
import SongDetail from './SongDetail';
import Leaderboard from './Leaderboard';

const TABS = [
  { id: 'songs', label: 'Songs', icon: Music },
  { id: 'votes', label: 'My Votes', icon: Heart },
  { id: 'leaderboard', label: 'Leaderboard', icon: BarChart3 },
];

const STORAGE_KEY = 'aivision_votes';

const EurovisionVoting = ({ userProfile }) => {
  const [activeTab, setActiveTab] = useState('songs');
  const [selectedSong, setSelectedSong] = useState(null);
  const [userVotes, setUserVotes] = useState({});
  const [allVotes, setAllVotes] = useState([]);
  const [useLocal, setUseLocal] = useState(false);

  const toFakeVotes = useCallback((votesMap) => {
    return Object.entries(votesMap).map(([song_id, score]) => ({
      song_id,
      score,
      user_id: userProfile?.id || 'local',
    }));
  }, [userProfile?.id]);

  const loadLocalVotes = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setUserVotes(parsed);
        setAllVotes(toFakeVotes(parsed));
      }
    } catch {
      // Ignore parse errors
    }
  }, [toFakeVotes]);

  const saveLocalVotes = useCallback((votes) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(votes));
      setAllVotes(toFakeVotes(votes));
    } catch {
      // Ignore storage errors
    }
  }, [toFakeVotes]);

  useEffect(() => {
    const loadVotes = async () => {
      try {
        const { data, error } = await supabase
          .from('votes')
          .select('*');

        if (error) {
          console.warn('Supabase votes table not available, using local storage:', error.message);
          setUseLocal(true);
          loadLocalVotes();
          return;
        }

        setAllVotes(data || []);
        const myVotes = {};
        (data || []).forEach((vote) => {
          if (vote.user_id === userProfile?.id) {
            myVotes[vote.song_id] = vote.score;
          }
        });
        setUserVotes(myVotes);
      } catch {
        console.warn('Failed to connect to Supabase, using local storage');
        setUseLocal(true);
        loadLocalVotes();
      }
    };

    loadVotes();
  }, [userProfile?.id, loadLocalVotes]);

  const handleVote = async (songId, score) => {
    const newVotes = { ...userVotes };
    if (score === null) {
      delete newVotes[songId];
    } else {
      newVotes[songId] = score;
    }
    setUserVotes(newVotes);

    if (useLocal) {
      saveLocalVotes(newVotes);
      return;
    }

    try {
      if (score === null) {
        await supabase
          .from('votes')
          .delete()
          .eq('user_id', userProfile.id)
          .eq('song_id', songId);
      } else {
        await supabase
          .from('votes')
          .upsert({
            user_id: userProfile.id,
            song_id: songId,
            score,
          }, { onConflict: 'user_id,song_id' });
      }
      const { data } = await supabase.from('votes').select('*');
      if (data) setAllVotes(data);
    } catch {
      saveLocalVotes(newVotes);
    }
  };

  const votedSongs = SONGS.filter((s) => userVotes[s.id]);
  const totalPoints = Object.values(userVotes).reduce((sum, v) => sum + v, 0);

  return (
    <div className="ev-container">
      <div className="ev-hero">
        <h1 className="ev-title">AIVISION</h1>
        <p className="ev-subtitle">Vote for your favorite songs</p>
      </div>

      {/* Tab Navigation */}
      <div className="ev-tabs">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`ev-tab ${activeTab === tab.id ? 'ev-tab-active' : ''}`}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
              {tab.id === 'votes' && Object.keys(userVotes).length > 0 && (
                <span className="ev-tab-badge">{Object.keys(userVotes).length}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Songs Grid */}
      {activeTab === 'songs' && (
        <div className="ev-songs-grid">
          {SONGS.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              userScore={userVotes[song.id]}
              onClick={() => setSelectedSong(song)}
            />
          ))}
        </div>
      )}

      {/* My Votes */}
      {activeTab === 'votes' && (
        <div className="ev-my-votes">
          {votedSongs.length === 0 ? (
            <div className="ev-empty">
              <Heart size={48} className="ev-empty-icon" />
              <p className="ev-empty-title">No votes yet</p>
              <p className="ev-empty-sub">Go to the Songs tab and start voting!</p>
            </div>
          ) : (
            <>
              <div className="ev-votes-summary">
                <span>{votedSongs.length} song{votedSongs.length !== 1 ? 's' : ''} voted</span>
                <span className="ev-votes-total">{totalPoints} total points</span>
              </div>
              <div className="ev-votes-list">
                {votedSongs
                  .sort((a, b) => (userVotes[b.id] || 0) - (userVotes[a.id] || 0))
                  .map((song) => (
                    <button
                      key={song.id}
                      onClick={() => setSelectedSong(song)}
                      className="ev-vote-row"
                    >
                      <span className="ev-vote-row-flag">{song.flag}</span>
                      <div className="ev-vote-row-info">
                        <p className="ev-vote-row-title">{song.title}</p>
                        <p className="ev-vote-row-artist">{song.artist}</p>
                      </div>
                      <div className="ev-vote-row-score">
                        {userVotes[song.id]} pts
                      </div>
                    </button>
                  ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Leaderboard */}
      {activeTab === 'leaderboard' && (
        <Leaderboard
          songs={SONGS}
          userVotes={userVotes}
          allVotes={allVotes}
        />
      )}

      {/* Song Detail Modal */}
      {selectedSong && (
        <SongDetail
          song={selectedSong}
          userScore={userVotes[selectedSong.id]}
          onVote={handleVote}
          onClose={() => setSelectedSong(null)}
        />
      )}
    </div>
  );
};

export default EurovisionVoting;
