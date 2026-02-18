import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Music, BarChart3, Heart, RotateCcw, Search, X as XIcon, Award, Trophy, Flame, User, UserPlus, UserCheck, UserX, Pencil, Check, Clock } from 'lucide-react';
import { supabase } from './supabaseClient';
import { useTheme } from './ThemeContext';
import SONGS from './songs';
import SongCard from './SongCard';
import SongDetail from './SongDetail';
import Leaderboard from './Leaderboard';
import Confetti from './Confetti';

const TABS = [
  { id: 'songs', label: 'Songs', icon: Music },
  { id: 'votes', label: 'My Votes', icon: Heart },
  { id: 'leaderboard', label: 'Leaderboard', icon: BarChart3 },
  { id: 'profile', label: 'Profile', icon: User },
];

const STORAGE_KEY = 'aivision_votes';

const SongCardSkeleton = () => (
  <div className="song-card-skeleton">
    <div className="skeleton-flag skeleton-pulse" />
    <div className="skeleton-body">
      <div className="skeleton-title skeleton-pulse" />
      <div className="skeleton-artist skeleton-pulse" />
      <div className="skeleton-country skeleton-pulse" />
    </div>
    <div className="skeleton-footer skeleton-pulse" />
  </div>
);

const EurovisionVoting = ({ userProfile }) => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('songs');
  const [selectedSong, setSelectedSong] = useState(null);
  const [userVotes, setUserVotes] = useState({});
  const [allVotes, setAllVotes] = useState([]);
  const [useLocal, setUseLocal] = useState(false);
  const [countryVideos, setCountryVideos] = useState({});
  const [allSongs, setAllSongs] = useState([...SONGS].sort((a, b) => a.country.localeCompare(b.country)));
  const [allRatings, setAllRatings] = useState([]);
  const [lastVote, setLastVote] = useState(null);
  const [showUndo, setShowUndo] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGenre, setFilterGenre] = useState('all');
  const [songsLoading, setSongsLoading] = useState(true);

  // Voting deadline
  const [votingDeadline, setVotingDeadline] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);

  // Global toast messages
  const [toastMessage, setToastMessage] = useState(null);
  const showToast = useCallback((text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // Friends system
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [friendSearch, setFriendSearch] = useState('');
  const [profileConfetti, setProfileConfetti] = useState(false);

  // Name editing
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMessage, setNameMessage] = useState(null);

  const NAME_CHANGE_COOLDOWN = 7 * 24 * 60 * 60 * 1000; // 1 week in ms
  const NAME_CHANGE_KEY = `aivision_name_changed_${userProfile?.id}`;

  const getNameChangeCooldown = useCallback(() => {
    try {
      const lastChanged = localStorage.getItem(NAME_CHANGE_KEY);
      if (!lastChanged) return null;
      const elapsed = Date.now() - parseInt(lastChanged, 10);
      if (elapsed >= NAME_CHANGE_COOLDOWN) return null;
      const remaining = NAME_CHANGE_COOLDOWN - elapsed;
      const days = Math.ceil(remaining / (24 * 60 * 60 * 1000));
      return days;
    } catch { return null; }
  }, [NAME_CHANGE_KEY]);

  const handleNameSave = async () => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === userProfile?.name) {
      setEditingName(false);
      return;
    }
    const cooldownDays = getNameChangeCooldown();
    if (cooldownDays !== null) {
      setNameMessage(`You can change your name again in ${cooldownDays} day${cooldownDays !== 1 ? 's' : ''}`);
      setTimeout(() => setNameMessage(null), 3000);
      return;
    }
    setNameSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: trimmed })
        .eq('id', userProfile.id);
      if (error) throw error;
      userProfile.name = trimmed;
      localStorage.setItem(NAME_CHANGE_KEY, Date.now().toString());
      setEditingName(false);
      setNameMessage('Name updated!');
      setTimeout(() => setNameMessage(null), 2000);
    } catch {
      setNameMessage('Failed to update name');
      setTimeout(() => setNameMessage(null), 3000);
    }
    setNameSaving(false);
  };

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
          data.forEach(v => { videoMap[v.country_id] = { url: v.video_url, posX: v.position_x ?? 50, posY: v.position_y ?? 50 }; });
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
          const all = [...merged, ...customOnly]
            .filter(s => s.published !== false) // hide unpublished songs
            .sort((a, b) => a.country.localeCompare(b.country));
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

    const loadFriends = async () => {
      if (!userProfile?.id) return;
      try {
        // Load accepted friends (both directions)
        const { data } = await supabase
          .from('friends')
          .select('*, requester:profiles!friends_requester_id_fkey(id, name, email, avatar_url), addressee:profiles!friends_addressee_id_fkey(id, name, email, avatar_url)')
          .or(`requester_id.eq.${userProfile.id},addressee_id.eq.${userProfile.id}`);
        if (data) {
          const accepted = data.filter(f => f.status === 'accepted');
          const pending = data.filter(f => f.status === 'pending' && f.addressee_id === userProfile.id);
          setFriends(accepted);
          setFriendRequests(pending);
        }
      } catch { /* friends table may not exist */ }
    };

    const loadAllUsers = async () => {
      try {
        const { data } = await supabase.from('profiles').select('id, name, email, avatar_url');
        if (data) setAllUsers(data);
      } catch { /* */ }
    };

    const loadDeadline = async () => {
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'voting_deadline')
          .single();
        if (data?.value) setVotingDeadline(data.value);
      } catch { /* table may not exist */ }
    };

    Promise.all([loadVotes(), loadCountryVideos(), loadCustomSongs(), loadAllRatings()])
      .finally(() => setSongsLoading(false));
    loadDeadline();
    loadFriends();
    loadAllUsers();
  }, [userProfile?.id, loadLocalVotes]);

  // Real-time subscriptions
  useEffect(() => {
    if (useLocal || !userProfile?.id) return;

    const channels = [];

    // Live votes — update allVotes when anyone votes
    try {
      const votesChannel = supabase
        .channel('realtime-votes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, async () => {
          const { data } = await supabase.from('votes').select('*');
          if (data) {
            setAllVotes(data);
            const myVotes = {};
            data.forEach((vote) => {
              if (vote.user_id === userProfile.id) myVotes[vote.song_id] = vote.score;
            });
            setUserVotes(myVotes);
          }
        })
        .subscribe();
      channels.push(votesChannel);
    } catch { /* realtime may not be enabled */ }

    // Live friend requests
    try {
      const friendsChannel = supabase
        .channel('realtime-friends')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'friends',
          filter: `addressee_id=eq.${userProfile.id}` }, async () => {
          const { data } = await supabase.from('friends')
            .select('*, requester:profiles!friends_requester_id_fkey(id, name, email, avatar_url), addressee:profiles!friends_addressee_id_fkey(id, name, email, avatar_url)')
            .or(`requester_id.eq.${userProfile.id},addressee_id.eq.${userProfile.id}`);
          if (data) {
            setFriends(data.filter(f => f.status === 'accepted'));
            setFriendRequests(data.filter(f => f.status === 'pending' && f.addressee_id === userProfile.id));
          }
        })
        .subscribe();
      channels.push(friendsChannel);
    } catch { /* realtime may not be enabled */ }

    // Live ratings
    try {
      const ratingsChannel = supabase
        .channel('realtime-ratings')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ratings' }, async () => {
          const { data } = await supabase.from('ratings').select('*');
          if (data) setAllRatings(data);
        })
        .subscribe();
      channels.push(ratingsChannel);
    } catch { /* */ }

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [userProfile?.id, useLocal]);

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
      showToast('Vote saved locally (offline)', 'error');
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
      showToast('Undo saved locally (offline)', 'error');
      saveLocalVotes(newVotes);
    }
  };

  // Friends functions
  const sendFriendRequest = async (addresseeId) => {
    if (!userProfile?.id) return;
    try {
      await supabase.from('friends').insert({
        requester_id: userProfile.id,
        addressee_id: addresseeId,
        status: 'pending',
      });
      // Reload friends
      const { data } = await supabase.from('friends')
        .select('*, requester:profiles!friends_requester_id_fkey(id, name, email, avatar_url), addressee:profiles!friends_addressee_id_fkey(id, name, email, avatar_url)')
        .or(`requester_id.eq.${userProfile.id},addressee_id.eq.${userProfile.id}`);
      if (data) {
        setFriends(data.filter(f => f.status === 'accepted'));
        setFriendRequests(data.filter(f => f.status === 'pending' && f.addressee_id === userProfile.id));
      }
    } catch {
      showToast('Could not send friend request', 'error');
    }
  };

  const respondFriendRequest = async (requestId, accept) => {
    try {
      if (accept) {
        await supabase.from('friends').update({ status: 'accepted' }).eq('id', requestId);
        setProfileConfetti(true);
        setTimeout(() => setProfileConfetti(false), 3500);
      } else {
        await supabase.from('friends').delete().eq('id', requestId);
      }
      // Reload
      const { data } = await supabase.from('friends')
        .select('*, requester:profiles!friends_requester_id_fkey(id, name, email, avatar_url), addressee:profiles!friends_addressee_id_fkey(id, name, email, avatar_url)')
        .or(`requester_id.eq.${userProfile.id},addressee_id.eq.${userProfile.id}`);
      if (data) {
        setFriends(data.filter(f => f.status === 'accepted'));
        setFriendRequests(data.filter(f => f.status === 'pending' && f.addressee_id === userProfile.id));
      }
    } catch {
      showToast('Failed to respond to request', 'error');
    }
  };

  const removeFriend = async (friendshipId) => {
    try {
      await supabase.from('friends').delete().eq('id', friendshipId);
      setFriends(prev => prev.filter(f => f.id !== friendshipId));
    } catch {
      showToast('Failed to remove friend', 'error');
    }
  };

  const getFriendProfile = (friendship) => {
    return friendship.requester_id === userProfile?.id ? friendship.addressee : friendship.requester;
  };

  const isFriend = (userId) => {
    return friends.some(f => f.requester_id === userId || f.addressee_id === userId);
  };

  const hasPendingRequest = (userId) => {
    return friendRequests.some(f => f.requester_id === userId) ||
      friends.some(f => f.status === 'pending' && (f.requester_id === userId || f.addressee_id === userId));
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

  // Voting deadline countdown
  useEffect(() => {
    if (!votingDeadline) { setTimeLeft(null); return; }
    const calc = () => {
      const diff = new Date(votingDeadline).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('closed'); return; }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);
      if (d > 0) setTimeLeft(`${d}d ${h}h ${m}m`);
      else if (h > 0) setTimeLeft(`${h}h ${m}m ${s}s`);
      else setTimeLeft(`${m}m ${s}s`);
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [votingDeadline]);

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

        {/* Voting Deadline */}
        {timeLeft && (
          <div className={`ev-deadline ${timeLeft === 'closed' ? 'ev-deadline-closed' : ''}`}>
            <Clock size={14} />
            <span>{timeLeft === 'closed' ? 'Voting has ended' : `Voting closes in ${timeLeft}`}</span>
          </div>
        )}

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
              {tab.id === 'profile' && friendRequests.length > 0 && (
                <span className="ev-tab-dot" />
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

          {songsLoading ? (
            <div className="ev-songs-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <SongCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredSongs.length === 0 ? (
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
                  videoUrl={countryVideos[song.id]?.url}
                  videoPosition={countryVideos[song.id]}
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

      {/* Profile & Friends */}
      {activeTab === 'profile' && (
        <div className="ev-profile">
          <Confetti active={profileConfetti} />

          {/* My Profile Card */}
          <div className="profile-card">
            <div className="profile-card-avatar">
              {userProfile?.avatar_url ? (
                <img src={userProfile.avatar_url} alt="" />
              ) : (
                <User size={32} />
              )}
            </div>
            <div className="profile-card-info">
              {editingName ? (
                <div className="profile-name-edit">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                    className="profile-name-input"
                    autoFocus
                    maxLength={30}
                    placeholder="Your name"
                  />
                  <button onClick={handleNameSave} disabled={nameSaving} className="profile-name-save-btn" title="Save">
                    <Check size={14} />
                  </button>
                  <button onClick={() => setEditingName(false)} className="profile-name-cancel-btn" title="Cancel">
                    <XIcon size={14} />
                  </button>
                </div>
              ) : (
                <h3 className="profile-card-name">
                  {userProfile?.name}
                  <button
                    onClick={() => {
                      const cooldownDays = getNameChangeCooldown();
                      if (cooldownDays !== null) {
                        setNameMessage(`You can change your name again in ${cooldownDays} day${cooldownDays !== 1 ? 's' : ''}`);
                        setTimeout(() => setNameMessage(null), 3000);
                        return;
                      }
                      setNewName(userProfile?.name || '');
                      setEditingName(true);
                    }}
                    className="profile-name-edit-btn"
                    title="Edit name"
                  >
                    <Pencil size={12} />
                  </button>
                </h3>
              )}
              {nameMessage && (
                <p className="profile-name-message">{nameMessage}</p>
              )}
              <p className="profile-card-email">{userProfile?.email}</p>
            </div>
            <div className="profile-card-stats">
              <div className="profile-stat">
                <span className="profile-stat-value">{votedCount}</span>
                <span className="profile-stat-label">Votes</span>
              </div>
              <div className="profile-stat">
                <span className="profile-stat-value">{totalPoints}</span>
                <span className="profile-stat-label">Points</span>
              </div>
              <div className="profile-stat">
                <span className="profile-stat-value">{friends.length}</span>
                <span className="profile-stat-label">Friends</span>
              </div>
            </div>
          </div>

          {/* Friend Requests */}
          {friendRequests.length > 0 && (
            <div className="profile-section">
              <h4 className="profile-section-title">Friend Requests ({friendRequests.length})</h4>
              <div className="profile-friends-list">
                {friendRequests.map(req => (
                  <div key={req.id} className="profile-friend-row">
                    <div className="profile-friend-avatar">
                      {req.requester?.avatar_url ? (
                        <img src={req.requester.avatar_url} alt="" />
                      ) : (
                        <span>{(req.requester?.name || '?')[0].toUpperCase()}</span>
                      )}
                    </div>
                    <div className="profile-friend-info">
                      <span className="profile-friend-name">{req.requester?.name}</span>
                    </div>
                    <button onClick={() => respondFriendRequest(req.id, true)} className="profile-friend-accept">
                      <UserCheck size={14} /> Accept
                    </button>
                    <button onClick={() => respondFriendRequest(req.id, false)} className="profile-friend-decline">
                      <UserX size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Friends List */}
          <div className="profile-section">
            <h4 className="profile-section-title">Friends ({friends.length})</h4>
            {friends.length === 0 ? (
              <p className="profile-empty-text">No friends yet. Search for users to add!</p>
            ) : (
              <div className="profile-friends-list">
                {friends.map(f => {
                  const friend = getFriendProfile(f);
                  const friendVotes = allVotes.filter(v => v.user_id === friend?.id);
                  const friendPts = friendVotes.reduce((s, v) => s + v.score, 0);
                  return (
                    <div key={f.id} className="profile-friend-row">
                      <div className="profile-friend-avatar">
                        {friend?.avatar_url ? (
                          <img src={friend.avatar_url} alt="" />
                        ) : (
                          <span>{(friend?.name || '?')[0].toUpperCase()}</span>
                        )}
                      </div>
                      <div className="profile-friend-info">
                        <span className="profile-friend-name">{friend?.name}</span>
                        <span className="profile-friend-meta">{friendVotes.length} votes &middot; {friendPts} pts</span>
                      </div>
                      <button onClick={() => removeFriend(f.id)} className="profile-friend-remove" title="Remove friend">
                        <UserX size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Find Friends */}
          <div className="profile-section">
            <h4 className="profile-section-title">Find Friends</h4>
            <div className="ev-search-wrapper" style={{ marginBottom: 12 }}>
              <Search size={18} className="ev-search-icon" />
              <input
                type="text"
                placeholder="Search by name..."
                value={friendSearch}
                onChange={(e) => setFriendSearch(e.target.value)}
                className="ev-search-input"
              />
            </div>
            {friendSearch.trim() && (
              <div className="profile-friends-list">
                {allUsers
                  .filter(u => u.id !== userProfile?.id && u.name?.toLowerCase().includes(friendSearch.toLowerCase()))
                  .slice(0, 10)
                  .map(u => {
                    const alreadyFriend = isFriend(u.id);
                    const pending = hasPendingRequest(u.id);
                    return (
                      <div key={u.id} className="profile-friend-row">
                        <div className="profile-friend-avatar">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt="" />
                          ) : (
                            <span>{(u.name || '?')[0].toUpperCase()}</span>
                          )}
                        </div>
                        <div className="profile-friend-info">
                          <span className="profile-friend-name">{u.name}</span>
                        </div>
                        {alreadyFriend ? (
                          <span className="profile-friend-status">Friends</span>
                        ) : pending ? (
                          <span className="profile-friend-status">Pending</span>
                        ) : (
                          <button onClick={() => sendFriendRequest(u.id)} className="profile-friend-add">
                            <UserPlus size={14} /> Add
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Song Detail Modal */}
      {selectedSong && (
        <SongDetail
          song={selectedSong}
          userScore={userVotes[selectedSong.id]}
          onVote={handleVote}
          onClose={() => setSelectedSong(null)}
          userProfile={userProfile}
          videoUrl={countryVideos[selectedSong.id]?.url}
          videoPosition={countryVideos[selectedSong.id]}
        />
      )}

      {/* Global Toast */}
      {toastMessage && (
        <div className={`global-toast ${toastMessage.type === 'error' ? 'global-toast-error' : 'global-toast-success'}`}>
          <span>{toastMessage.text}</span>
        </div>
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

      {/* Mobile Bottom Navigation */}
      <div className="mobile-bottom-nav">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`mobile-nav-btn ${activeTab === tab.id ? 'mobile-nav-active' : ''}`}
            >
              <Icon size={20} />
              <span>{tab.label}</span>
              {tab.id === 'votes' && votedCount > 0 && (
                <span className="mobile-nav-badge">{votedCount}</span>
              )}
              {tab.id === 'profile' && friendRequests.length > 0 && (
                <span className="mobile-nav-badge">{friendRequests.length}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default EurovisionVoting;
