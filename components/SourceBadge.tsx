'use client';

import {
  detectActualSource,
  getSourceDisplayName,
  getSourceBadgeClasses,
} from '@/lib/source-detection';
import type { MusicSong } from '@/store/musicStore';
import type { StreamableSong } from '@/lib/music-api';

interface SourceBadgeProps {
  song: MusicSong | StreamableSong;
  className?: string;
}

export default function SourceBadge({
  song,
  className = '',
}: SourceBadgeProps) {
  const actualSource = detectActualSource(song);
  const displayName = getSourceDisplayName(actualSource);
  const badgeClasses = getSourceBadgeClasses(actualSource);

  return <span className={`${badgeClasses} ${className}`}>{displayName}</span>;
}
