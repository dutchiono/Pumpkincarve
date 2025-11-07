import Redis, { type RedisOptions } from 'ioredis';

let connection: Redis | null = null;
let listenersAttached = false;

function buildRedisOptions(): RedisOptions {
  const options: RedisOptions = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };

  const lazyConnect = process.env.REDIS_LAZY_CONNECT;
  if (lazyConnect) {
    options.lazyConnect = lazyConnect === 'true';
  }

  const username = process.env.REDIS_USERNAME;
  const password = process.env.REDIS_PASSWORD;

  if (username) {
    options.username = username;
  }

  if (password) {
    options.password = password;
  }

  if (process.env.REDIS_TLS === 'true') {
    options.tls = {};
  }

  return options;
}

export function getRedisConnection(): Redis {
  if (connection) {
    return connection;
  }

  const redisUrl = process.env.REDIS_URL;
  const host = process.env.REDIS_HOST || '127.0.0.1';
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);

  const options = buildRedisOptions();

  if (redisUrl) {
    connection = new Redis(redisUrl, options);
  } else {
    connection = new Redis({
      host,
      port,
      ...options,
    });
  }

  if (!listenersAttached && connection) {
    listenersAttached = true;

    connection.on('connect', () => {
      console.log('[Redis] connected');
    });

    connection.on('error', (error) => {
      console.error('[Redis] connection error', error);
    });

    connection.on('end', () => {
      console.warn('[Redis] connection closed');
      listenersAttached = false;
      connection = null;
    });
  }

  void connection.connect().catch((error) => {
    console.error('[Redis] initial connect failed', error);
  });

  return connection;
}


