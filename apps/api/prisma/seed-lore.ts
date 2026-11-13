import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const chapters = [
    { title: 'ORACLE corrompue', slug: 'oracle-corrompue', region: 'dedale-des-tris', content: 'Dans un futur proche, ORACLE, l IA qui gere le Reseau mondial, a ete corrompue. Vous etes des Runners.', requiredLevel: 1, order: 1 },
    { title: 'Le Dedale des Tris', slug: 'dedale-des-tris', region: 'dedale-des-tris', content: 'Le Dedale des Tris est la premiere region du Reseau. Les algorithmes de tri y sont eprouves.', requiredLevel: 1, order: 2 },
  ];
  for (const c of chapters) {
    await prisma.loreChapter.upsert({ where: { slug: c.slug }, update: {}, create: c });
    console.log('Chapitre cree :', c.slug);
  }
}

main().finally(() => prisma.$disconnect());
