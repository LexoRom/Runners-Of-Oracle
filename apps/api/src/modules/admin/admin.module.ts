import {
  Controller,
  Get,
  Module,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.module';
import { JwtAuthGuard, Roles, RolesGuard } from '../../common';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMINISTRATEUR')
  @Get('users')
  @ApiOperation({ summary: 'Lister les utilisateurs (admin)' })
  users() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, pseudo: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMINISTRATEUR')
  @Get('audit-logs')
  @ApiOperation({ summary: 'Journal d’audit (admin)' })
  auditLogs() {
    return this.prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  }
}

@Module({ controllers: [AdminController] })
export class AdminModule {}
