import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Module,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.module';
import { AuthUser, CurrentUser, JwtAuthGuard } from '../../common';
import type { Request } from 'express';

@ApiTags('Économie')
@Controller()
export class EconomyController {
  constructor(private readonly prisma: PrismaService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me/wallet')
  @ApiOperation({ summary: 'Solde et historique des transactions' })
  async wallet(@CurrentUser() user: AuthUser) {
    const w = await this.prisma.wallet.findUnique({
      where: { userId: user.sub },
      include: { transactions: { orderBy: { createdAt: 'desc' }, take: 50 } },
    });
    if (!w) throw new NotFoundException();
    return { balance: w.balance, transactions: w.transactions };
  }

  @Get('shop')
  @ApiOperation({ summary: 'Boutique' })
  shop() {
    return this.prisma.shopItem.findMany({ orderBy: { price: 'asc' } });
  }

  @UseGuards(JwtAuthGuard)
  @Post('shop/:itemId/purchase')
  @HttpCode(200)
  @ApiOperation({ summary: 'Acheter un objet (idempotent via Idempotency-Key)' })
  async purchase(@CurrentUser() user: AuthUser, @Param('itemId') itemId: string, @Req() req: Request) {
    const key = (req.headers['idempotency-key'] as string) || `purchase:${user.sub}:${itemId}:${Date.now()}`;
    const existing = await this.prisma.transaction.findUnique({ where: { idempotencyKey: key } });
    if (existing) return { status: 'already_processed', idempotencyKey: key };

    const item = await this.prisma.shopItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Objet introuvable');

    const wallet = await this.prisma.wallet.findUnique({ where: { userId: user.sub } });
    if (!wallet) throw new NotFoundException();
    if (wallet.balance < item.price) {
      throw new BadRequestException({ code: 'insufficient_funds', message: 'Solde insuffisant' });
    }

    await this.prisma.$transaction([
      this.prisma.transaction.create({
        data: { walletId: wallet.id, amount: -item.price, reason: 'SHOP_PURCHASE', idempotencyKey: key, metadata: { itemId: item.id } },
      }),
      this.prisma.wallet.update({ where: { id: wallet.id }, data: { balance: { decrement: item.price } } }),
      this.prisma.inventoryItem.upsert({
        where: { userId_shopItemId: { userId: user.sub, shopItemId: item.id } },
        update: { quantity: { increment: 1 } },
        create: { userId: user.sub, shopItemId: item.id, quantity: 1 },
      }),
    ]);

    return { status: 'purchased', item: item.slug, newBalance: wallet.balance - item.price };
  }
}

@Module({ controllers: [EconomyController] })
export class EconomyModule {}
