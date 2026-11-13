// Types partagés front (miroir du schéma Prisma / API). Source de vérité : apps/api/prisma/schema.prisma

export type UserStatus = 'LIMITED' | 'ACTIVE' | 'BANNED' | 'PENDING_DELETION';

export interface User {
  id: string;
  email: string;
  pseudo: string;
  status: UserStatus;
  preferredLanguage: 'javascript' | 'python';
  theme: 'dark' | 'light';
  soundEnabled: boolean;
  emailVerified: boolean;
  createdAt: string;
  roles?: string[];
}

export type ChallengeType = 'SORT' | 'DEBUG' | 'DECRYPT' | 'STEGANO' | 'QR';
export type ChallengeStatus = 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';

export interface Theme {
  id: string;
  name: string;
  slug: string;
  description?: string;
  order: number;
}

export interface Challenge {
  id: string;
  themeId: string;
  theme?: { slug: string; name: string };
  type: ChallengeType;
  difficulty: number;
  title: string;
  slug: string;
  statement: string;
  basePoints: number;
  perfMax: number;
  tOpt?: number | null;
  tMax?: number | null;
  tags: string[];
  status: ChallengeStatus;
  order: number;
}

export interface Submission {
  id: string;
  challengeId: string;
  userId?: string | null;
  teamId?: string | null;
  language: string;
  code: string;
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED';
  cpuTimeMs?: number | null;
  testsPassed: number;
  testsTotal: number;
  score: number;
  isOfficial: boolean;
  output?: string | null;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  tag: string;
  description?: string | null;
  logoUrl?: string | null;
  captainId: string;
  members?: { teamId: string; userId: string; role: 'CAPTAIN' | 'MEMBER'; user: { id: string; pseudo: string } }[];
}

export interface EventItem {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  type: 'STANDARD' | 'BATTLE_ROYALE';
  status: 'DRAFT' | 'SCHEDULED' | 'OPEN' | 'CLOSED' | 'ARCHIVED';
  challengeId?: string | null;
  startsAt: string;
  endsAt: string;
  timezone: string;
  maxAttempts: number;
}

export interface LeaderboardEntry {
  rank: number;
  pseudo?: string;
  score: number;
  challenge?: string;
  theme?: string;
  submittedAt?: string;
}

export interface WalletTx {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
}

export interface Wallet {
  balance: number;
  transactions: WalletTx[];
}

export interface ShopItem {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  price: number;
  category: string;
}

export interface LoreChapter {
  id: string;
  title: string;
  slug: string;
  region: string;
  content: string;
  requiredLevel: number;
  order: number;
}

export interface ApiError {
  code: string;
  message: string;
  details: unknown;
}
