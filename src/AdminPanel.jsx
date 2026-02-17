import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from './supabaseClient';
import SONGS from './songs';
import LyricsTimingEditor from './LyricsTimingEditor';
import {
  ArrowLeft, Upload, Music, Video, Trash2, Plus, Save, X, Film,
  CheckCircle, AlertCircle, Loader2, Pencil, Clock, ChevronUp, ChevronDown, Users
} from 'lucide-react';

// Country name → ISO 3166-1 alpha-2 code (for auto-flag)
const COUNTRY_TO_ISO = {
  albania: 'AL', andorra: 'AD', armenia: 'AM', australia: 'AU', austria: 'AT',
  azerbaijan: 'AZ', belarus: 'BY', belgium: 'BE', 'bosnia and herzegovina': 'BA',
  bulgaria: 'BG', croatia: 'HR', cyprus: 'CY', 'czech republic': 'CZ', czechia: 'CZ',
  denmark: 'DK', estonia: 'EE', finland: 'FI', france: 'FR', georgia: 'GE',
  germany: 'DE', greece: 'GR', hungary: 'HU', iceland: 'IS', ireland: 'IE',
  israel: 'IL', italy: 'IT', kazakhstan: 'KZ', latvia: 'LV', liechtenstein: 'LI',
  lithuania: 'LT', luxembourg: 'LU', malta: 'MT', moldova: 'MD', monaco: 'MC',
  montenegro: 'ME', morocco: 'MA', netherlands: 'NL', 'north macedonia': 'MK',
  norway: 'NO', poland: 'PL', portugal: 'PT', romania: 'RO', russia: 'RU',
  'san marino': 'SM', serbia: 'RS', slovakia: 'SK', slovenia: 'SI', spain: 'ES',
  sweden: 'SE', switzerland: 'CH', turkey: 'TR', ukraine: 'UA', 'united kingdom': 'GB',
  uk: 'GB', usa: 'US', 'united states': 'US',
};

// Convert ISO code to flag emoji (each letter → regional indicator symbol)
const isoToFlag = (iso) =>
  [...iso.toUpperCase()].map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('');

const getAutoFlag = (countryName) => {
  const iso = COUNTRY_TO_ISO[countryName.trim().toLowerCase()];
  return iso ? isoToFlag(iso) : '';
};

