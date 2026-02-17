import { useState, useEffect } from 'react';

// Cache extracted colors so we only compute once per flag
const colorCache = new Map();

/**
 * Extract dominant colors from a flag emoji by rendering it to a canvas.
 * Works with any flag — Greenland, Denmark, custom countries — because
 * it reads the actual rendered pixels rather than using a lookup table.
 */
function extractFlagColors(flagEmoji) {
  if (colorCache.has(flagEmoji)) return Promise.resolve(colorCache.get(flagEmoji));

  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const size = 64;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Clear to transparent
    ctx.clearRect(0, 0, size, size);

    // Draw the flag emoji large enough to sample
    ctx.font = `${size - 8}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(flagEmoji, size / 2, size / 2);

    // Read pixels
    const imageData = ctx.getImageData(0, 0, size, size).data;
    const buckets = {};

    for (let i = 0; i < imageData.length; i += 4) {
      const r = imageData[i];
      const g = imageData[i + 1];
      const b = imageData[i + 2];
      const a = imageData[i + 3];

      // Skip transparent / near-transparent pixels
      if (a < 128) continue;

      // Skip very dark (near-black) and very light (near-white) pixels
      const brightness = (r + g + b) / 3;
      if (brightness < 30 || brightness > 235) continue;

      // Quantize to reduce noise (group similar colors)
      const qr = Math.round(r / 32) * 32;
      const qg = Math.round(g / 32) * 32;
      const qb = Math.round(b / 32) * 32;
      const key = `${qr},${qg},${qb}`;

      if (!buckets[key]) buckets[key] = { r: 0, g: 0, b: 0, count: 0 };
      buckets[key].r += r;
      buckets[key].g += g;
      buckets[key].b += b;
      buckets[key].count += 1;
    }

    // Sort by frequency, take top colors
    const sorted = Object.values(buckets)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    if (sorted.length === 0) {
      // Fallback: purple theme colors
      const fallback = ['#8b5cf6', '#ec4899', '#6366f1'];
      colorCache.set(flagEmoji, fallback);
      resolve(fallback);
      return;
    }

    // Average each bucket and convert to hex
    const colors = sorted.map((b) => {
      const r = Math.round(b.r / b.count);
      const g = Math.round(b.g / b.count);
      const bl = Math.round(b.b / b.count);
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
    });

    // Deduplicate colors that are very similar
    const unique = [colors[0]];
    for (let i = 1; i < colors.length; i++) {
      const isDuplicate = unique.some((existing) => {
        const er = parseInt(existing.slice(1, 3), 16);
        const eg = parseInt(existing.slice(3, 5), 16);
        const eb = parseInt(existing.slice(5, 7), 16);
        const cr = parseInt(colors[i].slice(1, 3), 16);
        const cg = parseInt(colors[i].slice(3, 5), 16);
        const cb = parseInt(colors[i].slice(5, 7), 16);
        return Math.abs(er - cr) + Math.abs(eg - cg) + Math.abs(eb - cb) < 80;
      });
      if (!isDuplicate) unique.push(colors[i]);
    }

    // Ensure at least 2 colors for gradients
    while (unique.length < 2) unique.push(unique[0]);

    colorCache.set(flagEmoji, unique);
    resolve(unique);
  });
}

/**
 * React hook: returns an array of hex color strings extracted from a flag emoji.
 * Usage: const colors = useFlagColors(song.flag);
 */
export default function useFlagColors(flagEmoji) {
  const [colors, setColors] = useState(() => colorCache.get(flagEmoji) || null);

  useEffect(() => {
    if (!flagEmoji) return;
    let cancelled = false;
    extractFlagColors(flagEmoji).then((result) => {
      if (!cancelled) setColors(result);
    });
    return () => { cancelled = true; };
  }, [flagEmoji]);

  return colors;
}
