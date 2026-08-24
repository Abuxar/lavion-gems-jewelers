'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/admin/ui';

/**
 * A piece's pictures, as one ordered list.
 *
 * Not a main image plus a field of others: the first entry IS the main one,
 * which is the only thing that makes "reorder" worth having. The caller splits
 * it back into img + images when it saves, so nothing downstream changes.
 *
 * The panel this replaces had no upload control at all — only a text box for a
 * path, which meant adding a piece required knowing what was already in
 * public/images.
 */

/** More than this and the product page is a photo album. */
export const MAX_IMAGES = 8;

/**
 * Uploads are stored as data URIs on the product record, which is how this
 * catalogue has always held an uploaded image. That is fine for a few modest
 * pictures and ruinous for eight straight off a phone: a 4 MB JPEG becomes
 * 5.5 MB of base64, eight of those exceed Mongo's 16 MB document limit
 * outright, and every catalogue read afterwards carries the weight.
 *
 * So each one is re-encoded before it is stored — longest edge capped,
 * re-compressed as JPEG. A 4000×3000 photograph lands around 250 KB, which is
 * a sensible size for a product page in any case.
 */
const MAX_EDGE = 1600;
const QUALITY = 0.82;

function compress(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`${file.name} could not be read.`));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error(`${file.name} is not an image this browser can read.`));
      img.onload = () => {
        const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('This browser cannot resize images.'));
        // A transparent PNG would otherwise come out with black behind it once
        // it has been re-encoded as JPEG.
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', QUALITY));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

const isDataUri = (s: string) => /^data:/i.test(s);

export function ImageManager({
  images,
  onChange,
  onError
}: {
  images: string[];
  onChange: (next: string[]) => void;
  onError: (message: string) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  function move(from: number, direction: -1 | 1) {
    const to = from + direction;
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  async function add(files: FileList | null) {
    if (!files || files.length === 0) return;
    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      onError(`A piece can carry ${MAX_IMAGES} pictures. Remove one first.`);
      return;
    }

    setBusy(true);
    const added: string[] = [];
    for (const file of [...files].slice(0, room)) {
      if (!file.type.startsWith('image/')) {
        onError(`${file.name} is not an image.`);
        continue;
      }
      try {
        added.push(await compress(file));
      } catch (e) {
        onError(e instanceof Error ? e.message : `${file.name} could not be added.`);
      }
    }
    setBusy(false);
    if (added.length) onChange([...images, ...added]);
    if (files.length > room) onError(`Only ${room} more would fit — the rest were skipped.`);
  }

  const storedKb = Math.round(
    images.filter(isDataUri).reduce((n, s) => n + s.length * 0.75, 0) / 1024
  );

  return (
    <div>
      <span className="block text-[10px] font-semibold tracking-[0.14em] text-canvas/45 uppercase">
        Pictures
      </span>

      {images.length === 0 ? (
        <p className="mt-2 text-xs text-canvas/40">
          No pictures yet. The first one added is the main picture — the one on cards and in
          search results.
        </p>
      ) : (
        <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((src, i) => (
            <li
              key={`${src.slice(0, 40)}-${i}`}
              className={`border ${i === 0 ? 'border-gold-400' : 'border-white/15'}`}
            >
              <div className="relative aspect-square bg-onyx">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" />
                {i === 0 && (
                  <span className="absolute top-1.5 left-1.5 bg-gold-400 px-1.5 py-0.5 text-[9px] font-bold tracking-[0.1em] text-onyx">
                    MAIN
                  </span>
                )}
              </div>
              <div className="flex gap-1 p-1.5">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label="Move earlier"
                  className="flex-1 border border-white/15 py-1 text-xs text-canvas disabled:opacity-30"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => onChange(images.filter((_, j) => j !== i))}
                  aria-label="Remove picture"
                  className="flex-1 border border-red-500/40 py-1 text-xs text-red-300"
                >
                  ×
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === images.length - 1}
                  aria-label="Move later"
                  className="flex-1 border border-white/15 py-1 text-xs text-canvas disabled:opacity-30"
                >
                  →
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => {
            void add(e.target.files);
            // Cleared, so choosing the same file twice running still fires.
            e.target.value = '';
          }}
        />
        <Button onClick={() => fileInput.current?.click()} disabled={busy || images.length >= MAX_IMAGES}>
          {busy ? 'Adding…' : 'Add pictures'}
        </Button>
        <span className="text-[11px] text-canvas/35">
          {images.length}/{MAX_IMAGES}
          {storedKb > 0 && ` · about ${storedKb} KB stored with the piece`}
          {images.length === 0 && ' · pick several at once; large photographs are resized'}
        </span>
      </div>
    </div>
  );
}
