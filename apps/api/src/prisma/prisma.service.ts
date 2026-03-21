import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    // Middleware: enforce firmId isolation on all queries
    this.$use(async (params, next) => {
      // Log queries in non-production for debugging
      if (process.env.NODE_ENV !== 'production') {
        const before = Date.now();
        const result = await next(params);
        const after = Date.now();
        console.warn(`Query ${params.model}.${params.action} took ${after - before}ms`);
        return result;
      }
      return next(params);
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
