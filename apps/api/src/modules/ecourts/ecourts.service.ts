import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// ─── NY eCourts portal constants (Landlord-Tenant · Queens) ───────────────────
// NY Unified Court System eCourts portal for registered attorneys.
// Base: iapps.courts.state.ny.us — landlord-tenant cases filed in Queens Civil Court
// use the same eCourts authentication as NYSCEF-enrolled matters.
const ECOURTS_BASE = 'https://iapps.courts.state.ny.us';
const LOGIN_PATH   = '/ecourts/login';
const NOTIF_PATH   = '/ecourts/myNotifications';

@Injectable()
export class EcourtsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ─── Encryption helpers ───────────────────────────────────────────────────

  private get encKey(): Buffer {
    const key = this.config.get<string>('ENCRYPTION_KEY') ?? 'change_me_32_byte_hex_string_here';
    // Ensure exactly 32 bytes for AES-256
    return Buffer.from(key.padEnd(64, '0').slice(0, 64), 'hex');
  }

  private encrypt(text: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', this.encKey, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  }

  private decrypt(stored: string): string {
    const [ivHex, encHex] = stored.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const enc = Buffer.from(encHex, 'hex');
    const decipher = createDecipheriv('aes-256-cbc', this.encKey, iv);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  }

  // ─── Credentials management ───────────────────────────────────────────────

  async storeCredentials(userId: string, credentials: { username: string; password: string }) {
    const encrypted = this.encrypt(credentials.password);
    await this.prisma.user.update({
      where: { id: userId },
      data: { ecourtsUsername: credentials.username, ecourtsCredential: encrypted },
    });
    return { success: true, message: 'eCourts credentials saved. Use "Sync Notifications" to fetch your latest court notifications.' };
  }

  async removeCredentials(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { ecourtsUsername: null, ecourtsCredential: null, ecourtsLastSync: null },
    });
    return { success: true };
  }

  async getCredentialStatus(userId: string) {
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

  // ─── Notification list (saved) ────────────────────────────────────────────

  getNotifications(firmId: string, userId: string) {
    return this.prisma.ecourtNotification.findMany({
      where: { firmId, userId },
      orderBy: [{ eventDate: 'asc' }, { createdAt: 'desc' }],
      include: { case: { select: { id: true, title: true, internalRef: true } } },
    });
  }

  // ─── eCourts session login ────────────────────────────────────────────────

  private async createSession(username: string, password: string): Promise<string> {
    // Step 1: GET login page to get CSRF token / session cookie
    const loginPageRes = await fetch(`${ECOURTS_BASE}${LOGIN_PATH}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Briefli/1.0)' },
      redirect: 'follow',
    });

    // Extract session cookie from Set-Cookie header
    const setCookie = loginPageRes.headers.get('set-cookie') ?? '';
    const sessionCookie = setCookie.split(';')[0] ?? '';

    // Extract CSRF hidden field from HTML (if present)
    const html = await loginPageRes.text();
    const csrfMatch = html.match(/name="[_]?csrf[_]?token"[^>]+value="([^"]+)"/i) ??
                      html.match(/name="org\.apache\.struts\.taglib\.html\.TOKEN"[^>]+value="([^"]+)"/i);
    const csrfToken = csrfMatch?.[1] ?? '';

    // Step 2: POST credentials — NY eCourts login form field names
    const formData = new URLSearchParams({
      'txtUserName': username,
      'txtPassword': password,
      // Also include Struts token and legacy field names as fallbacks
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

    // Collect cookies from login response
    const loginCookies = loginRes.headers.get('set-cookie') ?? sessionCookie;
    const allCookies = [sessionCookie, loginCookies].filter(Boolean).join('; ');

    // Check for auth failure indicators
    const loginBody = loginRes.status === 200 ? await loginRes.text() : '';
    if (loginBody.includes('Invalid') || loginBody.includes('incorrect') || loginBody.includes('failed')) {
      throw new BadRequestException('eCourts login failed — please check your username and password');
    }

    return allCookies;
  }

  // ─── Notification scraping ────────────────────────────────────────────────

  private parseNotifications(html: string): Array<{
    externalId: string; title: string; body: string; court: string | null;
    docketNumber: string | null; eventDate: Date | null; category: string | null;
  }> {
    const notifications: Array<{
      externalId: string; title: string; body: string; court: string | null;
      docketNumber: string | null; eventDate: Date | null; category: string | null;
    }> = [];

    // Parse table rows — eCourts NJ uses HTML tables for notification lists
    // Pattern: <tr> containing case info, notification text, and dates
    const rowPattern = /<tr[^>]*class="[^"]*(?:notification|case-row|data-row)[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
    const tdPattern  = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const stripTags  = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim();

    // Fallback: parse any table with at least 4 columns (docket, title, court, date)
    const tablePattern = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    let tableMatch: RegExpExecArray | null;

    while ((tableMatch = tablePattern.exec(html)) !== null) {
      const tableHtml = tableMatch[1];
      const rows: RegExpExecArray[] = [];
      let row: RegExpExecArray | null;
      const trPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      while ((row = trPattern.exec(tableHtml)) !== null) rows.push(row);

      // Skip header row
      for (let i = 1; i < rows.length; i++) {
        const rowHtml = rows[i]![0];
        const cells: string[] = [];
        let cell: RegExpExecArray | null;
        const localTdPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        while ((cell = localTdPattern.exec(rowHtml)) !== null) {
          cells.push(stripTags(cell[1]));
        }
        if (cells.length < 2) continue;

        // Try to extract date from any cell
        const datePattern = /(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/;
        const dateCell = cells.find((c) => datePattern.test(c));
        const dateMatch = dateCell?.match(datePattern);
        const eventDate = dateMatch ? new Date(dateMatch[0]) : null;

        // Try to extract docket number
        const docketPattern = /([A-Z]{2,3}-[A-Z]-\d{4}-\d{6}|[A-Z]{2,3}\d{4}-\d{5}|\d{2}-[A-Z]{2}-\d{6})/i;
        const docketCell = cells.find((c) => docketPattern.test(c));

        const title = cells[1] ?? cells[0] ?? 'Court Notification';
        if (!title || title.length < 3) continue;

        // Generate a stable external ID from content
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

    return notifications.slice(0, 100); // safety cap
  }

  private categorizeNotification(title: string): string {
    const t = title.toLowerCase();
    // Landlord-Tenant specific (Queens Housing Court / NY Civil Court)
    if (t.includes('hearing') || t.includes('trial') || t.includes('argument') ||
        t.includes('calendar call') || t.includes('traverse') || t.includes('inquest')) return 'HEARING';
    if (t.includes('deadline') || t.includes('due') || t.includes('file by') ||
        t.includes('respond by') || t.includes('answer by')) return 'DEADLINE';
    if (t.includes('order') || t.includes('decision') || t.includes('judgment') ||
        t.includes('warrant') || t.includes('stipulation') || t.includes('vacate') ||
        t.includes('stay')) return 'ORDER';
    if (t.includes('filing') || t.includes('filed') || t.includes('document') ||
        t.includes('petition') || t.includes('affidavit') || t.includes('motion')) return 'FILING';
    if (t.includes('notice') || t.includes('notify') || t.includes('eviction') ||
        t.includes('non-payment') || t.includes('holdover')) return 'NOTICE';
    return 'GENERAL';
  }

  // ─── Main sync method ─────────────────────────────────────────────────────

  async fetchAndSyncNotifications(userId: string, firmId: string): Promise<{
    fetched: number; newNotifications: number; calendarEventsCreated: number;
  }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { ecourtsUsername: true, ecourtsCredential: true },
    });

    if (!user.ecourtsUsername || !user.ecourtsCredential) {
      throw new BadRequestException('eCourts credentials not configured. Please enter your eCourts username and password in the Calendar integrations panel.');
    }

    const password = this.decrypt(user.ecourtsCredential);

    // Login and get session cookies
    let cookies: string;
    try {
      cookies = await this.createSession(user.ecourtsUsername, password);
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('Failed to connect to eCourts portal. The portal may be temporarily unavailable.');
    }

    // Fetch notifications page
    const notifRes = await fetch(`${ECOURTS_BASE}${NOTIF_PATH}`, {
      headers: {
        Cookie: cookies,
        'User-Agent': 'Mozilla/5.0 (compatible; Briefli/1.0)',
        Referer: `${ECOURTS_BASE}${LOGIN_PATH}`,
      },
    });

    if (!notifRes.ok) {
      throw new BadRequestException(`eCourts notifications page returned ${notifRes.status}. You may need to re-enter your credentials.`);
    }

    const html = await notifRes.text();

    // Check if still logged in (NY eCourts session indicators)
    if (html.includes('/ecourts/login') || html.includes('session expired') ||
        html.includes('Please log in') || html.includes('Session Timeout') ||
        html.includes('Your session has') || html.includes('login.do')) {
      throw new BadRequestException('NY eCourts session expired. Please check your credentials.');
    }

    const parsed = this.parseNotifications(html);

    let newNotifications = 0;
    let calendarEventsCreated = 0;

    for (const notif of parsed) {
      // Upsert notification
      const existing = await this.prisma.ecourtNotification.findFirst({
        where: { userId, externalId: notif.externalId },
      });

      let notifRecord: { id: string; importedToCalendar: boolean; eventDate: Date | null };
      if (!existing) {
        notifRecord = await this.prisma.ecourtNotification.create({
          data: { firmId, userId, ...notif },
        });
        newNotifications++;
      } else {
        notifRecord = existing;
      }

      // Auto-create calendar events for hearings and deadlines with dates
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
            endTime: new Date(notif.eventDate.getTime() + 60 * 60 * 1000), // 1 hour duration
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

  // ─── Manual import ────────────────────────────────────────────────────────

  async importNotificationToCalendar(firmId: string, userId: string, notifId: string) {
    const notif = await this.prisma.ecourtNotification.findFirst({
      where: { id: notifId, firmId },
    });
    if (!notif) throw new BadRequestException('Notification not found');
    if (notif.importedToCalendar) return { alreadyImported: true };

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

  // ─── Legacy stubs ─────────────────────────────────────────────────────────

  async search(_userId: string, _params: Record<string, string>) {
    return { results: [], message: 'Use the Sync Notifications feature to pull data from eCourts' };
  }

  async importCase(firmId: string, _userId: string, data: Record<string, string>) {
    void firmId; void data;
    return { success: false, message: 'eCourts case import not yet implemented' };
  }

  async syncCase(firmId: string, _userId: string, caseId: string) {
    const c = await this.prisma.case.findFirst({ where: { id: caseId, firmId } });
    if (!c) return { success: false, message: 'Case not found' };
    return { success: false, message: 'eCourts case sync not yet implemented' };
  }
}
