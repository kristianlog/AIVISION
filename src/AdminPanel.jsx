import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from './supabaseClient';
import SONGS from './songs';
import {
  ArrowLeft, Upload, Music, Video, Trash2, Plus, Save, X, Film,
  CheckCircle, AlertCircle, Loader2, Pencil
} from 'lucide-react';

const AdminPanel = ({ onBack, userProfile }) => {
  const [activeSection, setActiveSection] = useState('songs');
  const [songs, setSongs] = useState([]);
  const [countryVideos, setCountryVideos] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // Merge built-in songs with custom songs (custom overrides built-in by ID)
  const allSongs = useMemo(() => {
    const customMap = new Map(songs.map(s => [s.id, s]));
    const merged = SONGS.map(s => customMap.has(s.id) ? { ...s, ...customMap.get(s.id), _isBuiltIn: true } : { ...s, _isBuiltIn: true });
    const customOnly = songs.filter(s => !SONGS.some(b => b.id === s.id)).map(s => ({ ...s, _isBuiltIn: false }));
    return [...merged, ...customOnly];
  }, [songs]);

  // Song form state
  const [showSongForm, setShowSongForm] = useState(false);
  const [editingSong, setEditingSong] = useState(null); // null = new song, object = editing
  const [songForm, setSongForm] = useState({
    id: '', country: '', flag: '', artist: '', title: '', genre: '', lyrics: ''
  });
  const [audioFile, setAudioFile] = useState(null);
  const [uploadingSong, setUploadingSong] = useState(false);

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
    } catch (err) {
      console.error('Error loading admin data:', err);
    }
    setLoading(false);
  };

  // ── Song Management ──────────────────────────────────────
  const handleSongSubmit = async (e) => {
    e.preventDefault();
    setUploadingSong(true);

    try {
      let audioUrl = null;

      // Upload audio file if provided
      if (audioFile) {
        const ext = audioFile.name.split('.').pop();
        const fileName = `songs/${songForm.id}_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(fileName, audioFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('media')
          .getPublicUrl(fileName);
        audioUrl = urlData.publicUrl;
      }

      const songData = {
        id: editingSong ? editingSong.id : songForm.id.toLowerCase().replace(/\s+/g, '-'),
        country: songForm.country,
        flag: songForm.flag,
        artist: songForm.artist,
        title: songForm.title,
        genre: songForm.genre,
        lyrics: songForm.lyrics,
        audio_url: audioUrl || (editingSong?.audio_url ?? null),
        lyrics_timing: editingSong?.lyrics_timing || [],
      };

      const { error } = await supabase
        .from('custom_songs')
        .upsert(songData, { onConflict: 'id' });

      if (error) throw error;

      showMessage('Song saved successfully!');
      setShowSongForm(false);
      setEditingSong(null);
      setSongForm({ id: '', country: '', flag: '', artist: '', title: '', genre: '', lyrics: '' });
      setAudioFile(null);
      loadData();
    } catch (err) {
      showMessage(err.message, 'error');
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
    setShowSongForm(true);
  };

  const handleOpenNewSong = () => {
    setEditingSong(null);
    setSongForm({ id: '', country: '', flag: '', artist: '', title: '', genre: '', lyrics: '' });
    setAudioFile(null);
    setShowSongForm(true);
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

  // Country list for video uploads
  const COUNTRIES = [
    { id: 'sweden', name: 'Sweden', flag: '\u{1F1F8}\u{1F1EA}' },
    { id: 'italy', name: 'Italy', flag: '\u{1F1EE}\u{1F1F9}' },
    { id: 'ukraine', name: 'Ukraine', flag: '\u{1F1FA}\u{1F1E6}' },
    { id: 'france', name: 'France', flag: '\u{1F1EB}\u{1F1F7}' },
    { id: 'norway', name: 'Norway', flag: '\u{1F1F3}\u{1F1F4}' },
    { id: 'spain', name: 'Spain', flag: '\u{1F1EA}\u{1F1F8}' },
    { id: 'greece', name: 'Greece', flag: '\u{1F1EC}\u{1F1F7}' },
    { id: 'finland', name: 'Finland', flag: '\u{1F1EB}\u{1F1EE}' },
    { id: 'switzerland', name: 'Switzerland', flag: '\u{1F1E8}\u{1F1ED}' },
    { id: 'ireland', name: 'Ireland', flag: '\u{1F1EE}\u{1F1EA}' },
    { id: 'albania', name: 'Albania', flag: '\u{1F1E6}\u{1F1F1}' },
    { id: 'netherlands', name: 'Netherlands', flag: '\u{1F1F3}\u{1F1F1}' },
  ];

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
      {/* Header */}
      <div className="admin-header">
        <button onClick={onBack} className="admin-back-btn">
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
        <h1 className="admin-title">Admin Panel</h1>
      </div>

      {/* Message Toast */}
      {message && (
        <div className={`admin-toast ${message.type === 'error' ? 'admin-toast-error' : 'admin-toast-success'}`}>
          {message.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Section Tabs */}
      <div className="admin-tabs">
        <button
          onClick={() => setActiveSection('songs')}
          className={`admin-tab ${activeSection === 'songs' ? 'admin-tab-active' : ''}`}
        >
          <Music size={18} />
          <span>Songs</span>
        </button>
        <button
          onClick={() => setActiveSection('videos')}
          className={`admin-tab ${activeSection === 'videos' ? 'admin-tab-active' : ''}`}
        >
          <Film size={18} />
          <span>Country Videos</span>
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
                        onChange={e => setSongForm(f => ({ ...f, country: e.target.value, id: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                        placeholder="e.g. Sweden"
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
                    <label>Audio File (MP3, WAV, etc.)</label>
                    {editingSong?.audio_url && !audioFile && (
                      <p style={{ fontSize: '0.8rem', color: 'rgba(196,181,253,0.7)', margin: '0 0 6px' }}>
                        Current: audio attached. Upload a new file to replace it.
                      </p>
                    )}
                    <div className="admin-file-input">
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={e => setAudioFile(e.target.files[0])}
                        id="audio-upload"
                      />
                      <label htmlFor="audio-upload" className="admin-file-label">
                        <Upload size={18} />
                        <span>{audioFile ? audioFile.name : (editingSong?.audio_url ? 'Replace audio file...' : 'Choose audio file...')}</span>
                      </label>
                    </div>
                  </div>
                  <button type="submit" disabled={uploadingSong} className="admin-submit-btn">
                    {uploadingSong ? (
                      <><Loader2 size={18} className="admin-spinner" /> Uploading...</>
                    ) : (
                      <><Save size={18} /> Save Song</>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Songs List */}
          <div className="admin-songs-list">
            {allSongs.map(song => (
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
                  <span className="admin-badge">{song.genre}</span>
                </div>
                <button onClick={() => handleEditSong(song)} className="admin-edit-btn" title="Edit song / upload audio">
                  <Pencil size={16} />
                </button>
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
            {COUNTRIES.map(country => {
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
    </div>
  );
};

export default AdminPanel;
