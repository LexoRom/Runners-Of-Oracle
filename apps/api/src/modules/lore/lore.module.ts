import {
  Controller,
  Get,
  Module,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.module';
import { AuthUser, CurrentUser, JwtAuthGuard } from '../../common';

@ApiTags('Lore')
@Controller('lore')
export class LoreController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('chapters')
  @ApiOperation({ summary: 'Lister les chapitres du lore (déblocage par niveau)' })
  chapters() {
    return this.prisma.loreChapter.findMany({ orderBy: { order: 'asc' } });
  }

  @UseGuards(JwtAuthGuard)
  @Post('chapters/:id/read')
  @ApiOperation({ summary: 'Marquer un chapitre comme lu' })
  async read(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.prisma.loreProgress.upsert({
      where: { userId_chapterId: { userId: user.sub, chapterId: id } },
      update: { readAt: new Date() },
      create: { userId: user.sub, chapterId: id },
    });
    return { message: 'Chapitre marqué comme lu' };
  }
}

@Module({ controllers: [LoreController] })
export class LoreModule {}
