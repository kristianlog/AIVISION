import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Upload } from 'lucide-react';
import { supabase } from './supabaseClient';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const OUTPUT_SIZE = 256;
const CROP_SIZE = 200;

const AvatarCropModal = ({ userProfile, onSave, onClose }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const offsetStartRef = useRef({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleFileSelect = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.size > MAX_FILE_SIZE) {
      setError('File too large. Maximum size is 5MB.');
      return;
    }
    if (!selected.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    setError(null);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(URL.createObjectURL(selected));
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const startDrag = (clientX, clientY) => {
    setDragging(true);
    dragStartRef.current = { x: clientX, y: clientY };
    offsetStartRef.current = { ...offset };
  };

  const onDragMove = useCallback((clientX, clientY) => {
    setOffset({
      x: offsetStartRef.current.x + (clientX - dragStartRef.current.x),
      y: offsetStartRef.current.y + (clientY - dragStartRef.current.y),
    });
  }, []);

  const endDrag = useCallback(() => setDragging(false), []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => onDragMove(e.clientX, e.clientY);
    const onTouchMove = (e) => { e.preventDefault(); onDragMove(e.touches[0].clientX, e.touches[0].clientY); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', endDrag);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', endDrag);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', endDrag);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', endDrag);
    };
  }, [dragging, onDragMove, endDrag]);

  const handleSave = async () => {
    if (!imageUrl) return;
    setSaving(true);
    setError(null);
    try {
      const img = new Image();
      img.src = imageUrl;
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });

      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext('2d');

      const natW = img.naturalWidth;
      const natH = img.naturalHeight;
      const baseScale = Math.max(CROP_SIZE / natW, CROP_SIZE / natH);
      const displayW = natW * baseScale * zoom;
      const displayH = natH * baseScale * zoom;
      const imgLeft = (CROP_SIZE - displayW) / 2 + offset.x;
      const imgTop = (CROP_SIZE - displayH) / 2 + offset.y;

      const srcX = Math.max(0, ((0 - imgLeft) / displayW) * natW);
      const srcY = Math.max(0, ((0 - imgTop) / displayH) * natH);
      const srcW = Math.min(natW - srcX, (CROP_SIZE / displayW) * natW);
      const srcH = Math.min(natH - srcY, (CROP_SIZE / displayH) * natH);

      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const fileName = `avatars/${userProfile.id}_${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, blob, { contentType: 'image/png', upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);

      await supabase.from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userProfile.id);

      onSave(publicUrl);
    } catch (err) {
      setError(err.message || 'Failed to save avatar');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    return () => { if (imageUrl) URL.revokeObjectURL(imageUrl); };
  }, [imageUrl]);

  return (
    <div className="avatar-crop-overlay" onClick={onClose}>
      <div className="avatar-crop-modal" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="detail-close"><X size={20} /></button>
        <h3 className="avatar-crop-title">Profile Picture</h3>

        {!imageUrl ? (
          <div className="avatar-crop-upload-area">
            <Upload size={40} style={{ color: 'rgba(196,181,253,0.4)', marginBottom: 12 }} />
            <p style={{ color: 'rgba(196,181,253,0.7)', marginBottom: 16 }}>Choose an image (max 5MB)</p>
            <label className="avatar-crop-file-btn">
              Select Image
              <input type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
            </label>
          </div>
        ) : (
          <>
            <div
              className="avatar-crop-area"
              onMouseDown={(e) => { e.preventDefault(); startDrag(e.clientX, e.clientY); }}
              onTouchStart={(e) => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
            >
              <img
                src={imageUrl}
                alt=""
                className="avatar-crop-image"
                style={{
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${zoom})`,
                }}
                draggable={false}
              />
              <div className="avatar-crop-circle-overlay" />
            </div>

            <div className="avatar-crop-zoom">
              <ZoomOut size={16} style={{ color: 'rgba(196,181,253,0.5)' }} />
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="avatar-crop-zoom-slider"
              />
              <ZoomIn size={16} style={{ color: 'rgba(196,181,253,0.5)' }} />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <label className="avatar-crop-change-btn">
                Change
                <input type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
              </label>
              <button onClick={handleSave} disabled={saving} className="avatar-crop-save-btn">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </>
        )}

        {error && (
          <p style={{ color: '#f87171', fontSize: '0.85rem', marginTop: 12, textAlign: 'center' }}>{error}</p>
        )}
      </div>
    </div>
  );
};

export default AvatarCropModal;
