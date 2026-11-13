import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ChallengesModule } from './modules/challenges/challenges.module';
import { SubmissionsModule } from './modules/submissions/submissions.module';
import { LeaderboardsModule } from './modules/leaderboards/leaderboards.module';
import { TeamsModule } from './modules/teams/teams.module';
import { EventsModule } from './modules/events/events.module';
import { EconomyModule } from './modules/economy/economy.module';
import { LoreModule } from './modules/lore/lore.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ChallengesModule,
    SubmissionsModule,
    LeaderboardsModule,
    TeamsModule,
    EventsModule,
    EconomyModule,
    LoreModule,
    LessonsModule,
    AdminModule,
  ],
})
export class AppModule {}
