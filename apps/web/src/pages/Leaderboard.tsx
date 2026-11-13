import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import type { LeaderboardEntry } from '@/types';
import Card from '@/components/Card';

export default function Leaderboard() {
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [theme, setTheme] = useState('');

  useEffect(() => {
    api.leaderboardsPlayers(theme ? { theme } : {}).then(setRows).catch(() => setRows([]));
  }, [theme]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">Classement des joueurs</h1>
        <select value={theme} onChange={(e) => setTheme(e.target.value)}>
          <option value="">Global</option>
          <option value="tris">Tris</option>
          <option value="debogage">Débogage</option>
          <option value="cryptographie">Cryptographie</option>
        </select>
      </div>
      <Card>
        <table className="w-full text-sm">
          <thead className="text-[var(--muted)]">
            <tr><th className="text-left py-2">#</th><th className="text-left">Joueur</th><th className="text-left">Défi</th><th className="text-right">Score</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.rank} className="border-t border-[var(--border)]">
                <td className="py-2">{r.rank}</td>
                <td>{r.pseudo}</td>
                <td className="text-[var(--muted)]">{r.challenge}</td>
                <td className="text-right font-mono text-[var(--accent-cyan)]">{r.score}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="py-4 text-[var(--muted)]">Aucun score pour le moment.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
