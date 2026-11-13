# Changelog

Toutes les modifications notables de ce projet sont documentées ici.
Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le versionnage suit [SemVer](https://semver.org/lang/fr/).

## [0.1.0] - 2026-11-13

### Ajouté
- Socle monorepo (`apps/web`, `apps/api`, `services/runner`, `infra/`, `docs/`).
- Authentification complète (inscription, connexion, refresh rotatif, reset mot de passe, vérification e-mail, Argon2id, cookies HttpOnly).
- RBAC (rôles JOUEUR / MODÉRATEUR / ADMINISTRATEUR) avec garde sur chaque route.
- Défis de tri avec moteur de scoring (base + perf, médiane de 5 exécutions, tolérance ±5 %).
- Classements joueurs et équipes (départage par soumission la plus ancienne).
- Équipes (CRUD, invitations, capitaine, soumission officielle).
- Events à essai unique (plage horaire, statuts, chrono, classement dédié).
- Monnaie virtuelle « Bits » sur registre idempotent.
- Boutique et inventaire.
- Lore et cours (modèles, endpoints).
- Administration et journal d'audit.
- Conteneurisation (Dockerfiles multi-stage non-root + HEALTHCHECK, docker-compose, nginx SPA).
- CI (lint, types, tests, build, gitleaks, npm audit).
- Base PostgreSQL 16 + migrations Prisma + seed.
- Runner sandbox (JS via node:vm, Python via subprocess).
- Rate limiting global (throttler) + limites strictes sur login/register.
- Tests unitaires du moteur de scoring (9 tests, Vitest).
- Script de seed de contenu (`seed-content.ts`).
- Documentation API (OpenAPI 3 / Swagger).

### Modifié
- Aucun (version initiale).

### Corrigé
- Aucun.

[0.1.0]: https://github.com/LexoRom/Runners-Of-Oracle/releases/tag/v0.1.0
