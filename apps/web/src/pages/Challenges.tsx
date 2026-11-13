import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import type { Challenge } from '@/types';
import Card from '@/components/Card';

export default function Challenges() {
  const [items, setItems] = useState<Challenge[]>([]);
  const [theme, setTheme] = useState('');
  const [difficulty, setDifficulty] = useState('');

  useEffect(() => {
    const q: Record<string, string> = {};
    if (theme) q.theme = theme;
    if (difficulty) q.difficulty = difficulty;
    api.challenges(q).then((r: any) => setItems(Array.isArray(r) ? r : (r?.data ?? []))).catch(() => setItems([]));
  }, [theme, difficulty]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-[var(--muted)]">Thématique</label>
          <select value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="">Toutes</option>
            <option value="tris">Tris et listes</option>
            <option value="debogage">Débogage</option>
            <option value="cryptographie">Cryptographie</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--muted)]">Difficulté</label>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="">Toutes</option>
            {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {items.map((c) => (
          <Link key={c.id} to={`/challenges/${c.slug}`} className="block">
            <Card title={c.title}>
              <p className="text-sm text-[var(--muted)]">{c.statement?.slice(0, 120) || '—'}</p>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span>Difficulté {c.difficulty}</span>
                <span className="text-[var(--accent-cyan)]">{c.basePoints * c.difficulty} pts</span>
              </div>
            </Card>
          </Link>
        ))}
        {items.length === 0 && <p className="text-[var(--muted)]">Aucun défi ne correspond aux filtres.</p>}
      </div>
    </div>
  );
}
