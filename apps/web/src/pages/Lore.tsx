import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import type { LoreChapter } from '@/types';
import Card from '@/components/Card';

export default function Lore() {
  const [chapters, setChapters] = useState<LoreChapter[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    api.lore().then(setChapters).catch(() => setChapters([]));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Lore — ORACLE corrompue</h1>
      <div className="grid grid-cols-1 gap-4">
        {chapters.map((c) => (
          <Card key={c.id} title={`${c.title} · ${c.region}`}>
            {open === c.id ? (
              <div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{c.content}</p>
                <button className="mt-3 text-xs text-[var(--muted)]" onClick={() => setOpen(null)}>Replier</button>
              </div>
            ) : (
              <button className="text-sm text-[var(--accent-cyan)]" onClick={() => setOpen(c.id)}>Lire le chapitre</button>
            )}
          </Card>
        ))}
        {chapters.length === 0 && <p className="text-[var(--muted)]">Aucun chapitre débloqué.</p>}
      </div>
    </div>
  );
}
