import type { ApiError } from '@/types';

const BASE = '/api/v1';

export class ApiClientError extends Error {
  code: string;
  details: unknown;
  status: number;
  constructor(status: number, err: ApiError) {
    super(err.message);
    this.code = err.code;
    this.details = err.details;
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    let err: ApiError = { code: 'error', message: res.statusText, details: null };
    try { err = await res.json(); } catch {}
    throw new ApiClientError(res.status, err);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string; db: string }>('/health'),
  register: (body: { email: string; pseudo: string; password: string }) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { identifier: string; password: string }) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/me'),
  updateMe: (body: unknown) => request('/me', { method: 'PATCH', body: JSON.stringify(body) }),
  exportMe: () => request('/me/export'),
  challenges: (q?: Record<string, string>) => request(`/challenges${q ? '?' + new URLSearchParams(q) : ''}`),
  challenge: (slug: string) => request(`/challenges/${slug}`),
  submit: (challengeId: string, body: { language: string; code: string; teamId?: string }) =>
    request(`/challenges/${challengeId}/submissions`, { method: 'POST', body: JSON.stringify(body) }),
  submission: (id: string) => request(`/submissions/${id}`),
  leaderboardsPlayers: (q?: Record<string, string>) => request(`/leaderboards/players${q ? '?' + new URLSearchParams(q) : ''}`),
  leaderboardsTeams: () => request('/leaderboards/teams'),
  teams: () => request('/teams'),
  team: (id: string) => request(`/teams/${id}`),
  createTeam: (body: { name: string; tag: string; description?: string }) =>
    request('/teams', { method: 'POST', body: JSON.stringify(body) }),
  invite: (teamId: string, pseudo: string) =>
    request(`/teams/${teamId}/invitations`, { method: 'POST', body: JSON.stringify({ pseudo }) }),
  events: () => request('/events'),
  event: (id: string) => request(`/events/${id}`),
  joinEvent: (id: string, teamId?: string) =>
    request(`/events/${id}/join`, { method: 'POST', body: JSON.stringify({ teamId }) }),
  startEvent: (id: string, teamId?: string) =>
    request(`/events/${id}/start`, { method: 'POST', body: JSON.stringify({ teamId }) }),
  wallet: () => request('/me/wallet'),
  shop: () => request('/shop'),
  purchase: (itemId: string, key?: string) =>
    request(`/shop/${itemId}/purchase`, { method: 'POST', headers: key ? { 'Idempotency-Key': key } : {} }),
  lore: () => request('/lore/chapters'),
  readChapter: (id: string) => request(`/lore/chapters/${id}/read`, { method: 'POST' }),
  lessons: () => request('/lessons'),
};
