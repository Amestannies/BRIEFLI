import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

interface GoogleTokens { access_token: string; refresh_token?: string; expiry_date?: number; expires_in?: number; }
interface MsTokens     { access_token: string; refresh_token?: string; expires_at?: number;  expires_in?: number; }

@Injectable()
export class CalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get appUrl()  { return this.config.get<string>('APP_URL')  ?? 'http://localhost:3000'; }
  private get apiBase() { return this.config.get<string>('API_URL')  ?? 'http://localhost:3001/api/v1'; }

  // ─── Events CRUD ──────────────────────────────────────────────────────────

  findAll(firmId: string, query: Record<string, string>) {
    const { start, end, caseId, eventType, source } = query;
    return this.prisma.calendarEvent.findMany({
      where: {
        firmId,
        ...(caseId && { caseId }),
        ...(eventType && { eventType: eventType as never }),
        ...(source && { source }),
        ...(start && end && { startTime: { gte: new Date(start), lte: new Date(end) } }),
      },
      orderBy: { startTime: 'asc' },
      include: { case: { select: { id: true, title: true, internalRef: true } } },
    });
  }

  create(firmId: string, createdById: string, data: Record<string, unknown>) {
    return this.prisma.calendarEvent.create({
      data: {
        firmId, createdById, source: 'manual',
        title: data.title as string,
        eventType: data.eventType as never,
        startTime: new Date(data.startTime as string),
        endTime:   new Date(data.endTime   as string),
        description: data.description as string | undefined,
        location:    data.location    as string | undefined,
        isAllDay:   (data.isAllDay   as boolean) ?? false,
        caseId:     data.caseId      as string | undefined,
        attendeeIds:(data.attendeeIds as string[]) ?? [],
      },
      include: { case: { select: { id: true, title: true, internalRef: true } } },
    });
  }

  async update(firmId: string, id: string, data: Record<string, unknown>) {
    const event = await this.prisma.calendarEvent.findFirst({ where: { id, firmId } });
    if (!event) throw new NotFoundException('Event not found');
    return this.prisma.calendarEvent.update({ where: { id }, data: data as never });
  }

  async remove(firmId: string, id: string) {
    const event = await this.prisma.calendarEvent.findFirst({ where: { id, firmId } });
    if (!event) throw new NotFoundException('Event not found');
    return this.prisma.calendarEvent.delete({ where: { id } });
  }

  async getUpcoming(firmId: string) {
    const now = new Date();
    return this.prisma.calendarEvent.findMany({
      where: { firmId, startTime: { gte: now, lte: new Date(now.getTime() + 30 * 864e5) } },
      orderBy: { startTime: 'asc' },
      take: 20,
      include: { case: { select: { id: true, title: true, internalRef: true } } },
    });
  }

  async getIntegrationStatus(userId: string) {
    const u = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { googleCalToken: true, outlookCalToken: true, ecourtsUsername: true, ecourtsLastSync: true },
    });
    return {
      google:  { connected: !!u.googleCalToken },
      outlook: { connected: !!u.outlookCalToken },
      ecourts: { connected: !!u.ecourtsUsername, username: u.ecourtsUsername ?? null, lastSync: u.ecourtsLastSync },
    };
  }

  // ─── Google Calendar OAuth2 ───────────────────────────────────────────────

  getGoogleAuthUrl(userId: string) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) throw new BadRequestException('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env to enable Google Calendar');
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

  async handleGoogleCallback(code: string, userId: string): Promise<string> {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
        client_secret: this.config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
        redirect_uri:  `${this.apiBase}/calendar/google/callback`,
        grant_type: 'authorization_code',
      }).toString(),
    });
    if (!res.ok) throw new BadRequestException('Failed to exchange Google auth code');
    const tokens = await res.json() as GoogleTokens;
    tokens.expiry_date = Date.now() + (tokens.expires_in ?? 3600) * 1000;
    await this.prisma.user.update({ where: { id: userId }, data: { googleCalToken: tokens as never } });
    return `${this.appUrl}/calendar?googleConnected=true`;
  }

  private async validGoogleToken(userId: string): Promise<GoogleTokens> {
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { googleCalToken: true } });
    if (!u.googleCalToken) throw new BadRequestException('Google Calendar not connected');
    const t = u.googleCalToken as unknown as GoogleTokens;
    if (t.expiry_date && t.expiry_date - Date.now() < 120_000 && t.refresh_token) {
      const r = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id:     this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
          client_secret: this.config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
          refresh_token: t.refresh_token, grant_type: 'refresh_token',
        }).toString(),
      });
      if (r.ok) {
        const n = await r.json() as GoogleTokens;
        const updated = { ...t, ...n, expiry_date: Date.now() + (n.expires_in ?? 3600) * 1000 };
        await this.prisma.user.update({ where: { id: userId }, data: { googleCalToken: updated as never } });
        return updated;
      }
    }
    return t;
  }

  async syncFromGoogle(userId: string, firmId: string) {
    const t = await this.validGoogleToken(userId);
    const now = new Date();
    const timeMax = new Date(now.getTime() + 60 * 864e5).toISOString();
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=250`,
      { headers: { Authorization: `Bearer ${t.access_token}` } },
    );
    if (!res.ok) throw new BadRequestException('Failed to fetch Google Calendar events — token may be expired, please reconnect');
    const data = await res.json() as { items?: Array<Record<string, unknown>> };
    let synced = 0;
    for (const ev of data.items ?? []) {
      const s = ev.start as Record<string, string> | undefined;
      const e = ev.end   as Record<string, string> | undefined;
      if (!s) continue;
      const startTime = new Date(s.dateTime ?? s.date ?? '');
      const endTime   = new Date(e?.dateTime ?? e?.date ?? s.dateTime ?? s.date ?? '');
      const googleEventId = ev.id as string;
      const existing = await this.prisma.calendarEvent.findFirst({ where: { firmId, googleEventId } });
      if (existing) {
        await this.prisma.calendarEvent.update({ where: { id: existing.id }, data: { title: (ev.summary as string) ?? existing.title, startTime, endTime } });
      } else {
        await this.prisma.calendarEvent.create({ data: {
          firmId, createdById: userId, source: 'google', googleEventId,
          title: (ev.summary as string) ?? 'Google Calendar Event',
          description: ev.description as string | undefined,
          location: ev.location as string | undefined,
          eventType: 'MEETING', startTime, endTime, isAllDay: !s.dateTime, attendeeIds: [],
        }});
      }
      synced++;
    }
    return { synced };
  }

  async pushToGoogle(firmId: string, userId: string, eventId: string) {
    const t = await this.validGoogleToken(userId);
    const event = await this.prisma.calendarEvent.findFirst({ where: { id: eventId, firmId } });
    if (!event) throw new NotFoundException('Event not found');
    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${t.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary: event.title, description: event.description, location: event.location,
        start: { dateTime: event.startTime.toISOString() }, end: { dateTime: event.endTime.toISOString() } }),
    });
    if (!res.ok) throw new BadRequestException('Failed to push event to Google Calendar');
    const created = await res.json() as { id: string };
    await this.prisma.calendarEvent.update({ where: { id: eventId }, data: { googleEventId: created.id } });
    return { googleEventId: created.id };
  }

  disconnectGoogle(userId: string) {
    return this.prisma.user.update({ where: { id: userId }, data: { googleCalToken: null } });
  }

  // ─── Microsoft Outlook Calendar ───────────────────────────────────────────

  getOutlookAuthUrl(userId: string) {
    const clientId = this.config.get<string>('MICROSOFT_CLIENT_ID');
    if (!clientId) throw new BadRequestException('Set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET in .env to enable Outlook Calendar');
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

  async handleOutlookCallback(code: string, userId: string): Promise<string> {
    const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     this.config.getOrThrow<string>('MICROSOFT_CLIENT_ID'),
        client_secret: this.config.getOrThrow<string>('MICROSOFT_CLIENT_SECRET'),
        redirect_uri:  `${this.apiBase}/calendar/outlook/callback`,
        grant_type: 'authorization_code',
        scope: 'https://graph.microsoft.com/Calendars.ReadWrite offline_access',
      }).toString(),
    });
    if (!res.ok) throw new BadRequestException('Failed to exchange Outlook auth code');
    const tokens = await res.json() as MsTokens;
    tokens.expires_at = Date.now() + (tokens.expires_in ?? 3600) * 1000;
    await this.prisma.user.update({ where: { id: userId }, data: { outlookCalToken: tokens as never } });
    return `${this.appUrl}/calendar?outlookConnected=true`;
  }

  private async validOutlookToken(userId: string): Promise<MsTokens> {
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { outlookCalToken: true } });
    if (!u.outlookCalToken) throw new BadRequestException('Outlook Calendar not connected');
    const t = u.outlookCalToken as unknown as MsTokens;
    if (t.expires_at && t.expires_at - Date.now() < 120_000 && t.refresh_token) {
      const r = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id:     this.config.getOrThrow<string>('MICROSOFT_CLIENT_ID'),
          client_secret: this.config.getOrThrow<string>('MICROSOFT_CLIENT_SECRET'),
          refresh_token: t.refresh_token!, grant_type: 'refresh_token',
        }).toString(),
      });
      if (r.ok) {
        const n = await r.json() as MsTokens;
        const updated = { ...t, ...n, expires_at: Date.now() + (n.expires_in ?? 3600) * 1000 };
        await this.prisma.user.update({ where: { id: userId }, data: { outlookCalToken: updated as never } });
        return updated;
      }
    }
    return t;
  }

  async syncFromOutlook(userId: string, firmId: string) {
    const t = await this.validOutlookToken(userId);
    const now = new Date();
    const endDT = new Date(now.getTime() + 60 * 864e5).toISOString();
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${now.toISOString()}&endDateTime=${endDT}&$top=250&$orderby=start/dateTime`,
      { headers: { Authorization: `Bearer ${t.access_token}`, Prefer: 'outlook.timezone="UTC"' } },
    );
    if (!res.ok) throw new BadRequestException('Failed to fetch Outlook Calendar events — token may be expired, please reconnect');
    const data = await res.json() as { value?: Array<Record<string, unknown>> };
    let synced = 0;
    for (const ev of data.value ?? []) {
      const sRaw = (ev.start as Record<string, string> | undefined)?.dateTime;
      const eRaw = (ev.end   as Record<string, string> | undefined)?.dateTime;
      if (!sRaw) continue;
      const toUTC = (s: string) => new Date(s.endsWith('Z') ? s : s + 'Z');
      const startTime = toUTC(sRaw);
      const endTime   = toUTC(eRaw ?? sRaw);
      const outlookEventId = ev.id as string;
      const existing = await this.prisma.calendarEvent.findFirst({ where: { firmId, outlookEventId } });
      if (existing) {
        await this.prisma.calendarEvent.update({ where: { id: existing.id }, data: { title: (ev.subject as string) ?? existing.title, startTime, endTime } });
      } else {
        await this.prisma.calendarEvent.create({ data: {
          firmId, createdById: userId, source: 'outlook', outlookEventId,
          title: (ev.subject as string) ?? 'Outlook Event',
          description: ev.bodyPreview as string | undefined,
          location: (ev.location as Record<string, string> | undefined)?.displayName as string | undefined,
          eventType: 'MEETING', startTime, endTime, isAllDay: (ev.isAllDay as boolean) ?? false, attendeeIds: [],
        }});
      }
      synced++;
    }
    return { synced };
  }

  async pushToOutlook(firmId: string, userId: string, eventId: string) {
    const t = await this.validOutlookToken(userId);
    const event = await this.prisma.calendarEvent.findFirst({ where: { id: eventId, firmId } });
    if (!event) throw new NotFoundException('Event not found');
    const res = await fetch('https://graph.microsoft.com/v1.0/me/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${t.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: event.title,
        body: { contentType: 'Text', content: event.description ?? '' },
        start: { dateTime: event.startTime.toISOString().slice(0, 19), timeZone: 'UTC' },
        end:   { dateTime: event.endTime.toISOString().slice(0, 19),   timeZone: 'UTC' },
        ...(event.location ? { location: { displayName: event.location } } : {}),
      }),
    });
    if (!res.ok) throw new BadRequestException('Failed to push event to Outlook');
    const created = await res.json() as { id: string };
    await this.prisma.calendarEvent.update({ where: { id: eventId }, data: { outlookEventId: created.id } });
    return { outlookEventId: created.id };
  }

  disconnectOutlook(userId: string) {
    return this.prisma.user.update({ where: { id: userId }, data: { outlookCalToken: null } });
  }
}
