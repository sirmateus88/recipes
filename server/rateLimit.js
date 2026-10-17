const {rateLimit} = require('express-rate-limit')

// Per-IP limits: parse routes spend Spoonacular quota, auth routes invite
// password guessing. Skipped under test so specs can make many requests.
const limiter = limit => rateLimit({
  windowMs: 15 * 60 * 1000,
  limit,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test'
})

module.exports = {
  parseLimiter: limiter(60),
  authLimiter: limiter(20)
}
