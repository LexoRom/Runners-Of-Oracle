/**
 * Seed du contenu pédagogique depuis docs/content.json (rédigé par le dev B).
 * Usage : npx ts-node prisma/seed-content.ts
 *
 * Format attendu (voir docs/content.json) :
 *   challenges[] : { title, slug, theme, type, difficulty, statement, starterCode, tests[], basePoints, perfMax, tOpt, tMax }
 *   lessons[]    : { title, slug, theme, content, quiz? }
 *   lore[]       : { title, slug, region, content, requiredLevel? }
 *   events[]     : { title, slug, description, type, startsAt, endsAt, challengeSlug? }
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const prisma = new PrismaClient();

async function main() {
  const contentPath = resolve(__dirname, '..', '..', '..', 'docs', 'content.json');
  let content: any;
  try {
    content = JSON.parse(readFileSync(contentPath, 'utf8'));
  } catch (e) {
    console.error('Impossible de lire docs/content.json :', (e as Error).message);
    process.exit(1);
  }

  // ── Défis ─────────────────────────────────────────────────────────────────
  for (const c of content.challenges ?? []) {
    const theme = await prisma.theme.findUnique({ where: { slug: c.theme } });
    if (!theme) { console.warn('Thème introuvable :', c.theme); continue; }

    const challenge = await prisma.challenge.upsert({
      where: { slug: c.slug },
      update: { title: c.title, statement: c.statement, difficulty: c.difficulty, status: 'PUBLISHED' },
      create: {
        themeId: theme.id,
        type: c.type ?? 'SORT',
        difficulty: c.difficulty ?? 1,
        title: c.title,
        slug: c.slug,
        statement: c.statement,
        basePoints: c.basePoints ?? 100,
        perfMax: c.perfMax ?? 50,
        tOpt: c.tOpt ?? null,
        tMax: c.tMax ?? null,
        status: 'PUBLISHED',
      },
    });

    await prisma.challengeVersion.upsert({
      where: { challengeId_version: { challengeId: challenge.id, version: 1 } },
      update: { testsEncrypted: JSON.stringify(c.tests ?? []), starterCode: c.starterCode ?? null },
      create: {
        challengeId: challenge.id,
        version: 1,
        statement: c.statement,
        starterCode: c.starterCode ?? null,
        testsEncrypted: JSON.stringify(c.tests ?? []),
        referenceSolutionEncrypt: c.referenceSolution ?? '',
      },
    });
    console.log('✔ Défi :', c.slug);
  }

  // ── Cours ─────────────────────────────────────────────────────────────────
  for (const l of content.lessons ?? []) {
    const theme = await prisma.theme.findUnique({ where: { slug: l.theme } });
    if (!theme) { console.warn('Thème introuvable :', l.theme); continue; }
    await prisma.lesson.upsert({
      where: { slug: l.slug },
      update: { title: l.title, content: l.content, quiz: l.quiz ?? null },
      create: { themeId: theme.id, title: l.title, slug: l.slug, content: l.content, quiz: l.quiz ?? null, order: l.order ?? 0 },
    });
    console.log('✔ Cours :', l.slug);
  }

  // ── Lore ──────────────────────────────────────────────────────────────────
  for (const ch of content.lore ?? []) {
    await prisma.loreChapter.upsert({
      where: { slug: ch.slug },
      update: { title: ch.title, content: ch.content },
      create: { title: ch.title, slug: ch.slug, region: ch.region ?? 'inconnue', content: ch.content, requiredLevel: ch.requiredLevel ?? 1, order: ch.order ?? 0 },
    });
    console.log('✔ Lore :', ch.slug);
  }

  // ── Events ────────────────────────────────────────────────────────────────
  for (const e of content.events ?? []) {
    const challenge = e.challengeSlug ? await prisma.challenge.findUnique({ where: { slug: e.challengeSlug } }) : null;
    await prisma.event.upsert({
      where: { slug: e.slug },
      update: { title: e.title, status: 'SCHEDULED' },
      create: {
        title: e.title,
        slug: e.slug,
        description: e.description ?? null,
        type: e.type ?? 'STANDARD',
        status: 'SCHEDULED',
        challengeId: challenge?.id ?? null,
        startsAt: new Date(e.startsAt),
        endsAt: new Date(e.endsAt),
        timezone: e.timezone ?? 'Europe/Paris',
        maxAttempts: e.maxAttempts ?? 1,
      },
    });
    console.log('✔ Event :', e.slug);
  }

  console.log('✔ Contenu injecté');
}

main().finally(() => prisma.$disconnect());
