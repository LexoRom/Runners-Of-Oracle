import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const port = Number(process.env.API_PORT ?? 3000);
  const origins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',');

  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.enableCors({ origin: origins, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());

  // OpenAPI 3 (§7) généré depuis le code
  const config = new DocumentBuilder()
    .setTitle('CodeQuest API')
    .setDescription(
      'Plateforme de défis informatiques — API REST v1. Pagination par curseur, ' +
        'format d’erreur unique { code, message, details }, idempotence via Idempotency-Key.',
    )
    .setVersion('1.0.0')
    .addCookieAuth('cq_access', { type: 'apiKey', in: 'cookie' })
    .addTag('Auth', 'Inscription, connexion, sessions, mot de passe')
    .addTag('Utilisateur', 'Profil, RGPD')
    .addTag('Défis', 'Catalogue, soumissions')
    .addTag('Classements', 'Joueurs, équipes, events')
    .addTag('Équipes', 'Création, membres, capitaine')
    .addTag('Events', 'Inscriptions et essais uniques')
    .addTag('Économie', 'Portefeuille, boutique')
    .addTag('Lore', 'Chapitres et progression')
    .addTag('Admin', 'Administration et audit')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, { jsonDocumentUrl: 'api/docs-json' });

  await app.listen(port);
  Logger.log(`API prête : http://localhost:${port}/api/v1 — Swagger : http://localhost:${port}/api/docs`, 'Bootstrap');
}

bootstrap();
