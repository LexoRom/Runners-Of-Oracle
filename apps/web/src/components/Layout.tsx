import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAudio } from '../components/AudioContext';

export default function Layout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { state: audioState, setState: audioSetState } = useAudio();
  const [reducedMotion, setReduceMotion] = React.useState(
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  React.useEffect(() => {
    const html = document.documentElement;
    if (reducedMotion) html.classList.add('reduced-motion');
    else html.classList.remove('reduced-motion');
  }, [reducedMotion]);

  const nav = [
    { to: '/', label: 'nav.home' },
    { to: '/challenges', label: 'nav.challenges' },
    { to: '/leaderboard', label: 'nav.leaderboard' },
    { to: '/teams', label: 'nav.teams' },
    { to: '/events', label: 'nav.events' },
    { to: '/lore', label: 'nav.lore' },
  ];

  return (
    <div
      className="min-h-screen bg-[var(--bg)] text-[var(--fg)]"
      aria-label={t('appName')}
    >
      <header
        className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur"
        aria-label={t('headerAria')}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-xl font-bold tracking-tight">
            <span className="text-[var(--accent-cyan)]">{t('appName')}</span>
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
                {t(n.label)}
              </NavLink>
            ))}          
          </nav>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setReduceMotion((prev) => !prev)}
              className={`rounded-md p-2 transition-colors ${
                reducedMotion ? 'bg-[var(--accent-cyan)]/20' : 'bg-[var(--surface)]'
              }`}
              aria-checked={reducedMotion}
              aria-label={reducedMotion ? t('reduceMotionOn') : t('reduceMotionOff')}
              title={reducedMotion ? t('reduceMotionOn') : t('reduceMotionOff')}
            >
              {reducedMotion ? (
                <svg
                  className="h-5 w-5 text-[var(--accent-cyan)]"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M17.5 3.5c0-.32-.13-.62-.35-.87l2.5 2.5c-.03.27-.05.55-.05.83v.c.35-.12.67-.28.98-.32l3-2.5c.19-.31.08-.77-.2-.98l-2.5 2.5c-.23.23-.53.35-.87.35S17 4.02 17 3.5zM7.5 9.5c0-.32-.13-.62-.35-.87l2.5 2.5c-.03.27-.05.55-.05.83v.c.35-.12.67-.28.98-.32l3-2.5c.19-.31.08-.77-.2-.98l-2.5 2.5c-.23.23-.53.35-.87.35S7 10.02 7 9.5zM12 15.5c0 .32.13.62.35.87l-2.5-2.5c-.03-.27-.05-.55-.05-.83v-c.35.12-.67.28-.98.32l-3 2.5c.19-.31.08-.77.2.98l2.5-2.5c.23-.23-.53.35-.87.35S7 16.02 6 15.5 6.35 15 6.5 15zM18.5 9.5c0 .32-.13.62-.35.87l-2.5 2.5c-.03.27-.05.55-.05.83v.35-.12.67.28.98-.32l-3-2.5c.19-.31.08-.77.2-.98l2.5 2.5c.23-.23.35-.53.35-.85S18 10.02 18 9.5 17.65 9 18 9.5z" />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5 text-[var(--muted)]"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M17.5 3.5c0-.32-.13-.62-.35-.87l2.5 2.5c-.03.27-.05.55-.05.83v.c.35-.12.67-.28.98-.32l3-2.5c.19-.31.08-.77-.2-.98l-2.5 2.5c-.23.23-.53.35-.87.35S17 4.02 17 3.5zM7.5 9.5c0-.32-.13-.62-.35-.87l2.5 2.5c-.03.27-.05.55-.05.83v.c.35-.12.67-.28.98-.32l3-2.5c.19-.31.08-.77-.2-.98l-2.5 2.5c-.23.23-.53.35-.87.35S7 10.02 7 9.5zM12 15.5c0 .32.13.62.35.87l-2.5-2.5c-.03-.27-.05-.55-.05-.83v-c.35.12-.67.28-.98.32l-3 2.5c.19-.31.08-.77.2.98l2.5-2.5c.23-.23-.53.35-.87.35S7 16.02 6 15.5 6.35 15 6.5 15zM18.5 9.5c0 .32-.13.62-.35.87l-2.5 2.5c-.03.27-.05.55-.05.83v.35-.12.67.28.98-.32l-3-2.5c.19-.31.08-.77.2-.98l2.5 2.5c.23-.23.35-.53.35-.85S18 10.02 18 9.5 17.65 9 18 9.5z" />
                </svg>
              )}
            </button>
            <button
              onClick={() => audioSetState((prev) => ({ ...prev, musicEnabled: !prev.musicEnabled }))}
              className={`rounded-md p-2 transition-colors ${
                audioState.musicEnabled ? 'hover:bg-[var(--surface)]' : 'hover:bg-[var(--accent-cyan)]/20'
              }`}
              aria-label={audioState.musicEnabled ? t('disableMusic') : t('enableMusic')}
              title={audioState.musicEnabled ? t('disableMusic') : t('enableMusic')}
            >
              {audioState.musicEnabled ? (
                <svg
                  className="h-5 w-5 text-[var(--muted)]"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M17.5 3.5c0-.32-.13-.62-.35-.87l2.5 2.5c-.03.27-.05.55-.05.83v.c.35-.12.67-.28.98-.32l3-2.5c.19-.31.08-.77-.2-.98l-2.5 2.5c-.23.23-.53.35-.87.35S17 4.02 17 3.5z" />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5 text-[var(--accent-cyan)]"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M16.5 1A15.5 15.5 0 0 1 22 5.5c0 .87-.13 1.75-.37 2.63l.03.04c.03.17.05.35.05.55a8.65 8.65 0 0 1-.89 3.03l-.42.36c.02.03-.05.06-.08.08a4.5 4.5 0 0 1 1.28 1.29l.38.42c.05.05.08.08.08.13a5.58 5.58 0 0 0 .22.31l.04.03c.05.03.09.07.12.12a7.56 7.56 0 0 1-.59 2.6l-.32-.2c-.17-.13-.37-.32-.57-.57l-.42-.42c-.05-.05-.08-.08-.12-.12a4.51 4.51 0 0 0-.31-.13l-.03-.04c-.03-.05-.05-.1-.08-.15a12.36 12.36 0 0 0-.26-.36l-.41-.41c-.05-.05-.08-.08-.12-.12a9.64 9.64 0 0 1-.18-.33l-.03-.04c-.03-.05-.06-.1-.09-.15a6.63 6.63 0 0 0-.27-.37l-.03-.04c-.03-.06-.05-.12-.05-.19a15.13 15.13 0 0 1 .71-5.05l.04-.03c.05-.03.09-.07.12-.12a8.52 8.52 0 0 1 1.57-1.56l.37-.36c.05-.05.08-.08.12-.12.05-.05.08-.1.08-.16zM6.5 11c0 .32-.13.62-.35.87l2.5 2.5c.03.27.05.55.05.83v.c-.35.12-.67.28-.98.32L9.5 15.5c.19.31.08.77.2.98l2.5-2.5c.23-.23.53.35-.87.35S6 16.02 6 15.5 6.35 15 6.5 15zM18.5 9.5c0 .32-.13.62-.35.87l-2.5 2.5c-.03.27-.05.55-.05.83v.35-.12.67.28.98-.32l-3-2.5c.19-.31.08-.77.2-.98l2.5 2.5c.23-.23.35-.53.35-.85S18 10.02 18 9.5 17.65 9 18 9.5z" />
                </svg>
              )}
            </button>
            <button
              onClick={() => audioSetState((prev) => ({ ...prev, sfxEnabled: !prev.sfxEnabled }))}
              className={`rounded-md p-2 transition-colors ${
                audioState.sfxEnabled ? 'hover:bg-[var(--surface)]' : 'hover:bg-[var(--accent-cyan)]/20'
              }`}
              aria-label={audioState.sfxEnabled ? t('disableSFX') : t('enableSFX')}
              title={audioState.sfxEnabled ? t('disableSFX') : t('enableSFX')}
            >
              {audioState.sfxEnabled ? (
                <svg
                  className="h-5 w-5 text-[var(--muted)]"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M17.5 3.5c0-.32-.13-.62-.35-.87l2.5 2.5c-.03.27-.05.55-.05.83v.c.35-.12.67-.28.98-.32l3-2.5c.19-.31.08-.77-.2-.98l-2.5 2.5c-.23.23-.53.35-.87.35S17 4.02 17 3.5z" />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5 text-[var(--accent-cyan)]"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M16.5 1A15.5 15.5 0 0 1 22 5.5c0 .87-.13 1.75-.37 2.63l.03.04c.03.17.05.35.05.55a8.65 8.65 0 0 1-.89 3.03l-.42.36c.02.03-.05.06-.08.08a4.5 4.5 0 0 1 1.28 1.29l.38.42c.05.05.08.08.08.13a5.58 5.58 0 0 0 .22.31l.04.03c.05.03.09.07.12.12a7.56 7.56 0 0 1-.59 2.6l-.32-.2c-.17-.13-.37-.32-.57-.57l-.42-.42c-.05-.05-.08-.08-.12-.12a4.51 4.51 0 0 0-.31-.13l-.03-.04c-.03-.05-.05-.1-.08-.15a12.36 12.36 0 0 0-.26-.36l-.41-.41c-.05-.05-.08-.08-.12-.12a9.64 9.64 0 0 1-.18-.33l-.03-.04c-.03-.05-.06-.1-.09-.15a6.63 6.63 0 0 0-.27-.37l-.03-.04c-.03-.06-.05-.12-.05-.19a15.13 15.13 0 0 1 .71-5.05l.04-.03c.05-.03.09-.07.12-.12a8.52 8.52 0 0 1 1.57-1.56l.37-.36c.05-.05.08-.08.12-.12.05-.05.08-.1.08-.16zM6.5 11c0 .32-.13.62-.35.87l2.5 2.5c.03.27.05.55.05.83v.c-.35.12-.67.28-.98.32L9.5 15.5c.19.31.08.77.2.98l2.5-2.5c.23-.23.53.35-.87.35S6 16.02 6 15.5 6.35 15 6.5 15zM18.5 9.5c0 .32-.13.62-.35.87l-2.5 2.5c-.03.27-.05.55-.05.83v.35-.12.67.28.98-.32l-3-2.5c.19-.31.08-.77.2-.98l2.5 2.5c.23-.23.35-.53.35-.85S18 10.02 18 9.5 17.65 9 18 9.5z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <footer className="border-t border-[var(--border)] py-4 text-center text-xs text-[var(--muted)]">
        {t('footerVersion')}
      </footer>
    </div>
  );
}