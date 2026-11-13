/**
 * Seed minimal de la vague 0 : RBAC, thématiques, boutique, comptes de démo.
 * Le contenu pédagogique (défis, leçons, lore, events) est injecté à la vague 3
 * depuis docs/content.json (rédigé par le dev B).
 */
import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';

const prisma = new PrismaClient();

const PERMISSIONS = [
  { name: 'challenge:read', label: 'Consulter les défis' },
  { name: 'challenge:write', label: 'Créer et modifier les défis' },
  { name: 'challenge:submit', label: 'Soumettre une solution' },
  { name: 'user:ban', label: 'Bannir un utilisateur' },
  { name: 'chat:moderate', label: 'Modérer le chat' },
  { name: 'admin:all', label: 'Administration complète' },
];

const ROLES = [
  { name: 'JOUEUR', label: 'Joueur', permissions: ['challenge:read', 'challenge:submit'] },
  { name: 'MODERATEUR', label: 'Modérateur', permissions: ['challenge:read', 'challenge:submit', 'chat:moderate', 'user:ban'] },
  { name: 'ADMINISTRATEUR', label: 'Administrateur', permissions: ['challenge:read', 'challenge:write', 'challenge:submit', 'chat:moderate', 'user:ban', 'admin:all'] },
];

const THEMES = [
  { name: 'Tris et listes', slug: 'tris', order: 1, description: 'Algorithmes de tri, complexité et stabilité.', regionLoreId: 'dedale-des-tris' },
  { name: 'Débogage', slug: 'debogage', order: 2, description: 'Traquer le bug, corriger sans casser.', regionLoreId: 'forge-des-erreurs' },
  { name: 'Cryptographie', slug: 'cryptographie', order: 3, description: 'Déchiffrer César, Vigenère, XOR et substitutions.', regionLoreId: 'crypte-des-chiffres' },
  { name: 'Stéganographie', slug: 'steganographie', order: 4, description: 'Retrouver un message caché dans une image.', regionLoreId: 'atelier-des-fantomes' },
  { name: 'QR codes', slug: 'qr-codes', order: 5, description: 'Décoder un QR code dissimulé.', regionLoreId: 'archives-fracturees' },
  { name: 'Boss', slug: 'boss', order: 6, description: 'Les Gardiens corrompus du Réseau.', regionLoreId: 'coeur-doracle' },
];

const SHOP_ITEMS = [
  { slug: 'hint-pack', name: 'Indice', description: 'Révèle un indice sur un défi.', price: 50, category: 'hint' },
  { slug: 'avatar-runner', name: 'Avatar Runner', description: 'Cosmétique de profil.', price: 200, category: 'cosmetic' },
  { slug: 'theme-neon', name: 'Thème Néon', description: 'Thème d’éditeur rétro-futuriste.', price: 300, category: 'cosmetic' },
  { slug: 'title-architecte', name: 'Titre « Architecte »', description: 'Titre affiché sur le profil.', price: 500, category: 'cosmetic' },
];

async function main() {
  console.log('→ Permissions');
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({ where: { name: p.name }, update: { label: p.label }, create: p });
  }

  console.log('→ Rôles');
  for (const r of ROLES) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { label: r.label },
      create: { name: r.name, label: r.label },
    });
    for (const permName of r.permissions) {
      const perm = await prisma.permission.findUnique({ where: { name: permName } });
      if (!perm) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
  }

  console.log('→ Thématiques');
  for (const t of THEMES) {
    await prisma.theme.upsert({ where: { slug: t.slug }, update: { name: t.name, order: t.order }, create: t });
  }

  console.log('→ Boutique');
  for (const item of SHOP_ITEMS) {
    await prisma.shopItem.upsert({ where: { slug: item.slug }, update: { price: item.price }, create: item });
  }

  console.log('→ Comptes de démonstration');
  const passwordHash = await hash('CodeQuest2026!');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@codequest.local' },
    update: {},
    create: {
      email: 'admin@codequest.local',
      pseudo: 'oracle',
      passwordHash,
      emailVerifiedAt: new Date(),
      status: 'ACTIVE',
    },
  });
  const adminRole = await prisma.role.findUnique({ where: { name: 'ADMINISTRATEUR' } });
  if (adminRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
      update: {},
      create: { userId: admin.id, roleId: adminRole.id },
    });
  }

  const player = await prisma.user.upsert({
    where: { email: 'runner@codequest.local' },
    update: {},
    create: {
      email: 'runner@codequest.local',
      pseudo: 'runner',
      passwordHash,
      emailVerifiedAt: new Date(),
      status: 'ACTIVE',
    },
  });
  const playerRole = await prisma.role.findUnique({ where: { name: 'JOUEUR' } });
  if (playerRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: player.id, roleId: playerRole.id } },
      update: {},
      create: { userId: player.id, roleId: playerRole.id },
    });
  }
  await prisma.wallet.upsert({
    where: { userId: player.id },
    update: {},
    create: { userId: player.id, balance: 250 },
  });

  console.log('✔ Seed terminé — admin@codequest.local / runner@codequest.local (mot de passe : CodeQuest2026!)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
