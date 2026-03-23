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
exports.CalendarService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../prisma/prisma.service");
let CalendarService = class CalendarService {
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
    }
    get appUrl() { return this.config.get('APP_URL') ?? 'http://localhost:3000'; }
    get apiBase() { return this.config.get('API_URL') ?? 'http://localhost:3001/api/v1'; }
    findAll(firmId, query) {
        const { start, end, caseId, eventType, source } = query;
        return this.prisma.calendarEvent.findMany({
            where: {
                firmId,
                ...(caseId && { caseId }),
                ...(eventType && { eventType: eventType }),
                ...(source && { source }),
                ...(start && end && { startTime: { gte: new Date(start), lte: new Date(end) } }),
            },
            orderBy: { startTime: 'asc' },
            include: { case: { select: { id: true, title: true, internalRef: true } } },
        });
    }
    create(firmId, createdById, data) {
        return this.prisma.calendarEvent.create({
            data: {
                firmId, createdById, source: 'manual',
                title: data.title,
                eventType: data.eventType,
                startTime: new Date(data.startTime),
                endTime: new Date(data.endTime),
                description: data.description,
                location: data.location,
                isAllDay: data.isAllDay ?? false,
                caseId: data.caseId,
                attendeeIds: data.attendeeIds ?? [],
            },
            include: { case: { select: { id: true, title: true, internalRef: true } } },
        });
    }
    async update(firmId, id, data) {
        const event = await this.prisma.calendarEvent.findFirst({ where: { id, firmId } });
        if (!event)
            throw new common_1.NotFoundException('Event not found');
        return this.prisma.calendarEvent.update({ where: { id }, data: data });
    }
    async remove(firmId, id) {
        const event = await this.prisma.calendarEvent.findFirst({ where: { id, firmId } });
        if (!event)
            throw new common_1.NotFoundException('Event not found');
        return this.prisma.calendarEvent.delete({ where: { id } });
    }
    async getUpcoming(firmId) {
        const now = new Date();
        return this.prisma.calendarEvent.findMany({
            where: { firmId, startTime: { gte: now, lte: new Date(now.getTime() + 30 * 864e5) } },
            orderBy: { startTime: 'asc' },
            take: 20,
            include: { case: { select: { id: true, title: true, internalRef: true } } },
        });
    }
    async getIntegrationStatus(userId) {
        const u = await this.prisma.user.findUniqueOrThrow({
            where: { id: userId },
            select: { googleCalToken: true, outlookCalToken: true, ecourtsUsername: true, ecourtsLastSync: true },
        });
        return {
            google: { connected: !!u.googleCalToken },
            outlook: { connected: !!u.outlookCalToken },
            ecourts: { connected: !!u.ecourtsUsername, username: u.ecourtsUsername ?? null, lastSync: u.ecourtsLastSync },
        };
    }
    getGoogleAuthUrl(userId) {
        const clientId = this.config.get('GOOGLE_CLIENT_ID');
        if (!clientId)
            throw new common_1.BadRequestException('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env to enable Google Calendar');
        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: `${this.apiBase}/calendar/google/callback`,
            response_type: 'code',
            scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly',
            access_type: 'offline',
            prompt: 'consent',
            state: userId,
        });
        return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` };
    }
    async handleGoogleCallback(code, userId) {
        const res = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: this.config.getOrThrow('GOOGLE_CLIENT_ID'),
                client_secret: this.config.getOrThrow('GOOGLE_CLIENT_SECRET'),
                redirect_uri: `${this.apiBase}/calendar/google/callback`,
                grant_type: 'authorization_code',
            }).toString(),
        });
        if (!res.ok)
            throw new common_1.BadRequestException('Failed to exchange Google auth code');
        const tokens = await res.json();
        tokens.expiry_date = Date.now() + (tokens.expires_in ?? 3600) * 1000;
        await this.prisma.user.update({ where: { id: userId }, data: { googleCalToken: tokens } });
        return `${this.appUrl}/calendar?googleConnected=true`;
    }
    async validGoogleToken(userId) {
        const u = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { googleCalToken: true } });
        if (!u.googleCalToken)
            throw new common_1.BadRequestException('Google Calendar not connected');
        const t = u.googleCalToken;
        if (t.expiry_date && t.expiry_date - Date.now() < 120_000 && t.refresh_token) {
            const r = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: this.config.getOrThrow('GOOGLE_CLIENT_ID'),
                    client_secret: this.config.getOrThrow('GOOGLE_CLIENT_SECRET'),
                    refresh_token: t.refresh_token, grant_type: 'refresh_token',
                }).toString(),
            });
            if (r.ok) {
                const n = await r.json();
                const updated = { ...t, ...n, expiry_date: Date.now() + (n.expires_in ?? 3600) * 1000 };
                await this.prisma.user.update({ where: { id: userId }, data: { googleCalToken: updated } });
                return updated;
            }
        }
        return t;
    }
    async syncFromGoogle(userId, firmId) {
        const t = await this.validGoogleToken(userId);
        const now = new Date();
        const timeMax = new Date(now.getTime() + 60 * 864e5).toISOString();
        const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=250`, { headers: { Authorization: `Bearer ${t.access_token}` } });
        if (!res.ok)
            throw new common_1.BadRequestException('Failed to fetch Google Calendar events — token may be expired, please reconnect');
        const data = await res.json();
        let synced = 0;
        for (const ev of data.items ?? []) {
            const s = ev.start;
            const e = ev.end;
            if (!s)
                continue;
            const startTime = new Date(s.dateTime ?? s.date ?? '');
            const endTime = new Date(e?.dateTime ?? e?.date ?? s.dateTime ?? s.date ?? '');
            const googleEventId = ev.id;
            const existing = await this.prisma.calendarEvent.findFirst({ where: { firmId, googleEventId } });
            if (existing) {
                await this.prisma.calendarEvent.update({ where: { id: existing.id }, data: { title: ev.summary ?? existing.title, startTime, endTime } });
            }
            else {
                await this.prisma.calendarEvent.create({ data: {
                        firmId, createdById: userId, source: 'google', googleEventId,
                        title: ev.summary ?? 'Google Calendar Event',
                        description: ev.description,
                        location: ev.location,
                        eventType: 'MEETING', startTime, endTime, isAllDay: !s.dateTime, attendeeIds: [],
                    } });
            }
            synced++;
        }
        return { synced };
    }
    async pushToGoogle(firmId, userId, eventId) {
        const t = await this.validGoogleToken(userId);
        const event = await this.prisma.calendarEvent.findFirst({ where: { id: eventId, firmId } });
        if (!event)
            throw new common_1.NotFoundException('Event not found');
        const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: { Authorization: `Bearer ${t.access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ summary: event.title, description: event.description, location: event.location,
                start: { dateTime: event.startTime.toISOString() }, end: { dateTime: event.endTime.toISOString() } }),
        });
        if (!res.ok)
            throw new common_1.BadRequestException('Failed to push event to Google Calendar');
        const created = await res.json();
        await this.prisma.calendarEvent.update({ where: { id: eventId }, data: { googleEventId: created.id } });
        return { googleEventId: created.id };
    }
    disconnectGoogle(userId) {
        return this.prisma.user.update({ where: { id: userId }, data: { googleCalToken: null } });
    }
    getOutlookAuthUrl(userId) {
        const clientId = this.config.get('MICROSOFT_CLIENT_ID');
        if (!clientId)
            throw new common_1.BadRequestException('Set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET in .env to enable Outlook Calendar');
        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: `${this.apiBase}/calendar/outlook/callback`,
            response_type: 'code',
            scope: 'https://graph.microsoft.com/Calendars.ReadWrite offline_access',
            response_mode: 'query',
            state: userId,
        });
        return { url: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}` };
    }
    async handleOutlookCallback(code, userId) {
        const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: this.config.getOrThrow('MICROSOFT_CLIENT_ID'),
                client_secret: this.config.getOrThrow('MICROSOFT_CLIENT_SECRET'),
                redirect_uri: `${this.apiBase}/calendar/outlook/callback`,
                grant_type: 'authorization_code',
                scope: 'https://graph.microsoft.com/Calendars.ReadWrite offline_access',
            }).toString(),
        });
        if (!res.ok)
            throw new common_1.BadRequestException('Failed to exchange Outlook auth code');
        const tokens = await res.json();
        tokens.expires_at = Date.now() + (tokens.expires_in ?? 3600) * 1000;
        await this.prisma.user.update({ where: { id: userId }, data: { outlookCalToken: tokens } });
        return `${this.appUrl}/calendar?outlookConnected=true`;
    }
    async validOutlookToken(userId) {
        const u = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { outlookCalToken: true } });
        if (!u.outlookCalToken)
            throw new common_1.BadRequestException('Outlook Calendar not connected');
        const t = u.outlookCalToken;
        if (t.expires_at && t.expires_at - Date.now() < 120_000 && t.refresh_token) {
            const r = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: this.config.getOrThrow('MICROSOFT_CLIENT_ID'),
                    client_secret: this.config.getOrThrow('MICROSOFT_CLIENT_SECRET'),
                    refresh_token: t.refresh_token, grant_type: 'refresh_token',
                }).toString(),
            });
            if (r.ok) {
                const n = await r.json();
                const updated = { ...t, ...n, expires_at: Date.now() + (n.expires_in ?? 3600) * 1000 };
                await this.prisma.user.update({ where: { id: userId }, data: { outlookCalToken: updated } });
                return updated;
            }
        }
        return t;
    }
    async syncFromOutlook(userId, firmId) {
        const t = await this.validOutlookToken(userId);
        const now = new Date();
        const endDT = new Date(now.getTime() + 60 * 864e5).toISOString();
        const res = await fetch(`https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${now.toISOString()}&endDateTime=${endDT}&$top=250&$orderby=start/dateTime`, { headers: { Authorization: `Bearer ${t.access_token}`, Prefer: 'outlook.timezone="UTC"' } });
        if (!res.ok)
            throw new common_1.BadRequestException('Failed to fetch Outlook Calendar events — token may be expired, please reconnect');
        const data = await res.json();
        let synced = 0;
        for (const ev of data.value ?? []) {
            const sRaw = ev.start?.dateTime;
            const eRaw = ev.end?.dateTime;
            if (!sRaw)
                continue;
            const toUTC = (s) => new Date(s.endsWith('Z') ? s : s + 'Z');
            const startTime = toUTC(sRaw);
            const endTime = toUTC(eRaw ?? sRaw);
            const outlookEventId = ev.id;
            const existing = await this.prisma.calendarEvent.findFirst({ where: { firmId, outlookEventId } });
            if (existing) {
                await this.prisma.calendarEvent.update({ where: { id: existing.id }, data: { title: ev.subject ?? existing.title, startTime, endTime } });
            }
            else {
                await this.prisma.calendarEvent.create({ data: {
                        firmId, createdById: userId, source: 'outlook', outlookEventId,
                        title: ev.subject ?? 'Outlook Event',
                        description: ev.bodyPreview,
                        location: ev.location?.displayName,
                        eventType: 'MEETING', startTime, endTime, isAllDay: ev.isAllDay ?? false, attendeeIds: [],
                    } });
            }
            synced++;
        }
        return { synced };
    }
    async pushToOutlook(firmId, userId, eventId) {
        const t = await this.validOutlookToken(userId);
        const event = await this.prisma.calendarEvent.findFirst({ where: { id: eventId, firmId } });
        if (!event)
            throw new common_1.NotFoundException('Event not found');
        const res = await fetch('https://graph.microsoft.com/v1.0/me/events', {
            method: 'POST',
            headers: { Authorization: `Bearer ${t.access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                subject: event.title,
                body: { contentType: 'Text', content: event.description ?? '' },
                start: { dateTime: event.startTime.toISOString().slice(0, 19), timeZone: 'UTC' },
                end: { dateTime: event.endTime.toISOString().slice(0, 19), timeZone: 'UTC' },
                ...(event.location ? { location: { displayName: event.location } } : {}),
            }),
        });
        if (!res.ok)
            throw new common_1.BadRequestException('Failed to push event to Outlook');
        const created = await res.json();
        await this.prisma.calendarEvent.update({ where: { id: eventId }, data: { outlookEventId: created.id } });
        return { outlookEventId: created.id };
    }
    disconnectOutlook(userId) {
        return this.prisma.user.update({ where: { id: userId }, data: { outlookCalToken: null } });
    }
};
exports.CalendarService = CalendarService;
exports.CalendarService = CalendarService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], CalendarService);
