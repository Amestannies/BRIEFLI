"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = require("bcrypt");
const otplib_1 = require("otplib");
const prisma_service_1 = require("../../prisma/prisma.service");
let AuthService = class AuthService {
    constructor(prisma, jwt, config) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.config = config;
    }
    async register(data) {
        const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
        if (existing)
            throw new common_1.ConflictException('Email already registered');
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
    async validateUser(email, password) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user || !user.isActive)
            throw new common_1.UnauthorizedException('Invalid credentials');
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid)
            throw new common_1.UnauthorizedException('Invalid credentials');
        return user;
    }
    async login(data, res) {
        const user = await this.validateUser(data.email, data.password);
        if (user.mfaEnabled) {
            if (!data.mfaCode)
                throw new common_1.UnauthorizedException('MFA code required');
            const valid = otplib_1.authenticator.verify({ token: data.mfaCode, secret: user.mfaSecret ?? '' });
            if (!valid)
                throw new common_1.UnauthorizedException('Invalid MFA code');
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
    async refresh(res) {
        void res;
        throw new common_1.UnauthorizedException('Not implemented');
    }
    async logout(res) {
        res.clearCookie('refresh_token');
        return { success: true };
    }
    async forgotPassword(email) {
        void email;
        return { success: true };
    }
    async resetPassword(data) {
        void data;
        return { success: true };
    }
    async mfaSetup(userId) {
        const secret = otplib_1.authenticator.generateSecret();
        await this.prisma.user.update({ where: { id: userId }, data: { mfaSecret: secret } });
        const otpauth = otplib_1.authenticator.keyuri(userId, 'Briefli', secret);
        return { secret, otpauth };
    }
    async mfaVerify(userId, code) {
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        const valid = otplib_1.authenticator.verify({ token: code, secret: user.mfaSecret ?? '' });
        if (!valid)
            throw new common_1.UnauthorizedException('Invalid MFA code');
        await this.prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
        return { success: true };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
