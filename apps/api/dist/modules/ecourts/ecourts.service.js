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
exports.EcourtsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../prisma/prisma.service");
const crypto_1 = require("crypto");
const ECOURTS_BASE = 'https://iapps.courts.state.ny.us';
const LOGIN_PATH = '/ecourts/login';
const NOTIF_PATH = '/ecourts/myNotifications';
let EcourtsService = class EcourtsService {
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
    }
    get encKey() {
        const key = this.config.get('ENCRYPTION_KEY') ?? 'change_me_32_byte_hex_string_here';
        return Buffer.from(key.padEnd(64, '0').slice(0, 64), 'hex');
    }
    encrypt(text) {
        const iv = (0, crypto_1.randomBytes)(16);
        const cipher = (0, crypto_1.createCipheriv)('aes-256-cbc', this.encKey, iv);
        const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
        return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
    }
    decrypt(stored) {
        const [ivHex, encHex] = stored.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const enc = Buffer.from(encHex, 'hex');
        const decipher = (0, crypto_1.createDecipheriv)('aes-256-cbc', this.encKey, iv);
        return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
    }
    async storeCredentials(userId, credentials) {
        const encrypted = this.encrypt(credentials.password);
        await this.prisma.user.update({
            where: { id: userId },
            data: { ecourtsUsername: credentials.username, ecourtsCredential: encrypted },
        });
        return { success: true, message: 'eCourts credentials saved. Use "Sync Notifications" to fetch your latest court notifications.' };
    }
    async removeCredentials(userId) {
        await this.prisma.user.update({
            where: { id: userId },
            data: { ecourtsUsername: null, ecourtsCredential: null, ecourtsLastSync: null },
        });
        return { success: true };
    }
    async getCredentialStatus(userId) {
        const user = await this.prisma.user.findUniqueOrThrow({
            where: { id: userId },
            select: { ecourtsUsername: true, ecourtsCredential: true, ecourtsLastSync: true },
        });
        return {
            hasCredentials: !!(user.ecourtsUsername && user.ecourtsCredential),
            username: user.ecourtsUsername ?? null,
            lastSync: user.ecourtsLastSync,
        };
    }
    getNotifications(firmId, userId) {
        return this.prisma.ecourtNotification.findMany({
            where: { firmId, userId },
            orderBy: [{ eventDate: 'asc' }, { createdAt: 'desc' }],
            include: { case: { select: { id: true, title: true, internalRef: true } } },
        });
    }
    async createSession(username, password) {
        const loginPageRes = await fetch(`${ECOURTS_BASE}${LOGIN_PATH}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Briefli/1.0)' },
            redirect: 'follow',
        });
        const setCookie = loginPageRes.headers.get('set-cookie') ?? '';
        const sessionCookie = setCookie.split(';')[0] ?? '';
        const html = await loginPageRes.text();
        const csrfMatch = html.match(/name="[_]?csrf[_]?token"[^>]+value="([^"]+)"/i) ??
            html.match(/name="org\.apache\.struts\.taglib\.html\.TOKEN"[^>]+value="([^"]+)"/i);
        const csrfToken = csrfMatch?.[1] ?? '';
        const formData = new URLSearchParams({
            'txtUserName': username,
            'txtPassword': password,
            ...(csrfToken ? { 'org.apache.struts.taglib.html.TOKEN': csrfToken } : {}),
            'userName': username,
            'userPassword': password,
        });
        const loginRes = await fetch(`${ECOURTS_BASE}${LOGIN_PATH}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': sessionCookie,
                'User-Agent': 'Mozilla/5.0 (compatible; Briefli/1.0)',
                'Referer': `${ECOURTS_BASE}${LOGIN_PATH}`,
            },
            body: formData.toString(),
            redirect: 'manual',
        });
        const loginCookies = loginRes.headers.get('set-cookie') ?? sessionCookie;
        const allCookies = [sessionCookie, loginCookies].filter(Boolean).join('; ');
        const loginBody = loginRes.status === 200 ? await loginRes.text() : '';
        if (loginBody.includes('Invalid') || loginBody.includes('incorrect') || loginBody.includes('failed')) {
            throw new common_1.BadRequestException('eCourts login failed — please check your username and password');
        }
        return allCookies;
    }
    parseNotifications(html) {
        const notifications = [];
        const rowPattern = /<tr[^>]*class="[^"]*(?:notification|case-row|data-row)[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
        const tdPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        const stripTags = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim();
        const tablePattern = /<table[^>]*>([\s\S]*?)<\/table>/gi;
        let tableMatch;
        while ((tableMatch = tablePattern.exec(html)) !== null) {
            const tableHtml = tableMatch[1];
            const rows = [];
            let row;
            const trPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
            while ((row = trPattern.exec(tableHtml)) !== null)
                rows.push(row);
            for (let i = 1; i < rows.length; i++) {
                const rowHtml = rows[i][0];
                const cells = [];
                let cell;
                const localTdPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
                while ((cell = localTdPattern.exec(rowHtml)) !== null) {
                    cells.push(stripTags(cell[1]));
                }
                if (cells.length < 2)
                    continue;
                const datePattern = /(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/;
                const dateCell = cells.find((c) => datePattern.test(c));
                const dateMatch = dateCell?.match(datePattern);
                const eventDate = dateMatch ? new Date(dateMatch[0]) : null;
                const docketPattern = /([A-Z]{2,3}-[A-Z]-\d{4}-\d{6}|[A-Z]{2,3}\d{4}-\d{5}|\d{2}-[A-Z]{2}-\d{6})/i;
                const docketCell = cells.find((c) => docketPattern.test(c));
                const title = cells[1] ?? cells[0] ?? 'Court Notification';
                if (!title || title.length < 3)
                    continue;
                const rawId = `${cells[0] ?? ''}-${title}-${dateCell ?? ''}`;
                const externalId = Buffer.from(rawId).toString('base64').slice(0, 32);
                notifications.push({
                    externalId,
                    title: title.slice(0, 255),
                    body: cells.slice(0, 4).join(' | '),
                    court: cells.find((c) => c.toLowerCase().includes('court') || c.toLowerCase().includes('county')) ?? null,
                    docketNumber: docketCell?.match(docketPattern)?.[0] ?? null,
                    eventDate: eventDate && !isNaN(eventDate.getTime()) ? eventDate : null,
                    category: this.categorizeNotification(title),
                });
            }
        }
        return notifications.slice(0, 100);
    }
    categorizeNotification(title) {
        const t = title.toLowerCase();
        if (t.includes('hearing') || t.includes('trial') || t.includes('argument') ||
            t.includes('calendar call') || t.includes('traverse') || t.includes('inquest'))
            return 'HEARING';
        if (t.includes('deadline') || t.includes('due') || t.includes('file by') ||
            t.includes('respond by') || t.includes('answer by'))
            return 'DEADLINE';
        if (t.includes('order') || t.includes('decision') || t.includes('judgment') ||
            t.includes('warrant') || t.includes('stipulation') || t.includes('vacate') ||
            t.includes('stay'))
            return 'ORDER';
        if (t.includes('filing') || t.includes('filed') || t.includes('document') ||
            t.includes('petition') || t.includes('affidavit') || t.includes('motion'))
            return 'FILING';
        if (t.includes('notice') || t.includes('notify') || t.includes('eviction') ||
            t.includes('non-payment') || t.includes('holdover'))
            return 'NOTICE';
        return 'GENERAL';
    }
    async fetchAndSyncNotifications(userId, firmId) {
        const user = await this.prisma.user.findUniqueOrThrow({
            where: { id: userId },
            select: { ecourtsUsername: true, ecourtsCredential: true },
        });
        if (!user.ecourtsUsername || !user.ecourtsCredential) {
            throw new common_1.BadRequestException('eCourts credentials not configured. Please enter your eCourts username and password in the Calendar integrations panel.');
        }
        const password = this.decrypt(user.ecourtsCredential);
        let cookies;
        try {
            cookies = await this.createSession(user.ecourtsUsername, password);
        }
        catch (err) {
            if (err instanceof common_1.BadRequestException)
                throw err;
            throw new common_1.BadRequestException('Failed to connect to eCourts portal. The portal may be temporarily unavailable.');
        }
        const notifRes = await fetch(`${ECOURTS_BASE}${NOTIF_PATH}`, {
            headers: {
                Cookie: cookies,
                'User-Agent': 'Mozilla/5.0 (compatible; Briefli/1.0)',
                Referer: `${ECOURTS_BASE}${LOGIN_PATH}`,
            },
        });
        if (!notifRes.ok) {
            throw new common_1.BadRequestException(`eCourts notifications page returned ${notifRes.status}. You may need to re-enter your credentials.`);
        }
        const html = await notifRes.text();
        if (html.includes('/ecourts/login') || html.includes('session expired') ||
            html.includes('Please log in') || html.includes('Session Timeout') ||
            html.includes('Your session has') || html.includes('login.do')) {
            throw new common_1.BadRequestException('NY eCourts session expired. Please check your credentials.');
        }
        const parsed = this.parseNotifications(html);
        let newNotifications = 0;
        let calendarEventsCreated = 0;
        for (const notif of parsed) {
            const existing = await this.prisma.ecourtNotification.findFirst({
                where: { userId, externalId: notif.externalId },
            });
            let notifRecord;
            if (!existing) {
                notifRecord = await this.prisma.ecourtNotification.create({
                    data: { firmId, userId, ...notif },
                });
                newNotifications++;
            }
            else {
                notifRecord = existing;
            }
            if (notif.eventDate && !notifRecord.importedToCalendar) {
                const eventType = notif.category === 'HEARING' ? 'COURT_HEARING' : 'DEADLINE';
                const calEvent = await this.prisma.calendarEvent.create({
                    data: {
                        firmId, createdById: userId,
                        title: notif.title,
                        description: [notif.body, notif.docketNumber ? `Docket: ${notif.docketNumber}` : '', notif.court ? `Court: ${notif.court}` : ''].filter(Boolean).join('\n'),
                        location: notif.court ?? undefined,
                        eventType,
                        startTime: notif.eventDate,
                        endTime: new Date(notif.eventDate.getTime() + 60 * 60 * 1000),
                        isAllDay: false,
                        attendeeIds: [],
                        source: 'ecourts',
                        ecourtsNotifId: notifRecord.id,
                    },
                });
                await this.prisma.ecourtNotification.update({
                    where: { id: notifRecord.id },
                    data: { importedToCalendar: true, calendarEventId: calEvent.id },
                });
                calendarEventsCreated++;
            }
        }
        await this.prisma.user.update({ where: { id: userId }, data: { ecourtsLastSync: new Date() } });
        return { fetched: parsed.length, newNotifications, calendarEventsCreated };
    }
    async importNotificationToCalendar(firmId, userId, notifId) {
        const notif = await this.prisma.ecourtNotification.findFirst({
            where: { id: notifId, firmId },
        });
        if (!notif)
            throw new common_1.BadRequestException('Notification not found');
        if (notif.importedToCalendar)
            return { alreadyImported: true };
        const eventType = notif.category === 'HEARING' ? 'COURT_HEARING' : 'DEADLINE';
        const startTime = notif.eventDate ?? new Date();
        const calEvent = await this.prisma.calendarEvent.create({
            data: {
                firmId, createdById: userId,
                title: notif.title,
                description: [notif.body, notif.docketNumber ? `Docket: ${notif.docketNumber}` : '', notif.court ? `Court: ${notif.court}` : ''].filter(Boolean).join('\n'),
                location: notif.court ?? undefined,
                eventType, source: 'ecourts', ecourtsNotifId: notif.id,
                startTime, endTime: new Date(startTime.getTime() + 60 * 60 * 1000),
                isAllDay: false, attendeeIds: [],
                caseId: notif.caseId ?? undefined,
            },
        });
        await this.prisma.ecourtNotification.update({
            where: { id: notifId },
            data: { importedToCalendar: true, calendarEventId: calEvent.id },
        });
        return { calendarEventId: calEvent.id };
    }
    async search(_userId, _params) {
        return { results: [], message: 'Use the Sync Notifications feature to pull data from eCourts' };
    }
    async importCase(firmId, _userId, data) {
        void firmId;
        void data;
        return { success: false, message: 'eCourts case import not yet implemented' };
    }
    async syncCase(firmId, _userId, caseId) {
        const c = await this.prisma.case.findFirst({ where: { id: caseId, firmId } });
        if (!c)
            return { success: false, message: 'Case not found' };
        return { success: false, message: 'eCourts case sync not yet implemented' };
    }
};
exports.EcourtsService = EcourtsService;
exports.EcourtsService = EcourtsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], EcourtsService);
