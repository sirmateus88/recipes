const {rateLimit} = require('express-rate-limit')

// Railway's edge sets X-Real-IP to the client's address; req.ip behind its
// proxy chain can be an edge address shared by many users
const clientIp = req => req.get('X-Real-IP') || req.ip

// Auth routes normalise the email before the limiters run (see auth/index.js)
const email = req => `email:${req.body.email}`

// Parse routes spend Spoonacular quota, auth routes invite password guessing.
// Skipped under test so specs can make many requests.
const limiter = (limit, keyGenerator) => rateLimit({
  windowMs: 15 * 60 * 1000,
  limit,
  keyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test'
})

module.exports = {
  clientIp,
  email,
  parseLimiter: limiter(60, clientIp),
  authLimiter: [limiter(10, clientIp), limiter(10, email)]
}
