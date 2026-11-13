import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const theme = await prisma.theme.findUnique({ where: { slug: 'tris' } });
  if (!theme) throw new Error('theme tris manquant');

  const challenge = await prisma.challenge.upsert({
    where: { slug: 'tri-a-bulles' },
    update: { status: 'PUBLISHED' },
    create: {
      themeId: theme.id,
      type: 'SORT',
      difficulty: 2,
      title: 'Tri à bulles',
      slug: 'tri-a-bulles',
      statement: 'Implémentez un tri à bulles qui renvoie la liste triée par ordre croissant.',
      basePoints: 200,
      perfMax: 50,
      tOpt: 0.5,
      tMax: 5.0,
      status: 'PUBLISHED',
    },
  });

  await prisma.challengeVersion.upsert({
    where: { challengeId_version: { challengeId: challenge.id, version: 1 } },
    update: {},
    create: {
      challengeId: challenge.id,
      version: 1,
      starterCode: 'function solve(input) {\n  const arr = [...input];\n  // votre code\n  return arr;\n}',
      testsEncrypted: JSON.stringify([
        { input: [3, 1, 2], expected: [1, 2, 3] },
        { input: [], expected: [] },
        { input: [5, 4, 3, 2, 1], expected: [1, 2, 3, 4, 5] },
        { input: [1, 2, 3], expected: [1, 2, 3] },
      ]),
      referenceSolutionEncrypt: 'function solve(input){return [...input].sort((a,b)=>a-b);}',
    },
  });

  // Prérequis : aucun (racine)
  console.log('✔ Défi créé :', challenge.slug);
}

main().finally(() => prisma.$disconnect());
