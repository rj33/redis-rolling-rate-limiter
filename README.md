# Rolling Rate Limiter with Redis

Rolling Rate Limiter is a module for [Node.js](http://nodejs.org) which provides a basic, but a solid rate limiter using sliding windows stored in Redis. It was inspired from [ClassDojo Rate Limiter](https://github.com/classdojo/rolling-rate-limiter), but several issues has been fixed like :
- Removing closure to fix a memory leak if a lot of users request the limit
- Instead of fetching the whole range (with ZRANGE(0, -1)) and then count the number of elements, we use ZCARD, and only fetch the first timestamp and the last timestamp, so we avoid a large operation in Redis and save a lot of memory if we use a large limit (like 3000 request / min).
- Fixing a bug with interval in microseconds instead of milliseconds
- More unit testing
- Avoid a race condition with ZREM and ZADD

# Requirements

- NodeJS >= 0.12.x
- Redis >= 2.6.12

# Examples
