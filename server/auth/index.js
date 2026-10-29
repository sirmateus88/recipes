const router = require('express').Router()
const User = require('../db/models/user')
const {signToken, publicProfile, requireUser} = require('./token')
const {authLimiter} = require('../rateLimit')
module.exports = router

const MIN_PASSWORD_LENGTH = 8

// emails are matched case-insensitively, so store and look them up lowercased
router.use((req, res, next) => {
  if (req.body && typeof req.body.email === 'string') {
    req.body.email = req.body.email.trim().toLowerCase()
  }
  next()
})

const sendAuth = (res, user, status) =>
  res.status(status || 200).json({token: signToken(user), user: publicProfile(user)})

router.post('/login', authLimiter, (req, res, next) => {
  const {email, password} = req.body
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(401).send('Invalid email or password')
  }
  User.findOne({where: {email}})
    .then(user => (user ? user.correctPassword(password) : Promise.resolve(false))
      .then(correct => (correct
        ? sendAuth(res, user)
        : res.status(401).send('Invalid email or password'))))
    .catch(next)
})

router.post('/signup', authLimiter, (req, res, next) => {
  // only take email and password, so clients can't set e.g. googleId
  const {email, password} = req.body
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).send(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  }
  User.create({email, password})
    .then(user => sendAuth(res, user, 201))
    .catch(err => {
      if (err.name === 'SequelizeUniqueConstraintError') {
        res.status(409).send('User already exists')
      } else if (err.name === 'SequelizeValidationError') {
        res.status(400).send('A valid email is required')
      } else {
        next(err)
      }
    })
})

// tokens are stateless, so logging out is the client discarding its token
router.post('/logout', (req, res) => {
  res.sendStatus(200)
})

router.get('/me', requireUser, (req, res) => {
  res.json(publicProfile(req.user))
})

router.use('/google', require('./google'))
