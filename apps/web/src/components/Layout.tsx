import { Link, NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  const nav = [
    { to: '/', label: 'Accueil' },
    { to: '/challenges', label: 'Défis' },
    { to: '/leaderboard', label: 'Classement' },
    { to: '/teams', label: 'Équipes' },
    { to: '/events', label: 'Events' },
    { to: '/lore', label: 'Lore' },
  ];
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-xl font-bold tracking-tight">
            <span className="text-[var(--accent-cyan)]">Code</span>
            <span className="text-[var(--accent-magenta)]">Quest</span>
          </Link>
          <nav className="flex gap-1 text-sm">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 transition-colors ${isActive ? 'bg-[var(--surface)] text-[var(--accent-cyan)]' : 'text-[var(--muted)] hover:text-[var(--fg)]'}`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex gap-2">
            <Link to="/login" className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:border-[var(--accent-cyan)]">Connexion</Link>
            <Link to="/register" className="rounded-md bg-[var(--accent-cyan)] px-3 py-1.5 text-sm font-semibold text-black">Inscription</Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <footer className="border-t border-[var(--border)] py-4 text-center text-xs text-[var(--muted)]">
        CodeQuest v1.0 — spécification fonctionnelle et technique
      </footer>
    </div>
  );
}
