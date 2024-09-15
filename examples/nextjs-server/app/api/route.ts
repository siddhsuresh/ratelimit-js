export const dynamic = "force-dynamic";
import { Ratelimit } from "../../../../dist/index";
import { RedisAdapter } from "../../../../ioredis-adapter/dist/index";
import Redis from "ioredis";

const redis = new Redis();

const redisAdapter = new RedisAdapter(redis);

const ratelimit = new Ratelimit({
  redis: redisAdapter,
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  prefix: "test",
});

export async function GET(request: Request) {
  const identifier = "api";
  const { success, limit, remaining } = await ratelimit.limit(identifier);
  const response = {
    success: success,
    limit: limit,
    remaining: remaining,
  };
  if (!success) {
    return new Response(JSON.stringify(response), { status: 429 });
  }
  return new Response(JSON.stringify(response));
}
