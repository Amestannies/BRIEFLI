import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import type { Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(data: {
    firmName: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictException('Email already registered');

    const slug = data.firmName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const firm = await this.prisma.firm.create({ data: { name: data.firmName, slug } });

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await this.prisma.user.create({
      data: {
        firmId: firm.id,
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: 'ADMIN',
      },
    });

    return { userId: user.id, firmId: firm.id };
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return user;
  }

  async login(
    data: { email: string; password: string; mfaCode?: string },
    res: Response,
  ) {
    const user = await this.validateUser(data.email, data.password);

    if (user.mfaEnabled) {
      if (!data.mfaCode) throw new UnauthorizedException('MFA code required');
      const valid = authenticator.verify({ token: data.mfaCode, secret: user.mfaSecret ?? '' });
      if (!valid) throw new UnauthorizedException('Invalid MFA code');
    }

    const payload = { sub: user.id, firmId: user.firmId, role: user.role };
    const accessToken = this.jwt.sign(payload);
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: '30d',
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return { accessToken };
  }

  async refresh(res: Response) {
    // TODO: implement refresh token rotation
    void res;
    throw new UnauthorizedException('Not implemented');
  }

  async logout(res: Response) {
    res.clearCookie('refresh_token');
    return { success: true };
  }

  async forgotPassword(email: string) {
    // TODO: generate reset token, send email via Resend
    void email;
    return { success: true };
  }

  async resetPassword(data: { token: string; password: string }) {
    // TODO: validate token, update password
    void data;
    return { success: true };
  }

  async mfaSetup(userId: string) {
    const secret = authenticator.generateSecret();
    await this.prisma.user.update({ where: { id: userId }, data: { mfaSecret: secret } });
    const otpauth = authenticator.keyuri(userId, 'Briefli', secret);
    return { secret, otpauth };
  }

  async mfaVerify(userId: string, code: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const valid = authenticator.verify({ token: code, secret: user.mfaSecret ?? '' });
    if (!valid) throw new UnauthorizedException('Invalid MFA code');
    await this.prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
    return { success: true };
  }
}
