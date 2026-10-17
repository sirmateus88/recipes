/* global describe beforeEach it */

const {expect} = require('chai')
const request = require('supertest')
const jwt = require('jsonwebtoken')
const db = require('../db')
const app = require('../index')
const User = db.model('user')

process.env.JWT_SECRET = 'test-secret'

describe('Auth routes', () => {
  const email = 'cody@puppybook.com'
  const password = 'bonesbones'

  beforeEach(() => {
    return db.sync({force: true})
  })

  describe('POST /auth/signup', () => {
    it('creates an account and returns a token and profile', () => {
      return request(app)
        .post('/auth/signup')
        .send({email, password})
        .expect(201)
        .then(res => {
          expect(res.body.token).to.be.a('string')
          expect(res.body.user).to.deep.equal({id: res.body.user.id, email})
        })
    })

    it('only accepts email and password from the body', () => {
      return request(app)
        .post('/auth/signup')
        .send({email, password, googleId: 'sneaky'})
        .expect(201)
        .then(() => User.findOne({where: {email}}))
        .then(user => expect(user.googleId).to.equal(null))
    })

    it('rejects an invalid email', () => {
      return request(app)
        .post('/auth/signup')
        .send({email: 'not-an-email', password})
        .expect(400)
    })

    it('rejects a short password', () => {
      return request(app)
        .post('/auth/signup')
        .send({email, password: 'short'})
        .expect(400)
    })

    it('returns 409 for a duplicate email', () => {
      return User.create({email, password})
        .then(() => request(app)
          .post('/auth/signup')
          .send({email, password})
          .expect(409))
    })
  })

  describe('POST /auth/login', () => {
    beforeEach(() => User.create({email, password}))

    it('returns a token for correct credentials', () => {
      return request(app)
        .post('/auth/login')
        .send({email, password})
        .expect(200)
        .then(res => {
          expect(res.body.token).to.be.a('string')
          expect(res.body.user.email).to.equal(email)
          expect(res.body.user).to.not.have.property('password')
        })
    })

    it('gives the same 401 for a wrong password and an unknown email', () => {
      return Promise.all([
        request(app).post('/auth/login').send({email, password: 'wrongwrong'}).expect(401),
        request(app).post('/auth/login').send({email: 'nobody@example.com', password}).expect(401)
      ])
        .then(([wrongPassword, unknownEmail]) => {
          expect(wrongPassword.text).to.equal('Invalid email or password')
          expect(unknownEmail.text).to.equal(wrongPassword.text)
        })
    })
  })

  describe('GET /auth/me', () => {
    it('returns the current user for a valid token', () => {
      return request(app)
        .post('/auth/signup')
        .send({email, password})
        .then(res => request(app)
          .get('/auth/me')
          .set('Authorization', `Bearer ${res.body.token}`)
          .expect(200))
        .then(res => expect(res.body.email).to.equal(email))
    })

    it('returns 401 without a token', () => {
      return request(app).get('/auth/me').expect(401)
    })

    it('returns 401 for an invalid token', () => {
      return request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer not-a-token')
        .expect(401)
    })

    it('returns 401 for an expired token', () => {
      return User.create({email, password})
        .then(user => {
          const expired = jwt.sign({id: user.id, exp: Math.floor(Date.now() / 1000) - 60}, process.env.JWT_SECRET)
          return request(app)
            .get('/auth/me')
            .set('Authorization', `Bearer ${expired}`)
            .expect(401)
        })
    })
  })

  describe('POST /auth/logout', () => {
    it('returns 200', () => {
      return request(app).post('/auth/logout').expect(200)
    })
  })

  describe('GET /api/users', () => {
    it('does not list users', () => {
      return User.create({email, password})
        .then(() => request(app).get('/api/users'))
        .then(res => {
          expect(res.status).to.equal(404)
          expect(res.text).to.not.include(email)
        })
    })
  })
})
