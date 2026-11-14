import { ConfigService } from '@nestjs/config';
import { RedisCacheService } from './redis-cache.service';

describe('RedisCacheService', () => {
  it('stays disabled when REDIS_URL is unset', async () => {
    const cfg = {
      get: (key: string, def?: string) =>
        key === 'CACHE_TTL_SECONDS' ? def : undefined,
    } as unknown as ConfigService;

    const service = new RedisCacheService(cfg);
    await service.onModuleInit();

    expect(service.isEnabled()).toBe(false);
    expect(await service.get('any')).toBeNull();
    await service.set('any', { ok: true });
    await service.onModuleDestroy();
  });
});
