declare const process: {
  env: Record<string, string | undefined>;
};

export interface AppConfig {
  port: number;
  environment: string;
  database: {
    url: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  ollama: {
    baseUrl: string;
    model: string;
  };
  throttle: {
    ttl: number;
    limit: number;
  };
}

export default function configuration(): AppConfig {
  return {
    port: Number.parseInt(process.env.PORT || '3000', 10),
    environment: process.env.NODE_ENV || 'development',
    database: {
      url: process.env.DATABASE_URL || '',
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: Number.parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
    },
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'qwen2.5:latest',
    },
    throttle: {
      ttl: Number.parseInt(process.env.THROTTLE_TTL || '60', 10),
      limit: Number.parseInt(process.env.THROTTLE_LIMIT || '100', 10),
    },
  };
}
