import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import type { Challenge, Theme } from '@/types';
import Card from '@/components/Card';
import Button from '@/components/Button';

const THEMES = [
  { slug: 'tris', name: 'Tris et listes', region: 'Le Dédale des Tris' },
  { slug: 'debogage', name: 'Débogage', region: 'La Forge des Erreurs' },
  { slug: 'cryptographie', name: 'Cryptographie', region: 'La Crypte des Chiffres' },
  { slug: 'steganographie', name: 'Stéganographie', region: 'L’Atelier des Fantômes' },
  { slug: 'qr-codes', name: 'QR codes', region: 'Les Archives fracturées' },
  { slug: 'boss', name: 'Boss', region: 'Le Cœur d’ORACLE' },
];

export default function Home() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  useEffect(() => {
    api.challenges().then(setChallenges).catch(() => setChallenges([]));
  }, []);

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-transparent p-8">
        <h1 className="text-4xl font-bold leading-tight">
          <span className="text-[var(--accent-cyan)]">Code</span>
          <span className="text-[var(--accent-magenta)]">Quest</span>
        </h1>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          Dans un futur proche, <strong>ORACLE</strong>, l’IA qui gère le Réseau mondial, a été corrompue.
          Vous êtes des <em>Runners</em> : reprenez le contrôle de secteurs du réseau en relevant des défis
          informatiques — algorithmique, débogage, cryptographie, stéganographie et QR codes.
        </p>
        <div className="mt-5 flex gap-3">
          <Link to="/challenges"><Button>Commencer un défi</Button></Link>
          <Link to="/register"><Button variant="secondary">Créer un compte</Button></Link>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">Régions du réseau</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {THEMES.map((t) => (
            <Card key={t.slug} title={t.name}>
              <p className="text-sm text-[var(--muted)]">{t.region}</p>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">Défis disponibles</h2>
        {challenges.length === 0 ? (
          <p className="text-[var(--muted)]">Aucun défi publié pour le moment. (Lancez le seed et connectez-vous.)</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {challenges.slice(0, 6).map((c) => (
              <Link key={c.id} to={`/challenges/${c.slug}`} className="block">
                <Card title={c.title}>
                  <p className="text-sm text-[var(--muted)]">Difficulté {c.difficulty} · {c.basePoints} pts de base</p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
