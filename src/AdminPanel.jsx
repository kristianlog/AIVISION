import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { useTheme, THEME_PRESETS } from './ThemeContext';
import SONGS from './songs';
import LyricsTimingEditor from './LyricsTimingEditor';
import {
  ArrowLeft, Upload, Music, Video, Trash2, Plus, Save, X, Film,
  CheckCircle, AlertCircle, Loader2, Pencil, Clock,
  Users, Wrench, Download, Palette, Image
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
  const { theme, updateTheme } = useTheme();
  const [activeSection, setActiveSection] = useState('songs');
  const [songs, setSongs] = useState([]);
  const [countryVideos, setCountryVideos] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // Theme editor local state
  const [themeForm, setThemeForm] = useState({ ...theme });
  const [confirmAction, setConfirmAction] = useState(null);
  const [songSubTab, setSongSubTab] = useState('list'); // 'list' | 'videos'
  const [logoUploading, setLogoUploading] = useState(false);

  // Merge built-in songs with custom songs (custom overrides built-in by ID), sorted alphabetically by country
  const allSongs = useMemo(() => {
    const customMap = new Map(songs.map(s => [s.id, s]));
    const merged = SONGS.map(s => customMap.has(s.id)
      ? { ...s, ...customMap.get(s.id), _isBuiltIn: true }
      : { ...s, _isBuiltIn: true });
    const customOnly = songs.filter(s => !SONGS.some(b => b.id === s.id))
      .map(s => ({ ...s, _isBuiltIn: false }));
    return [...merged, ...customOnly].sort((a, b) => a.country.localeCompare(b.country));
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
        {theme.logoUrl && (
          <img src={theme.logoUrl} alt="" style={{ maxHeight: 56, maxWidth: 200, objectFit: 'contain', marginBottom: 8 }} />
        )}
        <h1 className="ev-title">{theme.appName}</h1>
        <p className="ev-subtitle">Admin Panel</p>
      </div>

      {/* Message Toast */}
      {message && (
        <div className={`admin-toast ${message.type === 'error' ? 'admin-toast-error' : 'admin-toast-success'}`}>
          {message.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Section Tabs */}
      <div className="ev-tabs">
        {[
          { id: 'songs', icon: Music, label: 'Songs' },
          { id: 'users', icon: Users, label: 'Users' },
          { id: 'settings', icon: Palette, label: 'Theme' },
          { id: 'tools', icon: Wrench, label: 'Tools' },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSection(tab.id);
                if (tab.id === 'settings') setThemeForm({ ...theme });
              }}
              className={`ev-tab ${activeSection === tab.id ? 'ev-tab-active' : ''}`}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Songs Section */}
      {activeSection === 'songs' && (
        <div className="admin-section">
          {/* Sub-tabs: Song List vs Videos */}
          <div className="leaderboard-toggle" style={{ marginBottom: 20 }}>
            <button
              className={`leaderboard-toggle-btn ${songSubTab === 'list' ? 'leaderboard-toggle-active' : ''}`}
              onClick={() => setSongSubTab('list')}
            >
              <Music size={16} /> Song List
            </button>
            <button
              className={`leaderboard-toggle-btn ${songSubTab === 'videos' ? 'leaderboard-toggle-active' : ''}`}
              onClick={() => setSongSubTab('videos')}
            >
              <Film size={16} /> Hover Videos
            </button>
          </div>

          {songSubTab === 'list' && (
          <>
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
            {allSongs.map((song) => (
              <div key={song.id} className="admin-song-row">
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
                  {!song.lyrics && (
                    <span className="admin-badge admin-badge-noaudio">No lyrics</span>
                  )}
                  {song.lyrics_timing && song.lyrics_timing.length > 0 && (
                    <span className="admin-badge admin-badge-audio">
                      <Clock size={12} /> Timed
                    </span>
                  )}
                  {song.lyrics && !song.lyrics_timing?.length && song.audio_url && (
                    <span className="admin-badge admin-badge-noaudio">No timing</span>
                  )}
                  <span className="admin-badge">{song.genre || 'No genre'}</span>
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
          </>
          )}

          {songSubTab === 'videos' && (
          <>
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
          </>
          )}
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

      {/* Theme Settings */}
      {activeSection === 'settings' && (
        <div className="admin-section">
          <div className="admin-section-header">
            <h2>Theme & Branding</h2>
            <p className="admin-section-desc">Customize the look and feel of your app. Changes apply instantly for all users.</p>
          </div>

          {/* Live Preview */}
          <div className="settings-preview" style={{
            background: `linear-gradient(135deg, ${themeForm.bgColor1}, ${themeForm.bgColor2}, ${themeForm.bgColor3})`
          }}>
            {themeForm.logoUrl ? (
              <img
                src={themeForm.logoUrl}
                alt="Logo"
                style={{ maxHeight: 60, maxWidth: 200, objectFit: 'contain', marginBottom: 4 }}
              />
            ) : null}
            <p className="settings-preview-title" style={{
              background: `linear-gradient(135deg, ${themeForm.primaryColor}, ${themeForm.secondaryColor}, #38bdf8)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              {themeForm.appName || 'AIVISION'}
            </p>
            <p className="settings-preview-sub">{themeForm.appSubtitle || 'Vote for your favorite songs'}</p>
          </div>

          {/* Presets */}
          <p className="settings-section-title">Quick Presets</p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: 8,
            marginBottom: 20,
          }}>
            {THEME_PRESETS.map(preset => (
              <button
                key={preset.name}
                onClick={() => setThemeForm(f => ({ ...f, ...preset }))}
                style={{
                  padding: '10px 8px',
                  background: `linear-gradient(135deg, ${preset.bgColor1}, ${preset.bgColor2}, ${preset.bgColor3})`,
                  border: themeForm.primaryColor === preset.primaryColor && themeForm.bgColor1 === preset.bgColor1
                    ? `2px solid ${preset.primaryColor}`
                    : '2px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{
                  display: 'flex',
                  gap: 4,
                  justifyContent: 'center',
                  marginBottom: 6,
                }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: preset.primaryColor }} />
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: preset.secondaryColor }} />
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
                  {preset.name}
                </span>
              </button>
            ))}
          </div>

          <p className="settings-section-title">App Identity</p>
          <div className="settings-grid">
            <div className="settings-field">
              <label>App Name</label>
              <input
                type="text"
                value={themeForm.appName}
                onChange={e => setThemeForm(f => ({ ...f, appName: e.target.value }))}
                placeholder="AIVISION"
              />
            </div>
            <div className="settings-field">
              <label>Subtitle</label>
              <input
                type="text"
                value={themeForm.appSubtitle}
                onChange={e => setThemeForm(f => ({ ...f, appSubtitle: e.target.value }))}
                placeholder="Vote for your favorite songs"
              />
            </div>
          </div>

          {/* Logo Upload */}
          <p className="settings-section-title">Logo</p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
            {themeForm.logoUrl ? (
              <div style={{
                width: 80, height: 80,
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
              }}>
                <img src={themeForm.logoUrl} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </div>
            ) : (
              <div style={{
                width: 80, height: 80,
                borderRadius: 12,
                border: '1px dashed rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(196,181,253,0.4)',
                flexShrink: 0,
              }}>
                <Image size={28} />
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              <div className="admin-file-input">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  id="logo-upload"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) {
                      showMessage('Logo must be under 5MB', 'error');
                      return;
                    }
                    setLogoUploading(true);
                    try {
                      const ext = file.name.split('.').pop();
                      const fileName = `branding/logo_${Date.now()}.${ext}`;
                      const { error: uploadErr } = await supabase.storage
                        .from('media')
                        .upload(fileName, file);
                      if (uploadErr) throw uploadErr;
                      const { data: urlData } = supabase.storage
                        .from('media')
                        .getPublicUrl(fileName);
                      setThemeForm(f => ({ ...f, logoUrl: urlData.publicUrl }));
                      showMessage('Logo uploaded! Hit Save Theme to apply.');
                    } catch (err) {
                      showMessage(err.message || 'Upload failed', 'error');
                    } finally {
                      setLogoUploading(false);
                    }
                  }}
                />
                <label htmlFor="logo-upload" className="admin-file-label" style={{ margin: 0 }}>
                  {logoUploading ? <Loader2 size={16} className="admin-spinner" /> : <Upload size={16} />}
                  <span>{logoUploading ? 'Uploading...' : 'Upload PNG / SVG'}</span>
                </label>
              </div>
              {themeForm.logoUrl && (
                <button
                  className="tools-action-btn tools-btn-danger"
                  style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                  onClick={() => setThemeForm(f => ({ ...f, logoUrl: '' }))}
                >
                  <Trash2 size={12} /> Remove Logo
                </button>
              )}
            </div>
          </div>

          <p className="settings-section-title">Accent Colors</p>
          <div className="settings-grid">
            <div className="settings-field">
              <label>Primary Color</label>
              <div className="settings-color-row">
                <input
                  type="color"
                  className="settings-color-input"
                  value={themeForm.primaryColor}
                  onChange={e => setThemeForm(f => ({ ...f, primaryColor: e.target.value }))}
                />
                <input
                  className="settings-color-hex"
                  value={themeForm.primaryColor}
                  onChange={e => setThemeForm(f => ({ ...f, primaryColor: e.target.value }))}
                />
              </div>
            </div>
            <div className="settings-field">
              <label>Secondary Color</label>
              <div className="settings-color-row">
                <input
                  type="color"
                  className="settings-color-input"
                  value={themeForm.secondaryColor}
                  onChange={e => setThemeForm(f => ({ ...f, secondaryColor: e.target.value }))}
                />
                <input
                  className="settings-color-hex"
                  value={themeForm.secondaryColor}
                  onChange={e => setThemeForm(f => ({ ...f, secondaryColor: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <p className="settings-section-title">Background Gradient</p>
          <div className="settings-grid">
            <div className="settings-field">
              <label>Start</label>
              <div className="settings-color-row">
                <input
                  type="color"
                  className="settings-color-input"
                  value={themeForm.bgColor1}
                  onChange={e => setThemeForm(f => ({ ...f, bgColor1: e.target.value }))}
                />
                <input
                  className="settings-color-hex"
                  value={themeForm.bgColor1}
                  onChange={e => setThemeForm(f => ({ ...f, bgColor1: e.target.value }))}
                />
              </div>
            </div>
            <div className="settings-field">
              <label>Middle</label>
              <div className="settings-color-row">
                <input
                  type="color"
                  className="settings-color-input"
                  value={themeForm.bgColor2}
                  onChange={e => setThemeForm(f => ({ ...f, bgColor2: e.target.value }))}
                />
                <input
                  className="settings-color-hex"
                  value={themeForm.bgColor2}
                  onChange={e => setThemeForm(f => ({ ...f, bgColor2: e.target.value }))}
                />
              </div>
            </div>
            <div className="settings-field">
              <label>End</label>
              <div className="settings-color-row">
                <input
                  type="color"
                  className="settings-color-input"
                  value={themeForm.bgColor3}
                  onChange={e => setThemeForm(f => ({ ...f, bgColor3: e.target.value }))}
                />
                <input
                  className="settings-color-hex"
                  value={themeForm.bgColor3}
                  onChange={e => setThemeForm(f => ({ ...f, bgColor3: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <button
            className="settings-save-btn"
            onClick={async () => {
              await updateTheme(themeForm);
              showMessage('Theme saved!');
            }}
          >
            <Save size={18} /> Save Theme
          </button>
        </div>
      )}

      {/* Tools */}
      {activeSection === 'tools' && (
        <div className="admin-section">
          <div className="admin-section-header">
            <h2>Admin Tools</h2>
            <p className="admin-section-desc">Manage data, export, and perform bulk actions.</p>
          </div>

          {/* Stats overview */}
          <div className="tools-stats">
            <div className="tools-stat-card">
              <div className="tools-stat-value">{allUsers.length}</div>
              <div className="tools-stat-label">Users</div>
            </div>
            <div className="tools-stat-card">
              <div className="tools-stat-value">{allVotes.length}</div>
              <div className="tools-stat-label">Total Votes</div>
            </div>
            <div className="tools-stat-card">
              <div className="tools-stat-value">{new Set(allVotes.map(v => v.user_id)).size}</div>
              <div className="tools-stat-label">Voters</div>
            </div>
            <div className="tools-stat-card">
              <div className="tools-stat-value">{allVotes.reduce((s, v) => s + v.score, 0)}</div>
              <div className="tools-stat-label">Total Points</div>
            </div>
            <div className="tools-stat-card">
              <div className="tools-stat-value">{allSongs.length}</div>
              <div className="tools-stat-label">Songs</div>
            </div>
          </div>

          {/* Export Votes */}
          <div className="tools-action-card">
            <div className="tools-action-info">
              <p className="tools-action-title">Export Votes</p>
              <p className="tools-action-desc">Download all votes as a CSV file.</p>
            </div>
            <button
              className="tools-action-btn tools-btn-primary"
              onClick={() => {
                const header = 'user_id,user_name,user_email,song_id,song_title,song_country,score\n';
                const rows = allVotes.map(v => {
                  const user = allUsers.find(u => u.id === v.user_id);
                  const song = allSongs.find(s => s.id === v.song_id);
                  return [
                    v.user_id,
                    `"${(user?.name || user?.email || 'Unknown').replace(/"/g, '""')}"`,
                    `"${(user?.email || '').replace(/"/g, '""')}"`,
                    v.song_id,
                    `"${(song?.title || 'Unknown').replace(/"/g, '""')}"`,
                    `"${(song?.country || '').replace(/"/g, '""')}"`,
                    v.score
                  ].join(',');
                }).join('\n');
                const blob = new Blob([header + rows], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `votes_${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                showMessage('Votes exported!');
              }}
            >
              <Download size={16} /> Export CSV
            </button>
          </div>

          {/* Export Ratings */}
          <div className="tools-action-card">
            <div className="tools-action-info">
              <p className="tools-action-title">Export Ratings</p>
              <p className="tools-action-desc">Download all detailed ratings as JSON.</p>
            </div>
            <button
              className="tools-action-btn tools-btn-primary"
              onClick={async () => {
                try {
                  const { data } = await supabase.from('ratings').select('*');
                  const blob = new Blob([JSON.stringify(data || [], null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `ratings_${new Date().toISOString().slice(0, 10)}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  showMessage('Ratings exported!');
                } catch {
                  showMessage('Failed to export ratings', 'error');
                }
              }}
            >
              <Download size={16} /> Export JSON
            </button>
          </div>

          {/* Reset All Votes */}
          <div className="tools-action-card">
            <div className="tools-action-info">
              <p className="tools-action-title">Reset All Votes</p>
              <p className="tools-action-desc">Delete every vote in the database. This cannot be undone.</p>
            </div>
            <button
              className="tools-action-btn tools-btn-danger"
              onClick={() => setConfirmAction('reset-votes')}
            >
              <Trash2 size={16} /> Reset
            </button>
          </div>

          {/* Reset All Ratings */}
          <div className="tools-action-card">
            <div className="tools-action-info">
              <p className="tools-action-title">Reset All Ratings</p>
              <p className="tools-action-desc">Delete every category rating. This cannot be undone.</p>
            </div>
            <button
              className="tools-action-btn tools-btn-danger"
              onClick={() => setConfirmAction('reset-ratings')}
            >
              <Trash2 size={16} /> Reset
            </button>
          </div>

          {/* Per-user vote deletion */}
          {allUsers.length > 0 && (
            <>
              <p className="settings-section-title" style={{ marginTop: 24 }}>Delete Votes by User</p>
              {allUsers.map(user => {
                const userVoteCount = allVotes.filter(v => v.user_id === user.id).length;
                if (userVoteCount === 0) return null;
                return (
                  <div key={user.id} className="tools-action-card">
                    <div className="admin-user-avatar">
                      {(user.name || user.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="tools-action-info">
                      <p className="tools-action-title">{user.name || user.email}</p>
                      <p className="tools-action-desc">{userVoteCount} vote{userVoteCount !== 1 ? 's' : ''}</p>
                    </div>
                    <button
                      className="tools-action-btn tools-btn-danger"
                      onClick={() => setConfirmAction({ type: 'delete-user-votes', userId: user.id, userName: user.name || user.email })}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div className="tools-confirm-overlay" onClick={() => setConfirmAction(null)}>
          <div className="tools-confirm-modal" onClick={e => e.stopPropagation()}>
            <p className="tools-confirm-title">
              {confirmAction === 'reset-votes' ? 'Reset All Votes?' :
               confirmAction === 'reset-ratings' ? 'Reset All Ratings?' :
               `Delete votes for ${confirmAction.userName}?`}
            </p>
            <p className="tools-confirm-desc">
              {confirmAction === 'reset-votes' ? `This will permanently delete ${allVotes.length} votes. This action cannot be undone.` :
               confirmAction === 'reset-ratings' ? 'This will permanently delete all category ratings. This action cannot be undone.' :
               `This will delete all votes cast by ${confirmAction.userName}.`}
            </p>
            <div className="tools-confirm-actions">
              <button className="tools-confirm-cancel" onClick={() => setConfirmAction(null)}>Cancel</button>
              <button
                className="tools-confirm-danger"
                onClick={async () => {
                  try {
                    if (confirmAction === 'reset-votes') {
                      const { error } = await supabase.from('votes').delete().not('user_id', 'is', null);
                      if (error) throw error;
                      setAllVotes([]);
                      showMessage('All votes have been reset');
                    } else if (confirmAction === 'reset-ratings') {
                      const { error } = await supabase.from('ratings').delete().not('user_id', 'is', null);
                      if (error) throw error;
                      showMessage('All ratings have been reset');
                    } else if (confirmAction.type === 'delete-user-votes') {
                      const { error } = await supabase.from('votes').delete().eq('user_id', confirmAction.userId);
                      if (error) throw error;
                      setAllVotes(prev => prev.filter(v => v.user_id !== confirmAction.userId));
                      showMessage(`Votes for ${confirmAction.userName} deleted`);
                    }
                    setConfirmAction(null);
                    loadData();
                  } catch (err) {
                    showMessage(err.message || 'Action failed', 'error');
                    setConfirmAction(null);
                  }
                }}
              >
                Confirm Delete
              </button>
            </div>
          </div>
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
