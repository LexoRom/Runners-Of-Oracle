import { useEffect, useState } from 'react';
import { api, ApiClientError } from '@/api/client';
import type { EventItem } from '@/types';
import Button from '@/components/Button';
import Card from '@/components/Card';

export default function Events() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.events().then(setEvents).catch(() => setEvents([]));
  }, []);

  async function join(id: string) {
    setError(null);
    try { await api.joinEvent(id); alert('Inscrit à l’event'); }
    catch (err) { setError(err instanceof ApiClientError ? err.message : 'Erreur'); }
  }

  async function start(id: string) {
    setError(null);
    try { await api.startEvent(id); alert('Essai démarré — il ne reste plus qu’un essai'); }
    catch (err) { setError(err instanceof ApiClientError ? err.message : 'Erreur'); }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Events</h1>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="grid grid-cols-1 gap-4">
        {events.map((e) => (
          <Card key={e.id} title={e.title}>
            <p className="text-sm text-[var(--muted)]">{e.description}</p>
            <p className="mt-2 text-xs text-[var(--muted)]">
              {new Date(e.startsAt).toLocaleString()} → {new Date(e.endsAt).toLocaleString()} · {e.type}
            </p>
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" onClick={() => join(e.id)}>Rejoindre</Button>
              <Button onClick={() => start(e.id)}>Démarrer l’essai</Button>
            </div>
          </Card>
        ))}
        {events.length === 0 && <p className="text-[var(--muted)]">Aucun event planifié.</p>}
      </div>
    </div>
  );
}
