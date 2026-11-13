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

@ApiTags('Cours')
@Controller('lessons')
export class LessonsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les cours' })
  list() {
    return this.prisma.lesson.findMany({ include: { theme: { select: { slug: true, name: true } } }, orderBy: { order: 'asc' } });
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/complete')
  @ApiOperation({ summary: 'Marquer un cours comme terminé' })
  async complete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: user.sub, lessonId: id } },
      update: { completedAt: new Date() },
      create: { userId: user.sub, lessonId: id },
    });
    return { message: 'Cours marqué comme terminé' };
  }
}

@Module({ controllers: [LessonsController] })
export class LessonsModule {}
