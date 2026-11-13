import { useEffect, useState } from 'react';
import { api, ApiClientError } from '@/api/client';
import type { Team } from '@/types';
import Button from '@/components/Button';
import Card from '@/components/Card';

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    // Pas d'endpoint "list teams" : on affiche celles créées via le formulaire courant.
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const t: any = await api.createTeam({ name, tag });
      setTeams((prev) => [...prev, t]);
      setName(''); setTag('');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Erreur');
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Équipes</h1>
      <Card title="Créer une équipe">
        <form onSubmit={create} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">Nom</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">Tag</label>
            <input value={tag} onChange={(e) => setTag(e.target.value)} required maxLength={5} className="w-24 uppercase" />
          </div>
          <Button type="submit">Créer</Button>
        </form>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </Card>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {teams.map((t) => (
          <Card key={t.id} title={`${t.name} [${t.tag}]`}>
            <p className="text-sm text-[var(--muted)]">{t.members?.length ?? 1} membre(s)</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
