import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Music, BarChart3, Heart, RotateCcw, Search, X as XIcon, Award, Trophy, Flame } from 'lucide-react';
import { supabase } from './supabaseClient';
import { useTheme } from './ThemeContext';
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
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('songs');
  const [selectedSong, setSelectedSong] = useState(null);
  const [userVotes, setUserVotes] = useState({});
  const [allVotes, setAllVotes] = useState([]);
  const [useLocal, setUseLocal] = useState(false);
  const [countryVideos, setCountryVideos] = useState({});
  const [allSongs, setAllSongs] = useState(SONGS);
  const [allRatings, setAllRatings] = useState([]);
  const [lastVote, setLastVote] = useState(null);
  const [showUndo, setShowUndo] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGenre, setFilterGenre] = useState('all');

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

  // Load votes, country videos, and custom songs
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

    const loadCountryVideos = async () => {
      try {
        const { data } = await supabase.from('country_videos').select('*');
        if (data) {
          const videoMap = {};
          data.forEach(v => { videoMap[v.country_id] = v.video_url; });
          setCountryVideos(videoMap);
        }
      } catch {
        // Country videos table may not exist yet
      }
    };

    const loadCustomSongs = async () => {
      try {
        const { data } = await supabase.from('custom_songs').select('*');
        if (data && data.length > 0) {
          // Merge custom songs with built-in songs, respect sort_order
          const customMap = new Map(data.map(s => [s.id, s]));
          const merged = SONGS.map((s, i) => customMap.has(s.id)
            ? { ...s, ...customMap.get(s.id), sort_order: customMap.get(s.id).sort_order ?? i }
            : { ...s, sort_order: s.sort_order ?? i });
          const customOnly = data.filter(s => !SONGS.some(b => b.id === s.id))
            .map((s, i) => ({ ...s, sort_order: s.sort_order ?? 100 + i }));
          const all = [...merged, ...customOnly].sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
          setAllSongs(all);
        }
      } catch {
        // Custom songs table may not exist yet
      }
    };

    const loadAllRatings = async () => {
      try {
        const { data } = await supabase.from('ratings').select('*');
        if (data) setAllRatings(data);
      } catch {
        // ratings table may not exist yet
      }
    };

    loadVotes();
    loadCountryVideos();
    loadCustomSongs();
    loadAllRatings();
  }, [userProfile?.id, loadLocalVotes]);

  const handleVote = async (songId, score) => {
    // Save previous state for undo
    const previousScore = userVotes[songId] || null;
    setLastVote({ songId, previousScore, newScore: score });

    const newVotes = { ...userVotes };
    if (score === null) {
      delete newVotes[songId];
    } else {
      newVotes[songId] = score;
    }
    setUserVotes(newVotes);

    // Show undo toast
    setShowUndo(true);
    setTimeout(() => setShowUndo(false), 5000);

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

  const handleUndo = async () => {
    if (!lastVote) return;

    const { songId, previousScore } = lastVote;
    const newVotes = { ...userVotes };

    if (previousScore === null) {
      delete newVotes[songId];
    } else {
      newVotes[songId] = previousScore;
    }
    setUserVotes(newVotes);
    setShowUndo(false);
    setLastVote(null);

    if (useLocal) {
      saveLocalVotes(newVotes);
      return;
    }

    try {
      if (previousScore === null) {
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
            score: previousScore,
          }, { onConflict: 'user_id,song_id' });
      }
      const { data } = await supabase.from('votes').select('*');
      if (data) setAllVotes(data);
    } catch {
      saveLocalVotes(newVotes);
    }
  };

  // Filter and search songs
  const filteredSongs = useMemo(() => {
    let result = allSongs;

    // Genre filter
    if (filterGenre !== 'all') {
      result = result.filter(s => s.genre.toLowerCase() === filterGenre.toLowerCase());
    }

    // Search query (by country, title, artist, genre)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.country.toLowerCase().includes(query) ||
        s.title.toLowerCase().includes(query) ||
        s.artist.toLowerCase().includes(query) ||
        s.genre.toLowerCase().includes(query)
      );
    }

    return result;
  }, [allSongs, searchQuery, filterGenre]);

  // Get unique genres for filter dropdown
  const genres = useMemo(() => {
    const uniqueGenres = [...new Set(allSongs.map(s => s.genre))];
    return uniqueGenres.sort();
  }, [allSongs]);

  const votedSongs = allSongs.filter((s) => userVotes[s.id]);
  const totalPoints = Object.values(userVotes).reduce((sum, v) => sum + v, 0);
  const votedCount = Object.keys(userVotes).length;
  const totalSongs = allSongs.length;
  const progressPercent = totalSongs > 0 ? (votedCount / totalSongs) * 100 : 0;

  // Calculate badges
  const badges = useMemo(() => {
    const result = [];

    if (votedCount === totalSongs && totalSongs > 0) {
      result.push({ icon: Trophy, label: 'Complete!', color: '#fbbf24', desc: 'Voted on all songs' });
    } else if (votedCount >= 10) {
      result.push({ icon: Flame, label: 'Power Voter', color: '#f97316', desc: '10+ songs voted' });
    } else if (votedCount >= 5) {
      result.push({ icon: Award, label: 'Active', color: '#8b5cf6', desc: '5+ songs voted' });
    } else if (votedCount >= 1) {
      result.push({ icon: Heart, label: 'First Vote', color: '#ec4899', desc: 'Cast your first vote' });
    }

    return result;
  }, [votedCount, totalSongs]);

  // Keyboard shortcuts for song navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle if on songs tab
      if (activeTab !== 'songs') return;

      // If modal is open, navigate between songs
      if (selectedSong) {
        const currentIndex = allSongs.findIndex(s => s.id === selectedSong.id);

        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          const nextIndex = (currentIndex + 1) % allSongs.length;
          setSelectedSong(allSongs[nextIndex]);
          e.preventDefault();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          const prevIndex = currentIndex === 0 ? allSongs.length - 1 : currentIndex - 1;
          setSelectedSong(allSongs[prevIndex]);
          e.preventDefault();
        }
      } else {
        // If no modal, open first song with Enter or arrow keys
        if (e.key === 'Enter' || e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          if (allSongs.length > 0) {
            setSelectedSong(allSongs[0]);
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSong, activeTab, allSongs]);

  return (
    <div className="ev-container">
      <div className="ev-hero">
        {theme.logoUrl && (
          <img src={theme.logoUrl} alt="" style={{ maxHeight: 56, maxWidth: 200, objectFit: 'contain', marginBottom: 8 }} />
        )}
        <h1 className="ev-title">{theme.appName}</h1>
        <p className="ev-subtitle">{theme.appSubtitle}</p>
        <div className="ev-progress-indicator">
          <div className="ev-progress-bar">
            <div
              className="ev-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="ev-progress-text">
            {votedCount} / {totalSongs} songs voted
            {votedCount === totalSongs && totalSongs > 0 && (
              <span className="ev-progress-complete"> ✓ Complete!</span>
            )}
          </p>
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="ev-badges">
            {badges.map((badge, i) => {
              const Icon = badge.icon;
              return (
                <div key={i} className="ev-badge" title={badge.desc}>
                  <Icon size={16} style={{ color: badge.color }} />
                  <span style={{ color: badge.color }}>{badge.label}</span>
                </div>
              );
            })}
          </div>
        )}
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
        <>
          {/* Search and Filter */}
          <div className="ev-search-section">
            <div className="ev-search-wrapper">
              <Search size={18} className="ev-search-icon" />
              <input
                type="text"
                placeholder="Search by country, title, artist, or genre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ev-search-input"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="ev-search-clear"
                  title="Clear search"
                >
                  <XIcon size={16} />
                </button>
              )}
            </div>
            <select
              value={filterGenre}
              onChange={(e) => setFilterGenre(e.target.value)}
              className="ev-genre-filter"
            >
              <option value="all">All Genres</option>
              {genres.map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
          </div>

          {filteredSongs.length === 0 ? (
            <div className="ev-empty">
              <Search size={48} className="ev-empty-icon" />
              <p className="ev-empty-title">No songs found</p>
              <p className="ev-empty-sub">Try adjusting your search or filter</p>
            </div>
          ) : (
            <div className="ev-songs-grid">
              {filteredSongs.map((song) => (
                <SongCard
                  key={song.id}
                  song={song}
                  userScore={userVotes[song.id]}
                  onClick={() => setSelectedSong(song)}
                  videoUrl={countryVideos[song.id]}
                />
              ))}
            </div>
          )}
        </>
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
          songs={allSongs}
          userVotes={userVotes}
          allVotes={allVotes}
          allRatings={allRatings}
        />
      )}

      {/* Song Detail Modal */}
      {selectedSong && (
        <SongDetail
          song={selectedSong}
          userScore={userVotes[selectedSong.id]}
          onVote={handleVote}
          onClose={() => setSelectedSong(null)}
          userProfile={userProfile}
          videoUrl={countryVideos[selectedSong.id]}
        />
      )}

      {/* Undo Toast */}
      {showUndo && lastVote && (
        <div className="undo-toast">
          <span className="undo-toast-text">
            Vote {lastVote.newScore === null ? 'removed' : 'saved'}!
          </span>
          <button onClick={handleUndo} className="undo-toast-btn">
            <RotateCcw size={16} />
            Undo
          </button>
        </div>
      )}
    </div>
  );
};

export default EurovisionVoting;
