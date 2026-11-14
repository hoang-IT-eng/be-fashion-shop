import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Public } from '../auth/decorators/public.decorator';
import { RedisCacheService } from '../cache/redis-cache.service';

@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly redisCache: RedisCacheService,
    private readonly cfg: ConfigService,
  ) {}

  /** Liveness — process is up (no dependency checks). */
  @Get('health')
  @Public()
  health() {
    return {
      status: 'ok',
      service: 'be-fashion-shop',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness — DB must be reachable.
   * Redis is checked only when REDIS_URL is configured.
   */
  @Get('ready')
  @Public()
  async ready() {
    const checks: Record<string, string> = {};
    let ok = true;

    try {
      await this.dataSource.query('SELECT 1');
      checks.database = 'up';
    } catch {
      checks.database = 'down';
      ok = false;
    }

    const redisUrl = this.cfg.get<string>('REDIS_URL')?.trim();
    if (redisUrl) {
      if (this.redisCache.isEnabled()) {
        checks.redis = 'up';
      } else {
        checks.redis = 'down';
        ok = false;
      }
    } else {
      checks.redis = 'skipped';
    }

    const body = {
      status: ok ? 'ready' : 'not_ready',
      checks,
      timestamp: new Date().toISOString(),
    };

    if (!ok) {
      throw new ServiceUnavailableException(body);
    }
    return body;
  }
}
