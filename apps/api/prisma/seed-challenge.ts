import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const theme = await prisma.theme.findUnique({ where: { slug: 'tris' } });
  if (!theme) throw new Error('theme tris manquant');

  // Bubble sort challenge
  const bubble = await prisma.challenge.upsert({
    where: { slug: 'tri-a-bulles' },
    update: { status: 'PUBLISHED' },
    create: {
      themeId: theme.id, type: 'SORT', difficulty: 2,
      title: 'Tri à bulles', slug: 'tri-a-bulles',
      statement: 'Implémentez un tri à bulles qui renvoie la liste triée par ordre croissant.',
      basePoints: 200, perfMax: 50, tOpt: 0.5, tMax: 5.0, status: 'PUBLISHED',
    },
  });
  await prisma.challengeVersion.upsert({
    where: { challengeId_version: { challengeId: bubble.id, version: 1 } },
    update: {}, create: {
      challengeId: bubble.id, version: 1,
      starterCode: 'function solve(input) { const arr = [...input]; for (let i = 0; i < arr.length; i++) { for (let j = 0; j < arr.length - 1 - i; j++) { if (arr[j] > arr[j+1]) { [arr[j], arr[j+1]] = [arr[j+1], arr[j]]; } } } return arr; }',
      testsEncrypted: JSON.stringify([
        { input: [3, 1, 2], expected: [1, 2, 3] },
        { input: [], expected: [] },
        { input: [5, 4, 3, 2, 1], expected: [1, 2, 3, 4, 5] },
      ]),
      referenceSolutionEncrypt: 'function solve(input){return [...input].sort((a,b)=>a-b);}',
    },
  });

  // Merge sort challenge
  const merge = await prisma.challenge.upsert({
    where: { slug: 'tri-par-fusion' },
    update: { status: 'PUBLISHED' },
    create: {
      themeId: theme.id, type: 'SORT', difficulty: 3,
      title: 'Tri par fusion', slug: 'tri-par-fusion',
      statement: 'Implémentez un tri par fusion (merge sort) qui renvoie la liste triée par ordre croissant.',
      basePoints: 300, perfMax: 30, tOpt: 1.0, tMax: 8.0, status: 'PUBLISHED',
    },
  });
  await prisma.challengeVersion.upsert({
    where: { challengeId_version: { challengeId: merge.id, version: 1 } },
    update: {}, create: {
      challengeId: merge.id, version: 1,
      starterCode: 'function solve(input) { if (input.length <= 1) return input; const m = Math.floor(input.length / 2); const left = input.slice(0, m); const right = input.slice(m); return merge(solve(left), solve(right)); } function merge(l, r) { const o = []; let i = 0, j = 0; while (i < l.length && j < r.length) { if (l[i] < r[j]) { o.push(l[i]); i++; } else { o.push(r[j]); j++; } } return o.concat(l.slice(i)).concat(r.slice(j)); }',
      testsEncrypted: JSON.stringify([
        { input: [3, 1, 2], expected: [1, 2, 3] },
        { input: [5, 4], expected: [4, 5] },
        { input: [1], expected: [1] },
      ]),
      referenceSolutionEncrypt: 'function solve(input){if(input.length<=1)return input;const m=Math.floor(input.length/2);const left=input.slice(0,m),right=input.slice(m);return merge(solve(left),solve(right))}function merge(l,r){const o=[];let i=0,j=0;while(i<l.length&&j<r.length){if(l[i]<r[j]){o.push(l[i]);i++}else{o.push(r[j]);j++}}return o.concat(l.slice(i)).concat(r.slice(j))}',
    },
  });

  // Debug challenge: infinite loop
  const debug = await prisma.challenge.upsert({
    where: { slug: 'boucle-infinie' },
    update: { status: 'PUBLISHED' },
    create: {
      themeId: theme.id, type: 'DEBUG', difficulty: 1,
      title: 'Boucle infinie', slug: 'boucle-infinie',
      statement: 'Le code contient une erreur de logique (boucle infinie). Corrigez-le.',
      basePoints: 150, perfMax: 0, status: 'PUBLISHED',
    },
  });
  await prisma.challengeVersion.upsert({
    where: { challengeId_version: { challengeId: debug.id, version: 1 } },
    update: {}, create: {
      challengeId: debug.id, version: 1,
      starterCode: 'function solve(input) { const arr = [...input]; let i = 0; while (i < arr.length) { for (let j = 0; j < arr.length - 1; j++) { if (arr[j] > arr[j+1]) { [arr[j], arr[j+1]] = [arr[j+1], arr[j]]; } } i++; return arr; }',
      testsEncrypted: JSON.stringify([
        { input: [3, 1, 2], expected: [1, 2, 3] },
        { input: [5, 4, 3], expected: [3, 4, 5] },
      ]),
      referenceSolutionEncrypt: 'function solve(input){const a=[...input];let i=0;while(i<a.length){for(let j=0;j<a.length-1;j++){if(a[j]>a[j+1])[a[j],a[j+1]]=[a[j+1],a[j]];}i++;return a}',
    },
  });

  // Lesson: Bubble sort
  await prisma.lesson.upsert({
    where: { slug: 'lecon-tri-a-bulles' },
    update: {},
    create: {
      themeId: theme.id, title: 'Le tri à bulles', slug: 'lecon-tri-a-bulles',
      content: 'Le tri à bulles est un algorithme de tri simple qui fonctionne en parcourant plusieurs fois la liste. À chaque passage, on compare les éléments adjacents et on les échange s\\'ils sont dans le mauvais ordre. La plus grande "bulle" monte à la fin à chaque passage. Complexité : O(n²) dans le pire et le cas moyen, O(n) dans le meilleur cas (liste déjà triée).',
      quiz: [{ question: 'Complexité du tri à bulles ?', options: ['O(n)', 'O(n log n)', 'O(n²)'], answer: 2 }],
      order: 1,
    },
  });

  // Lesson: Merge sort
  await prisma.lesson.upsert({
    where: { slug: 'lecon-tri-par-fusion' },
    update: {},
    create: {
      themeId: theme.id, title: 'Tri par fusion', slug: 'lecon-tri-par-fusion',
      content: 'Le tri par fusion (merge sort) utilise la stratégie "diviser pour régner". On divise la liste en deux moitiés, on trie récursivement chaque moitié, puis on fusionne les deux listes triées en une seule liste triée. Complexité : O(n log n) dans tous les cas.',
      quiz: [{ question: 'Complexité du tri par fusion ?', options: ['O(n)', 'O(n log n)', 'O(n²)'], answer: 1 }],
      order: 2,
    },
  });

  // Error finding challenge
  const error = await prisma.challenge.upsert({
    where: { slug: 'erreur-logique' },
    update: { status: 'PUBLISHED' },
    create: {
      themeId: theme.id, type: 'DEBUG', difficulty: 2,
      title: 'Trouver l\'erreur', slug: 'erreur-logique',
      statement: 'Le code suivant ne trie pas correctement. Trouvez et corrigez l\\'erreur de logique.',
      basePoints: 180, perfMax: 0, status: 'PUBLISHED',
    },
  });
  await prisma.challengeVersion.upsert({
    where: { challengeId_version: { challengeId: error.id, version: 1 } },
    update: {}, create: {
      challengeId: error.id, version: 1,
      starterCode: 'function solve(input) { const arr = [...input]; for (let i = 0; i < arr.length; i++) { for (let j = 0; j < arr.length - 1; j++) { if (arr[j] > arr[j+1]) { [arr[j], arr[j+1]] = [arr[j+1], arr[j]]; } } } return arr; }',
      testsEncrypted: JSON.stringify([
        { input: [3, 1, 2], expected: [1, 2, 3] },
        { input: [5, 4, 3], expected: [3, 4, 5] },
      ]),
      referenceSolutionEncrypt: 'function solve(input){const a=[...input];for(let i=0;i<a.length;i++){for(let j=0;j<a.length-1-i;j++){if(a[j]>a[j+1])[a[j],a[j+1]]=[a[j+1],a[j]];}}return a}',
    },
  });

  console.log('Tous les défis et leçons ont été créés !');
}

main().finally(() => prisma.$disconnect());