const AdminPanel = ({ onBack, userProfile }) => {
  const [activeSection, setActiveSection] = useState('songs');
  const [songs, setSongs] = useState([]);
  const [countryVideos, setCountryVideos] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // Merge built-in songs with custom songs (custom overrides built-in by ID), sorted by sort_order
  const allSongs = useMemo(() => {
    const customMap = new Map(songs.map(s => [s.id, s]));
    const merged = SONGS.map((s, i) => customMap.has(s.id)
      ? { ...s, ...customMap.get(s.id), _isBuiltIn: true, sort_order: customMap.get(s.id).sort_order ?? i }
      : { ...s, _isBuiltIn: true, sort_order: s.sort_order ?? i });
    const customOnly = songs.filter(s => !SONGS.some(b => b.id === s.id))
      .map((s, i) => ({ ...s, _isBuiltIn: false, sort_order: s.sort_order ?? 100 + i }));
    return [...merged, ...customOnly].sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
  }, [songs]);

  // Song form state
  const [showSongForm, setShowSongForm] = useState(false);
  const [editingSong, setEditingSong] = useState(null); // null = new song, object = editing
  const [songForm, setSongForm] = useState({
    id: '', country: '', flag: '', artist: '', title: '', genre: '', lyrics: ''
  });
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [uploadingSong, setUploadingSong] = useState(false);
  const uploadAbortRef = useRef(null);

  // Lyrics timing editor state
  const [timingEditorSong, setTimingEditorSong] = useState(null);

  // User management state
  const [allVotes, setAllVotes] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  // Video upload state
  const [videoUploading, setVideoUploading] = useState({});
  const videoInputRefs = useRef({});

  useEffect(() => {
    loadData();
  }, []);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Load custom songs - gracefully handle missing table
      try {
        const { data: songsData, error } = await supabase
          .from('custom_songs')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error) setSongs(songsData || []);
      } catch { /* table may not exist yet */ }

      // Load country videos - gracefully handle missing table
      try {
        const { data: videosData, error } = await supabase
          .from('country_videos')
          .select('*');
        if (!error) {
          const videoMap = {};
          (videosData || []).forEach(v => { videoMap[v.country_id] = v; });
          setCountryVideos(videoMap);
        }
      } catch { /* table may not exist yet */ }

      // Load all votes for user management
      try {
        const { data: votesData, error } = await supabase.from('votes').select('*');
        if (!error) setAllVotes(votesData || []);
      } catch { /* table may not exist yet */ }

      // Load user profiles
      try {
        const { data: usersData, error } = await supabase.from('profiles').select('*');
        if (!error) setAllUsers(usersData || []);
      } catch { /* profiles table may not exist yet */ }
    } catch (err) {
      console.error('Error loading admin data:', err);
    }
    setLoading(false);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const MAX_AUDIO_SIZE = 20 * 1024 * 1024; // 20MB
  const MAX_COVER_SIZE = 10 * 1024 * 1024; // 10MB

  const handleCoverFileSelect = (file) => {
    if (!file) return;
    if (file.size > MAX_COVER_SIZE) {
      showMessage(`Cover file too large (${formatFileSize(file.size)}). Max 10MB.`, 'error');
      return;
    }
    setCoverFile(file);
  };

  const handleAudioFileSelect = (file) => {
    if (!file) return;
    if (file.size > MAX_AUDIO_SIZE) {
      showMessage(`File too large (${formatFileSize(file.size)}). Max 20MB — try a compressed MP3.`, 'error');
      return;
    }
    setAudioFile(file);
  };

  const handleCancelUpload = () => {
    if (uploadAbortRef.current) {
      uploadAbortRef.current.abort();
      uploadAbortRef.current = null;
    }
    setUploadingSong(false);
    showMessage('Upload cancelled', 'error');
  };

  // ── Song Management ──────────────────────────────────────
  const handleSongSubmit = async (e) => {
    e.preventDefault();
    setUploadingSong(true);

    try {
      let audioUrl = null;
      let coverUrl = null;

      // Upload cover art if provided
      if (coverFile) {
        const ext = coverFile.name.split('.').pop();
        const songId = editingSong ? editingSong.id : songForm.id.toLowerCase().replace(/\s+/g, '-');
        const fileName = `covers/${songId}_${Date.now()}.${ext}`;

        const { error: coverErr } = await supabase.storage
          .from('media')
          .upload(fileName, coverFile);

        if (coverErr) throw new Error(`Cover upload failed: ${coverErr.message}`);

        const { data: coverUrlData } = supabase.storage
          .from('media')
          .getPublicUrl(fileName);
        coverUrl = coverUrlData.publicUrl;
      }

      // Upload audio file if provided
      if (audioFile) {
        const abortController = new AbortController();
        uploadAbortRef.current = abortController;

        // Also add a 30s timeout
        const timeoutId = setTimeout(() => abortController.abort(), 30000);

        const ext = audioFile.name.split('.').pop();
        const songId = editingSong ? editingSong.id : songForm.id.toLowerCase().replace(/\s+/g, '-');
        const fileName = `songs/${songId}_${Date.now()}.${ext}`;

        let uploadResult;
        try {
          uploadResult = await supabase.storage
            .from('media')
            .upload(fileName, audioFile, { signal: abortController.signal });
        } catch (uploadErr) {
          clearTimeout(timeoutId);
          uploadAbortRef.current = null;
          if (uploadErr.name === 'AbortError') {
            throw new Error('Upload timed out or was cancelled. Check your Supabase storage bucket "media" exists.');
          }
          throw uploadErr;
        }

        clearTimeout(timeoutId);
        uploadAbortRef.current = null;

        if (uploadResult.error) {
          throw new Error(`Upload failed: ${uploadResult.error.message}. Make sure the "media" storage bucket exists in Supabase.`);
        }

        const { data: urlData } = supabase.storage
          .from('media')
          .getPublicUrl(fileName);
        audioUrl = urlData.publicUrl;
      }

      const songId = editingSong ? editingSong.id : songForm.id.toLowerCase().replace(/\s+/g, '-');

      // Base columns (always present in the table)
      const baseSongData = {
        id: songId,
        country: songForm.country,
        flag: songForm.flag,
        artist: songForm.artist,
        title: songForm.title,
        genre: songForm.genre,
        lyrics: songForm.lyrics,
        audio_url: audioUrl || (editingSong?.audio_url ?? null),
        lyrics_timing: editingSong?.lyrics_timing || [],
      };

      // Extended columns (may not exist if migration hasn't been re-run)
      const fullSongData = {
        ...baseSongData,
        cover_url: coverUrl || (editingSong?.cover_url ?? null),
        sort_order: editingSong?.sort_order ?? allSongs.length,
      };

      // Try with all columns first, fall back to base columns if schema is outdated
      const trySave = async (data) => {
        const savePromise = supabase
          .from('custom_songs')
          .upsert(data, { onConflict: 'id' });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Save timed out. Make sure the "custom_songs" table exists in Supabase (run SUPABASE_MIGRATION.sql).')), 10000)
        );

        return Promise.race([savePromise, timeoutPromise]);
      };

      let { error } = await trySave(fullSongData);

      // If save failed due to missing columns, retry with base columns only
      if (error && error.message && (error.message.includes('cover_url') || error.message.includes('sort_order'))) {
        const retry = await trySave(baseSongData);
        error = retry.error;
      }

      if (error) throw new Error(`Save failed: ${error.message}`);

      showMessage('Song saved successfully!');
      setShowSongForm(false);
      setEditingSong(null);
      setSongForm({ id: '', country: '', flag: '', artist: '', title: '', genre: '', lyrics: '' });
      setAudioFile(null);
      setCoverFile(null);
      loadData();
    } catch (err) {
      showMessage(err.message || 'Something went wrong', 'error');
    } finally {
      setUploadingSong(false);
    }
  };

  const handleDeleteSong = async (songId) => {
    if (!confirm('Delete this song?')) return;
    try {
      await supabase.from('custom_songs').delete().eq('id', songId);
      showMessage('Song deleted');
      loadData();
    } catch (err) {
      showMessage(err.message, 'error');
    }
  };

  const handleReorderSong = async (songIndex, direction) => {
    const swapIndex = songIndex + direction;
    if (swapIndex < 0 || swapIndex >= allSongs.length) return;

    const songA = allSongs[songIndex];
    const songB = allSongs[swapIndex];

    // Swap sort_order values
    const orderA = songA.sort_order ?? songIndex;
    const orderB = songB.sort_order ?? swapIndex;

    try {
      // Save both songs with swapped order to custom_songs
      const makeSongData = (s, newOrder) => ({
        id: s.id, country: s.country, flag: s.flag, artist: s.artist,
        title: s.title, genre: s.genre, lyrics: s.lyrics || '',
        audio_url: s.audio_url || null, lyrics_timing: s.lyrics_timing || [],
        cover_url: s.cover_url || null, sort_order: newOrder,
      });

      const saveOne = (data) => supabase.from('custom_songs').upsert(data, { onConflict: 'id' });

      let results = await Promise.all([
        saveOne(makeSongData(songA, orderB)),
        saveOne(makeSongData(songB, orderA)),
      ]);

      // If failed due to missing columns, retry without cover_url/sort_order
      if (results.some(r => r.error?.message?.includes('cover_url') || r.error?.message?.includes('sort_order'))) {
        const makeBase = (s) => ({
          id: s.id, country: s.country, flag: s.flag, artist: s.artist,
          title: s.title, genre: s.genre, lyrics: s.lyrics || '',
          audio_url: s.audio_url || null, lyrics_timing: s.lyrics_timing || [],
        });
        results = await Promise.all([saveOne(makeBase(songA)), saveOne(makeBase(songB))]);
        if (!results.some(r => r.error)) {
          showMessage('Reorder saved (run updated migration for full support)', 'success');
        }
      }

      const firstError = results.find(r => r.error);
      if (firstError?.error) throw new Error(firstError.error.message);

      loadData();
    } catch (err) {
      showMessage(err.message, 'error');
    }
  };

  const handleEditSong = (song) => {
    setEditingSong(song);
    setSongForm({
      id: song.id,
      country: song.country,
      flag: song.flag,
      artist: song.artist,
      title: song.title,
      genre: song.genre,
      lyrics: song.lyrics || '',
    });
    setAudioFile(null);
    setCoverFile(null);
    setShowSongForm(true);
  };

  const handleOpenNewSong = () => {
    setEditingSong(null);
    setSongForm({ id: '', country: '', flag: '', artist: '', title: '', genre: '', lyrics: '' });
    setAudioFile(null);
    setCoverFile(null);
    setShowSongForm(true);
  };

  const handleSaveTiming = async (songId, timingArray) => {
    try {
      // First ensure the song exists in custom_songs (might be a built-in song)
      const song = allSongs.find(s => s.id === songId);
      if (song) {
        const baseSongData = {
          id: song.id,
          country: song.country,
          flag: song.flag,
          artist: song.artist,
          title: song.title,
          genre: song.genre,
          lyrics: song.lyrics || '',
          audio_url: song.audio_url || null,
          lyrics_timing: timingArray,
        };
        const fullSongData = {
          ...baseSongData,
          cover_url: song.cover_url || null,
          sort_order: song.sort_order ?? 0,
        };

        let { error } = await supabase
          .from('custom_songs')
          .upsert(fullSongData, { onConflict: 'id' });

        // Retry without optional columns if schema is outdated
        if (error && (error.message?.includes('cover_url') || error.message?.includes('sort_order'))) {
          const retry = await supabase
            .from('custom_songs')
            .upsert(baseSongData, { onConflict: 'id' });
          error = retry.error;
        }
        if (error) throw error;
      }
      showMessage('Lyrics timing saved!');
      setTimingEditorSong(null);
      loadData();
    } catch (err) {
      showMessage(err.message || 'Failed to save timing', 'error');
    }
  };

  // ── Video Management ─────────────────────────────────────
  const handleVideoUpload = async (countryId, file) => {
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('video/')) {
      showMessage('Please upload a video file', 'error');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      showMessage('Video must be under 50MB', 'error');
      return;
    }

    setVideoUploading(prev => ({ ...prev, [countryId]: true }));

    try {
      const ext = file.name.split('.').pop();
      const fileName = `country-videos/${countryId}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);

      await supabase
        .from('country_videos')
        .upsert({
          country_id: countryId,
          video_url: urlData.publicUrl,
          uploaded_by: userProfile?.id,
        }, { onConflict: 'country_id' });

      showMessage(`Video uploaded for ${countryId}!`);
      loadData();
    } catch (err) {
      showMessage(err.message, 'error');
    } finally {
      setVideoUploading(prev => ({ ...prev, [countryId]: false }));
    }
  };

  const handleDeleteVideo = async (countryId) => {
    try {
      await supabase.from('country_videos').delete().eq('country_id', countryId);
      showMessage('Video removed');
      loadData();
    } catch (err) {
      showMessage(err.message, 'error');
    }
  };

  // Country list for video uploads — derived from all songs so new countries appear automatically
  const videoCountries = useMemo(() => {
    const seen = new Set();
    return allSongs
      .filter(s => {
        const key = s.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(s => ({ id: s.id, name: s.country, flag: s.flag }));
  }, [allSongs]);

  if (loading) {
    return (
      <div className="admin-panel">
        <div className="admin-loading">
          <Loader2 size={32} className="admin-spinner" />
          <p>Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      {/* Hero — matches user view */}
      <div className="ev-hero">
        <h1 className="ev-title">AIVISION</h1>
        <p className="ev-subtitle">Admin Panel</p>
      </div>

      {/* Message Toast */}
      {message && (
        <div className={`admin-toast ${message.type === 'error' ? 'admin-toast-error' : 'admin-toast-success'}`}>
          {message.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Section Tabs — same style as user view */}
      <div className="ev-tabs">
        <button
          onClick={() => setActiveSection('songs')}
          className={`ev-tab ${activeSection === 'songs' ? 'ev-tab-active' : ''}`}
        >
          <Music size={18} />
          <span>Songs</span>
        </button>
        <button
          onClick={() => setActiveSection('videos')}
          className={`ev-tab ${activeSection === 'videos' ? 'ev-tab-active' : ''}`}
        >
          <Film size={18} />
          <span>Videos</span>
        </button>
        <button
          onClick={() => setActiveSection('users')}
          className={`ev-tab ${activeSection === 'users' ? 'ev-tab-active' : ''}`}
        >
          <Users size={18} />
          <span>Users</span>
        </button>
      </div>

      {/* Songs Section */}
      {activeSection === 'songs' && (
        <div className="admin-section">
          <div className="admin-section-header">
            <h2>All Songs</h2>
            <button onClick={handleOpenNewSong} className="admin-add-btn">
              <Plus size={18} />
              <span>Add Song</span>
            </button>
          </div>

          {/* Song Form Modal */}
          {showSongForm && (
            <div className="admin-form-overlay" onClick={() => { setShowSongForm(false); setEditingSong(null); }}>
              <div className="admin-form-modal" onClick={e => e.stopPropagation()}>
                <div className="admin-form-header">
                  <h3>{editingSong ? 'Edit Song' : 'Add New Song'}</h3>
                  <button onClick={() => { setShowSongForm(false); setEditingSong(null); }} className="admin-form-close">
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleSongSubmit} className="admin-form">
                  <div className="admin-form-row">
                    <div className="admin-form-field">
                      <label>Country</label>
                      <input
                        type="text"
                        value={songForm.country}
                        onChange={e => {
                          const val = e.target.value;
                          const autoFlag = getAutoFlag(val);
                          setSongForm(f => ({
                            ...f,
                            country: val,
                            id: val.toLowerCase().replace(/\s+/g, '-'),
                            ...(autoFlag ? { flag: autoFlag } : {}),
                          }));
                        }}
                        placeholder="e.g. Denmark"
                        required
                        readOnly={!!editingSong}
                        style={editingSong ? { opacity: 0.6 } : {}}
                      />
                    </div>
                    <div className="admin-form-field">
                      <label>Flag Emoji</label>
                      <input
                        type="text"
                        value={songForm.flag}
                        onChange={e => setSongForm(f => ({ ...f, flag: e.target.value }))}
                        placeholder="e.g. 🇸🇪"
                        required
                      />
                    </div>
                  </div>
                  <div className="admin-form-row">
                    <div className="admin-form-field">
                      <label>Song Title</label>
                      <input
                        type="text"
                        value={songForm.title}
                        onChange={e => setSongForm(f => ({ ...f, title: e.target.value }))}
                        placeholder="Song title"
                        required
                      />
                    </div>
                    <div className="admin-form-field">
                      <label>Artist</label>
                      <input
                        type="text"
                        value={songForm.artist}
                        onChange={e => setSongForm(f => ({ ...f, artist: e.target.value }))}
                        placeholder="Artist name"
                        required
                      />
                    </div>
                  </div>
                  <div className="admin-form-field">
                    <label>Genre</label>
                    <input
                      type="text"
                      value={songForm.genre}
                      onChange={e => setSongForm(f => ({ ...f, genre: e.target.value }))}
                      placeholder="e.g. Electropop"
                      required
                    />
                  </div>
                  <div className="admin-form-field">
                    <label>Lyrics</label>
                    <textarea
                      value={songForm.lyrics}
                      onChange={e => setSongForm(f => ({ ...f, lyrics: e.target.value }))}
                      placeholder="[Verse 1]&#10;First line of lyrics..."
                      rows={8}
                    />
                  </div>
                  <div className="admin-form-field">
                    <label>Audio File (MP3 recommended, max 20MB)</label>
                    {editingSong?.audio_url && !audioFile && (
                      <p style={{ fontSize: '0.8rem', color: 'rgba(196,181,253,0.7)', margin: '0 0 6px' }}>
                        Current: audio attached. Upload a new file to replace it.
                      </p>
                    )}
                    <div className="admin-file-input">
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={e => handleAudioFileSelect(e.target.files[0])}
                        id="audio-upload"
                      />
                      <label htmlFor="audio-upload" className="admin-file-label">
                        <Upload size={18} />
                        <span>
                          {audioFile
                            ? `${audioFile.name} (${formatFileSize(audioFile.size)})`
                            : (editingSong?.audio_url ? 'Replace audio file...' : 'Choose audio file...')}
                        </span>
                      </label>
                      {audioFile && (
                        <button type="button" onClick={() => setAudioFile(null)} className="admin-file-clear" title="Remove file">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="admin-form-field">
                    <label>Cover Art — image or mp4 (optional, max 10MB)</label>
                    {editingSong?.cover_url && !coverFile && (
                      <p style={{ fontSize: '0.8rem', color: 'rgba(196,181,253,0.7)', margin: '0 0 6px' }}>
                        Current: cover attached. Upload a new file to replace it.
                      </p>
                    )}
                    <div className="admin-file-input">
                      <input
                        type="file"
                        accept="image/*,video/mp4"
                        onChange={e => handleCoverFileSelect(e.target.files[0])}
                        id="cover-upload"
                      />
                      <label htmlFor="cover-upload" className="admin-file-label">
                        <Upload size={18} />
                        <span>
                          {coverFile
                            ? `${coverFile.name} (${formatFileSize(coverFile.size)})`
                            : (editingSong?.cover_url ? 'Replace cover art...' : 'Choose cover art...')}
                        </span>
                      </label>
                      {coverFile && (
                        <button type="button" onClick={() => setCoverFile(null)} className="admin-file-clear" title="Remove file">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="admin-form-actions">
                    <button type="submit" disabled={uploadingSong} className="admin-submit-btn">
                      {uploadingSong ? (
                        <><Loader2 size={18} className="admin-spinner" /> {audioFile || coverFile ? 'Uploading...' : 'Saving...'}</>
                      ) : (
                        <><Save size={18} /> Save Song</>
                      )}
                    </button>
                    {uploadingSong && (
                      <button type="button" onClick={handleCancelUpload} className="admin-cancel-btn">
                        <X size={16} /> Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Songs List */}
          <div className="admin-songs-list">
            {allSongs.map((song, idx) => (
              <div key={song.id} className="admin-song-row">
                <div className="admin-order-btns">
                  <button onClick={() => handleReorderSong(idx, -1)} className="admin-order-btn" title="Move up" disabled={idx === 0}>
                    <ChevronUp size={14} />
                  </button>
                  <span className="admin-order-num">{idx + 1}</span>
                  <button onClick={() => handleReorderSong(idx, 1)} className="admin-order-btn" title="Move down" disabled={idx === allSongs.length - 1}>
                    <ChevronDown size={14} />
                  </button>
                </div>
                <span className="admin-song-flag">{song.flag}</span>
                <div className="admin-song-info">
                  <p className="admin-song-title">{song.title}</p>
                  <p className="admin-song-meta">{song.artist} — {song.country}</p>
                </div>
                <div className="admin-song-badges">
                  {song.audio_url ? (
                    <span className="admin-badge admin-badge-audio">
                      <Music size={12} /> Audio
                    </span>
                  ) : (
                    <span className="admin-badge admin-badge-noaudio">No audio</span>
                  )}
                  {song.lyrics_timing && song.lyrics_timing.length > 0 && (
                    <span className="admin-badge admin-badge-audio">
                      <Clock size={12} /> Timed
                    </span>
                  )}
                  <span className="admin-badge">{song.genre}</span>
                </div>
                <button onClick={() => handleEditSong(song)} className="admin-edit-btn" title="Edit song / upload audio">
                  <Pencil size={16} />
                </button>
                {song.audio_url && song.lyrics && (
                  <button onClick={() => setTimingEditorSong(song)} className="admin-edit-btn" title="Set lyrics timing">
                    <Clock size={16} />
                  </button>
                )}
                {!song._isBuiltIn && (
                  <button onClick={() => handleDeleteSong(song.id)} className="admin-delete-btn" title="Delete song">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Country Videos Section */}
      {activeSection === 'videos' && (
        <div className="admin-section">
          <div className="admin-section-header">
            <h2>Country Hover Videos</h2>
            <p className="admin-section-desc">Upload short videos (max 10s, 50MB) that play when users hover over a country.</p>
          </div>

          <div className="admin-videos-grid">
            {videoCountries.map(country => {
              const video = countryVideos[country.id];
              const uploading = videoUploading[country.id];

              return (
                <div key={country.id} className="admin-video-card">
                  <div className="admin-video-card-header">
                    <span className="admin-video-flag">{country.flag}</span>
                    <span className="admin-video-name">{country.name}</span>
                    {video && (
                      <button
                        onClick={() => handleDeleteVideo(country.id)}
                        className="admin-video-remove"
                        title="Remove video"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  {video ? (
                    <div className="admin-video-preview">
                      <video
                        src={video.video_url}
                        muted
                        loop
                        playsInline
                        onMouseEnter={e => e.target.play()}
                        onMouseLeave={e => { e.target.pause(); e.target.currentTime = 0; }}
                        className="admin-video-player"
                      />
                      <div className="admin-video-status admin-video-status-active">
                        <CheckCircle size={14} />
                        <span>Video active</span>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="admin-video-dropzone"
                      onClick={() => videoInputRefs.current[country.id]?.click()}
                    >
                      {uploading ? (
                        <Loader2 size={24} className="admin-spinner" />
                      ) : (
                        <>
                          <Video size={24} />
                          <span>Upload video</span>
                        </>
                      )}
                      <input
                        ref={el => videoInputRefs.current[country.id] = el}
                        type="file"
                        accept="video/*"
                        style={{ display: 'none' }}
                        onChange={e => handleVideoUpload(country.id, e.target.files[0])}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Users Section */}
      {activeSection === 'users' && (
        <div className="admin-section">
          <div className="admin-section-header">
            <h2>User Votes</h2>
            <p className="admin-section-desc">See who has voted and their vote breakdown.</p>
          </div>

          {(() => {
            // Group votes by user
            const userVoteMap = {};
            allVotes.forEach(v => {
              if (!userVoteMap[v.user_id]) userVoteMap[v.user_id] = [];
              userVoteMap[v.user_id].push(v);
            });

            const userEntries = Object.entries(userVoteMap)
              .map(([userId, votes]) => {
                const profile = allUsers.find(u => u.id === userId);
                const totalPts = votes.reduce((s, v) => s + v.score, 0);
                return { userId, votes, profile, totalPts, voteCount: votes.length };
              })
              .sort((a, b) => b.totalPts - a.totalPts);

            if (userEntries.length === 0) {
              return (
                <div className="ev-empty">
                  <Users size={48} className="ev-empty-icon" />
                  <p className="ev-empty-title">No votes yet</p>
                  <p className="ev-empty-sub">Votes will appear here once users start voting.</p>
                </div>
              );
            }

            return (
              <div className="admin-users-list">
                {userEntries.map(({ userId, votes, profile, totalPts, voteCount }) => (
                  <div key={userId} className="admin-user-row">
                    <div className="admin-user-avatar">
                      {(profile?.display_name || profile?.email || userId).charAt(0).toUpperCase()}
                    </div>
                    <div className="admin-user-info">
                      <p className="admin-user-name">
                        {profile?.display_name || profile?.email || `User ${userId.slice(0, 8)}...`}
                      </p>
                      <div className="admin-user-votes">
                        {votes
                          .sort((a, b) => b.score - a.score)
                          .slice(0, 8)
                          .map(v => {
                            const song = allSongs.find(s => s.id === v.song_id);
                            return (
                              <span key={v.song_id} className="admin-user-vote-chip">
                                {song?.flag || ''} {v.score}pts
                              </span>
                            );
                          })}
                        {votes.length > 8 && (
                          <span className="admin-user-vote-chip">+{votes.length - 8} more</span>
                        )}
                      </div>
                    </div>
                    <div className="admin-user-stats">
                      <div className="admin-user-stat">
                        <span className="admin-user-stat-value">{voteCount}</span>
                        <span className="admin-user-stat-label">Votes</span>
                      </div>
                      <div className="admin-user-stat">
                        <span className="admin-user-stat-value">{totalPts}</span>
                        <span className="admin-user-stat-label">Points</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Lyrics Timing Editor Modal */}
      {timingEditorSong && (
        <LyricsTimingEditor
          song={timingEditorSong}
          onSave={handleSaveTiming}
          onClose={() => setTimingEditorSong(null)}
        />
      )}
    </div>
  );
};

export default AdminPanel;
