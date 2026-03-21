import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface PortalClient {
  clientId: string;
  firmId: string;
  portalToken: string;
}

@Injectable()
export class PortalTokenGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Record<string, unknown>>();
    const token =
      (req.headers as Record<string, string>)['x-portal-token'] ??
      (req.query as Record<string, string>)['token'];

    if (!token) throw new UnauthorizedException('Portal token required');

    const client = await this.prisma.client.findUnique({
      where: { portalToken: token as string },
      select: { id: true, firmId: true, portalToken: true, portalEnabled: true },
    });

    if (!client || !client.portalEnabled) {
      throw new UnauthorizedException('Invalid or disabled portal token');
    }

    (req as Record<string, unknown>)['portalClient'] = {
      clientId: client.id,
      firmId: client.firmId,
      portalToken: client.portalToken,
    } as PortalClient;

    return true;
  }
}
