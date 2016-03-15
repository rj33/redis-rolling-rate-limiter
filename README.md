# Rolling Rate Limiter with Redis

A Rate Limiter using a rolling time window with Redis.
It was originally based on https://github.com/classdojo/rolling-rate-limiter
But several issues has been fixed like :
- Removing closure to fix a memory leak if a lot of users request the limit
- Instead of fetching the whole range (with ZRANGE(0, -1)) and then count the number of elements, we use ZCARD, and only fetch the first timestamp and the last timestamp, so we avoid a large operation in Redis and save a lot of memory if we use a large limit (like 3000 request / min).
- Fixing a bug with interval in microseconds instead of milliseconds
- More unit testing
- Avoid a race condition with ZREM and ZADD

# Requirements

- NodeJS >= 0.12.x
- Redis >= 2.6.12

# Examples
