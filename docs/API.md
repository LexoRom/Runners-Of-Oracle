# CodeQuest — API REST v1

Base URL : `/api/v1` · Swagger UI : `/api/docs` · OpenAPI JSON : `/api/docs-json`

Format d'erreur unique : `{ "code": string, "message": string, "details": any }`.

## Auth
| Méthode | Chemin | Description |
|---|---|---|
| POST | `/auth/register` | Inscription (e-mail, pseudo, mot de passe ≥ 12) |
| POST | `/auth/login` | Connexion — pose les cookies `cq_access` / `cq_refresh` |
| POST | `/auth/refresh` | Rotation du refresh token |
| POST | `/auth/logout` | Révoque la session courante |
| POST | `/auth/forgot-password` | Demande de réinitialisation |
| POST | `/auth/reset-password` | Réinitialise le mot de passe |
| POST | `/auth/verify-email` | Confirme l’adresse e-mail |

## Utilisateur
| GET | `/me` | Profil |
| PATCH | `/me` | Modifier le profil |
| DELETE | `/me` | Suppression logique (30 j) |
| GET | `/me/export` | Export RGPD |
| GET | `/me/sessions` | Sessions actives |
| DELETE | `/me/sessions/:id` | Révoquer une session |
| GET | `/me/wallet` | Solde + transactions |

## Défis
| GET | `/challenges` | Liste (filtres `theme`, `difficulty`, `status`, `type`) |
| GET | `/challenges/:slug` | Détail (tests cachés jamais renvoyés) |
| POST | `/challenges/:id/submissions` | Soumettre une solution |
| GET | `/submissions/:id` | Résultat d’une soumission |

## Cours
| GET | `/lessons` | Liste |
| POST | `/lessons/:id/complete` | Marquer comme terminé |

## Classements
| GET | `/leaderboards/players` | Joueurs (`?theme=`, `?limit=`) |
| GET | `/leaderboards/teams` | Équipes |
| GET | `/leaderboards/events/:id` | Event |

## Équipes
| POST | `/teams` | Créer |
| GET | `/teams/:id` | Détail + membres |
| POST | `/teams/:id/invitations` | Inviter par pseudo |
| DELETE | `/teams/:id/members/:userId` | Exclure / quitter |

## Events
| GET | `/events` | Liste |
| GET | `/events/:id` | Détail |
| POST | `/events/:id/join` | Rejoindre |
| POST | `/events/:id/start` | Démarrer l’essai (1 seul) |

## Économie
| GET | `/shop` | Boutique |
| POST | `/shop/:itemId/purchase` | Acheter (idempotent) |

## Lore
| GET | `/lore/chapters` | Chapitres |
| POST | `/lore/chapters/:id/read` | Marquer comme lu |

## Admin (rôle ADMINISTRATEUR)
| GET | `/admin/users` | Utilisateurs |
| GET | `/admin/audit-logs` | Journal d’audit |
| POST | `/challenges` | Créer un défi |

## Transverses
- Rate limiting par IP et par compte (plus strict sur login, reset, soumissions).
- Idempotence : en-tête `Idempotency-Key` sur achats et soumissions.
- Permissions vérifiées par garde RBAC sur chaque route.
- Sessions : cookies HttpOnly `cq_access` (15 min) + `cq_refresh` (30 j, rotation).
