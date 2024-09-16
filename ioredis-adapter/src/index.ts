import type Redis from "ioredis";
import type { RedisKey } from "ioredis";
import type { Pipeline } from "@upstash/redis";
import type { Redis as RatelimitRedis } from "../../src/types";

export type IsDenied = 0 | 1;

class PipelineAdapter {
  private client: Redis;
  constructor(client: Redis) {
    this.client = client;
  }

  length = (): number => {
    return this.client.multi().length;
  };

  exec = async <TCommandResults extends unknown[] = []>() => {
    return (await this.client.multi().exec()) as TCommandResults;
  };

  sdiffstore = (destination: RedisKey, ...keys: RedisKey[]) => {
    this.client.multi().sdiffstore(destination, ...keys);
    return this as unknown as Pipeline;
  };

  del = (...keys: RedisKey[]) => {
    this.client.multi().del(...keys);
    return this as unknown as Pipeline;
  };

  sadd = (key: RedisKey, ...members: unknown[]) => {
    this.client.multi().sadd(key, ...(members as RedisKey[]));
    return this as unknown as Pipeline;
  };

  sunionstore = (destination: RedisKey, ...keys: RedisKey[]) => {
    this.client.multi().sunionstore(destination, ...keys);
    return this as unknown as Pipeline;
  };

  set = (key: RedisKey, value: unknown, options?: unknown) => {
    this.client.multi().set(key, value as string);
    if (
      options &&
      typeof options === "object" &&
      "px" in options &&
      options?.px
    ) {
      this.client.multi().pexpire(key, options.px as number);
    }
    return this as unknown as Pipeline;
  };
}

export class ioRedisAdapter implements RatelimitRedis {
  private redis: Redis;
  constructor(redis: Redis) {
    this.redis = redis;
  }

  sadd = async <TData>(key: string, ...members: TData[]) => {
    return this.redis.sadd(key, ...members.map((m) => String(m)));
  };

  eval = async <TArgs extends unknown[], TData = unknown>(
    script: string,
    keys: string[],
    args: TArgs
  ) => {
    return this.redis.eval(
      script,
      keys.length,
      ...keys,
      ...(args ?? []).map((a) => String(a))
    ) as Promise<TData>;
  };

  evalsha = async <TArgs extends unknown[], TData = unknown>(
    sha1: string,
    keys: string[],
    args: TArgs
  ) => {
    return this.redis.evalsha(
      sha1,
      keys.length,
      ...keys,
      ...(args ?? []).map((a) => String(a))
    ) as Promise<TData>;
  };

  hset = async <TValue>(key: string, obj: { [key: string]: TValue }) => {
    return this.redis.hset(key, obj);
  };

  scriptLoad = async (...args: [script: string]) => {
    return this.redis.script("LOAD", ...args) as Promise<string>;
  };

  smismember = async (key: string, members: string[]) => {
    return this.redis.smismember(key, members) as Promise<IsDenied[]>;
  };

  multi = () => {
    return new PipelineAdapter(this.redis) as unknown as Pipeline;
  };
}
