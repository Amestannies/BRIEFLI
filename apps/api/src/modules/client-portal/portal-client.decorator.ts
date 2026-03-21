import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { PortalClient } from './portal-token.guard';

export const CurrentPortalClient = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): PortalClient => {
    const req = ctx.switchToHttp().getRequest<Record<string, unknown>>();
    return req['portalClient'] as PortalClient;
  },
);
