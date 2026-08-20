import { useEffect, useState } from 'react';
import {
  resolveUploadField,
  isSignedUploadUrl,
  isInlineImageUrl,
  getUploadUrl,
} from '../utils/uploads';

/**
 * Renders upload images from signed URLs or fetches them with JWT when needed.
 */
export default function UploadImage({
  item,
  field,
  src,
  alt = '',
  className,
  fallback = null,
  ...props
}) {
  const resolvedSrc = src || (item && field ? resolveUploadField(item, field) : '');
  const [displaySrc, setDisplaySrc] = useState('');

  useEffect(() => {
    let objectUrl = '';
    let cancelled = false;

    async function load() {
      if (!resolvedSrc) {
        setDisplaySrc('');
        return;
      }

      if (isInlineImageUrl(resolvedSrc) || isSignedUploadUrl(resolvedSrc)) {
        setDisplaySrc(resolvedSrc);
        return;
      }

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const url = getUploadUrl(resolvedSrc);

      try {
        const response = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) {
          if (!cancelled) setDisplaySrc('');
          return;
        }
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setDisplaySrc(objectUrl);
      } catch {
        if (!cancelled) setDisplaySrc('');
      }
    }

    load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [resolvedSrc]);

  if (!displaySrc) return fallback;
  return <img src={displaySrc} alt={alt} className={className} {...props} />;
}
