import { IsEmail, IsString, Length, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'runner@codequest.local' })
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  email: string;

  @ApiProperty({ example: 'runner', minLength: 3, maxLength: 20 })
  @Length(3, 20, { message: 'Le pseudo doit contenir entre 3 et 20 caractères' })
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'Le pseudo ne peut contenir que lettres, chiffres, - et _' })
  pseudo: string;

  @ApiProperty({ example: 'CodeQuest2026!', minLength: 12 })
  @MinLength(12, { message: 'Le mot de passe doit contenir au moins 12 caractères' })
  password: string;
}

export class LoginDto {
  @ApiProperty({ example: 'runner', description: 'E-mail ou pseudo' })
  @IsString()
  identifier: string;

  @ApiProperty({ example: 'CodeQuest2026!' })
  @IsString()
  password: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'runner@codequest.local' })
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty({ minLength: 12 })
  @MinLength(12, { message: 'Le mot de passe doit contenir au moins 12 caractères' })
  password: string;
}

export class VerifyEmailDto {
  @ApiProperty()
  @IsString()
  token: string;
}

export class UpdateProfileDto {
  @ApiProperty({ required: false })
  @Length(3, 20)
  pseudo?: string;

  @ApiProperty({ required: false, enum: ['javascript', 'python'] })
  preferredLanguage?: string;

  @ApiProperty({ required: false, enum: ['dark', 'light'] })
  theme?: string;

  @ApiProperty({ required: false })
  soundEnabled?: boolean;
}
