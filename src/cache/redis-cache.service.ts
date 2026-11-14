import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Optional Redis cache. If REDIS_URL is missing or unreachable, the app
 * continues without cache (no crash). Used for short-TTL list endpoints.
 */
@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private client: Redis | null = null;
  private enabled = false;
  private warnedOnce = false;
  private readonly ttlSeconds: number;

  constructor(private readonly cfg: ConfigService) {
    this.ttlSeconds = parseInt(
      cfg.get<string>('CACHE_TTL_SECONDS', '60'),
      10,
    );
  }

  async onModuleInit(): Promise<void> {
    const url = this.cfg.get<string>('REDIS_URL')?.trim();
    if (!url) {
      this.logDegrade('REDIS_URL not set — running without cache');
      return;
    }

    try {
      const client = new Redis(url, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: true,
        connectTimeout: 3000,
        lazyConnect: true,
        retryStrategy: () => null, // do not keep retrying forever
      });

      client.on('error', () => {
        // Suppress noisy reconnect spam; we handle failures per-call.
      });

      await client.connect();
      const pong = await client.ping();
      if (pong !== 'PONG') {
        throw new Error(`Unexpected PING response: ${pong}`);
      }

      this.client = client;
      this.enabled = true;
      this.logger.log('Redis cache connected');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logDegrade(`Redis unreachable (${message}) — continuing without cache`);
      await this.safeQuit();
      this.client = null;
      this.enabled = false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.safeQuit();
  }

  isEnabled(): boolean {
    return this.enabled && this.client !== null;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isEnabled()) return null;
    try {
      const raw = await this.client!.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      this.disableOnError();
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (!this.isEnabled()) return;
    try {
      const ttl = ttlSeconds ?? this.ttlSeconds;
      await this.client!.set(key, JSON.stringify(value), 'EX', ttl);
    } catch {
      this.disableOnError();
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isEnabled()) return;
    try {
      await this.client!.del(key);
    } catch {
      this.disableOnError();
    }
  }

  /** Delete keys matching a prefix (SCAN + DEL). Best-effort. */
  async delByPrefix(prefix: string): Promise<void> {
    if (!this.isEnabled()) return;
    try {
      let cursor = '0';
      do {
        const [next, keys] = await this.client!.scan(
          cursor,
          'MATCH',
          `${prefix}*`,
          'COUNT',
          100,
        );
        cursor = next;
        if (keys.length > 0) {
          await this.client!.del(...keys);
        }
      } while (cursor !== '0');
    } catch {
      this.disableOnError();
    }
  }

  private logDegrade(message: string): void {
    if (this.warnedOnce) return;
    this.warnedOnce = true;
    this.logger.warn(message);
  }

  private disableOnError(): void {
    if (!this.enabled) return;
    this.enabled = false;
    this.logDegrade('Redis error during cache op — disabling cache for this process');
  }

  private async safeQuit(): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.quit();
    } catch {
      try {
        this.client.disconnect();
      } catch {
        /* ignore */
      }
    }
  }
}
