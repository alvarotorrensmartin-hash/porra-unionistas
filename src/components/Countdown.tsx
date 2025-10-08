'use client';

import { useEffect, useState } from 'react';

export function Countdown({ target }: { target: string }) {
  const [remaining, setRemaining] = useState<string>(() => formatDiff(target));

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining(formatDiff(target));
    }, 1000);
    return () => clearInterval(timer);
  }, [target]);

  return (
    <span style={{ fontWeight: 600 }}>
      {remaining}
    </span>
  );
}

function formatDiff(target: string) {
  const targetDate = new Date(target).getTime();
  const now = Date.now();
  const diff = targetDate - now;
  if (diff <= 0) return '00:00:00';

  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diff % (1000 * 60)) / 1000);
  return [h, m, s].map(x => String(x).padStart(2, '0')).join(':');
}
