var microtime = require("microtime-nodejs");

module.exports = function (options) {

    var redis = options.redis;
    // interval (ms) => interval (microsec)
    var interval = (options.interval || 0) * 1000;
    var maxInInterval = options.maxInInterval;
    // minDifference (ms) => minDifference (microsec)
    var minDifference = options.minDifference ? options.minDifference * 1000 : null;
    var namespace = options.namespace || ("rate-limiter-" + Math.random().toString(36).substr(2, 7));

    if (interval == null || interval <= 0) {
        throw new Error("Must pass a strict positive integer for `interval` option.");
    } else if (maxInInterval == null || maxInInterval <= 0) {
        throw new Error("Must pass a strict positive integer for `maxInInterval` option.");
    } else if (minDifference != null && minDifference < 0) {
        throw new Error("`minDifference` option cannot be negative.");
    } else if(redis == null) {
        throw new Error("`redis` option cannot be null");
    }

    return function (id, cb) {
        if (!cb) {
            cb = id;
            id = "";
        }

        if (typeof cb !== 'function') {
            throw new Error("Callback must be a function.");
        }

        var now = microtime.now();
        var key = namespace + id;
        var clearBefore = now - interval;

        var batch = redis.multi();
        batch.zremrangebyscore(key, 0, clearBefore);
        batch.zcard(key);
        batch.zrange(key, 0, 0);
        batch.zrange(key, -1, -1);
        // Add the now timestamp to the set in the batch then revert this operation later if needed.
        // This prevents the race condition between set indicating rate limit not reached
        // and too many (> maxInInterval) clients querying the state.
        batch.zadd(key, now, now);
        batch.expire(key, Math.ceil(interval / 1000000)); // convert to seconds, as used by redis ttl.
        batch.exec(function (err, resultArr) {
            if (err) return cb(err);

            // IORedis : [null, <response>] 
            // node_redis : [<response>]
            if(resultArr[1].length == 2 && resultArr[1][1] != null) {
                resultArr[1] = resultArr[1][1];
                resultArr[2] = resultArr[2][1];
                resultArr[3] = resultArr[3][1];
            }

            var userSetLength = resultArr[1];
            var userSetFirst = parseInt(resultArr[2], 10);
            var userSetLast = parseInt(resultArr[3], 10);

            // Time left
            var tooManyInInterval = userSetLength >= maxInInterval;
            var timeUntilNextIntervalOpportunity = userSetFirst - now + interval;
            var timeSinceLastRequest = now - userSetLast;

            var timeLeft = null;
            if (tooManyInInterval) {
                timeLeft = timeUntilNextIntervalOpportunity / 1000;
            } else if (minDifference && timeSinceLastRequest < minDifference) {
                var timeUntilNextMinDifferenceOpportunity = minDifference - timeSinceLastRequest;

                timeLeft = Math.min(timeUntilNextIntervalOpportunity, timeUntilNextMinDifferenceOpportunity);
                timeLeft = Math.floor(timeLeft / 1000); // convert from microseconds for user readability.
            }

            if (timeLeft == null) {
                cb(err, 0);
            } else {
                // Remove the now element from the set as it should only
                // hold the timestamps for passed operations.
                redis.zrem(key, now, now, function (err) {
                    cb(err, timeLeft);
                });
            }
        });
    }
};
