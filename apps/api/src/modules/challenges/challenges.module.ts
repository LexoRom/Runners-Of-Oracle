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
  @ApiOperation({ summary: 'Lister les défis (filtres : theme, difficulty, status, type)' })
  list(@Query() query: ChallengeFilterDto) {
    return this.prisma.challenge.findMany({
      where: {
        ...(query.status ? { status: query.status as any } : { status: 'PUBLISHED' }),
        ...(query.theme ? { theme: { slug: query.theme } } : {}),
        ...(query.difficulty ? { difficulty: query.difficulty } : {}),
        ...(query.type ? { type: query.type as any } : {}),
      },
      include: { theme: { select: { slug: true, name: true } } },
      orderBy: [{ theme: { order: 'asc' } }, { order: 'asc' }],
    });
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
