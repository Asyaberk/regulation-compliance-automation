import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

//caches compliance audit results to prevent database/LLM overload under high user load
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private client: Redis;

    constructor(private readonly configService: ConfigService) { }
    
    //init Redis connection pool upon module init
    async onModuleInit(): Promise<void> {
        const host = this.configService.get<string>('redis.host') || 'localhost';
        const port = this.configService.get<number>('redis.port') || 6379;
        const password = this.configService.get<string>('redis.password');

        this.client = new Redis({
            host,
            port,
            password: password || undefined,
            lazyConnect: true
        });

        try {
            await this.client.connect();
        } catch {
        }


    }


    //disconnects redis
    async onModuleDestroy() {
        if (this.client) {
            await this.client.quit();
        }
    }


    //retrieve cached string value with key
    async get(key: string): Promise<string | null>{
        try {
            return await this.client.get(key);
        } catch {
            return null;
        }
    }

    //sets TTL
    async set(key: string, value: string, ttlseconds: number = 3600): Promise<void>{
        try {
            await this.client.set(key, value, 'EX', ttlseconds);
        } catch {
        }
    }


    //delete cache key
    async del(key: string): Promise<void>{
        try {
            await this.client.del(key);
        } catch {
        }
    }




}