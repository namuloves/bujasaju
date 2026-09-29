'use client';

import { useState } from 'react';

export default function CopyButton({ text, label = '본문 복사' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
    >
      {done ? '복사됨 ✓' : label}
    </button>
  );
}
