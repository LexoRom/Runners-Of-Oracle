# CodeQuest — Plateforme de défis informatiques

Monorepo conforme à la spécification fonctionnelle et technique (v1.0).

## Démarrage rapide

```bash
# 1. Infrastructure (PostgreSQL, Redis, MinIO, MailHog)
npm run infra:up

# 2. Variables d'environnement
cp .env.example apps/api/.env   # puis éditer si besoin

# 3. Base de données
npm run db:generate
npm run db:migrate
npm run db:seed

# 4. API + Front (2 terminaux)
npm run dev:api
npm run dev:web
```

- API : http://localhost:3000/api/v1
- Swagger : http://localhost:3000/api/docs
- Front : http://localhost:5173
- MailHog : http://localhost:8025

Comptes de démonstration (mot de passe `CodeQuest2026!`) :
- `admin@codequest.local` (rôle ADMINISTRATEUR)
- `runner@codequest.local` (rôle JOUEUR, 250 Bits)

## Structure

```
apps/api        NestJS + Prisma + Swagger + Socket.IO
apps/web        Vite + React + TS + Tailwind + Monaco
services/runner Node + Dockerode (sandbox JS/Python)
infra/          nginx, init.sql
docs/           API.md, content.json, ADR
```

## Périmètre v1

Must + Should. Hors périmètre (Could) : boss et points de vie, stéganographie, QR codes cachés, chat textuel/vocal, battle royale, PWA complète, édition collaborative temps réel, app native.

## Tests

```bash
npm run test -w @codequest/api
```

## Conteneurisation

```bash
docker compose build
docker compose up -d
```
