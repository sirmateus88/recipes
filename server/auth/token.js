const jwt = require('jsonwebtoken')
const {User} = require('../db/models')

const TOKEN_LIFETIME = '30d'

const signToken = user =>
  jwt.sign({id: user.id}, process.env.JWT_SECRET, {expiresIn: TOKEN_LIFETIME})

const publicProfile = user => ({id: user.id, email: user.email})

// Reads `Authorization: Bearer <token>`, sets req.user, or responds 401
const requireUser = (req, res, next) => {
  const [scheme, token] = (req.get('Authorization') || '').split(' ')
  if (scheme !== 'Bearer' || !token) return res.status(401).send('Not logged in')

  let payload
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET)
  } catch (err) {
    return res.status(401).send('Not logged in')
  }

  User.findById(payload.id)
    .then(user => {
      if (!user) return res.status(401).send('Not logged in')
      req.user = user
      next()
    })
    .catch(next)
}

module.exports = {signToken, publicProfile, requireUser}
