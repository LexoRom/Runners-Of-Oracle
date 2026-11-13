import {
  Body,
  Controller,
  Get,
  Module,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PrismaService } from '../../prisma/prisma.module';
import { AuthUser, CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../../common';

class ChallengeFilterDto {
  @IsOptional() @IsString() theme?: string;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) difficulty?: number;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() type?: string;
}

@ApiTags('Défis')
@Controller('challenges')
export class ChallengesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les défis (filtres + pagination par curseur)' })
  async list(@Query() query: ChallengeFilterDto & { cursor?: string; limit?: string }) {
    const take = Math.min(Number(query.limit) || 20, 100);
    const cursor = query.cursor ? JSON.parse(Buffer.from(query.cursor, 'base64').toString()) : null;

    const where: any = {
      ...(query.status ? { status: query.status as any } : { status: 'PUBLISHED' }),
      ...(query.theme ? { theme: { slug: query.theme } } : {}),
      ...(query.difficulty ? { difficulty: query.difficulty } : {}),
      ...(query.type ? { type: query.type as any } : {}),
      ...(cursor ? { id: { gt: cursor.id } } : {}),
    };

    const items = await this.prisma.challenge.findMany({
      where,
      include: { theme: { select: { slug: true, name: true } } },
      orderBy: { id: 'asc' },
      take: take + 1,
    });

    const hasMore = items.length > take;
    const data = hasMore ? items.slice(0, take) : items;
    const nextCursor = hasMore
      ? Buffer.from(JSON.stringify({ id: data[data.length - 1].id })).toString('base64')
      : null;

    return { data, nextCursor };
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Détail d’un défi (tests cachés jamais renvoyés)' })
  async detail(@Param('slug') slug: string) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { slug },
      include: { theme: true, versions: { orderBy: { version: 'desc' }, take: 1 } },
    });
    if (!challenge) throw new (require('@nestjs/common').NotFoundException)('Défi introuvable');
    // On ne renvoie jamais les tests ni la solution de référence (§8, §9)
    const { testsEncrypted: _t, referenceSolutionEncrypt: _r, ...version } = challenge.versions[0] ?? ({} as any);
    return { ...challenge, version };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMINISTRATEUR')
  @Post()
  @ApiOperation({ summary: 'Créer un défi (admin)' })
  create(@Body() body: any) {
    return this.prisma.challenge.create({ data: body });
  }
}

@Module({ controllers: [ChallengesController] })
export class ChallengesModule {}
