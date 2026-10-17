/* global describe beforeEach it */

const {expect} = require('chai')
const request = require('supertest')
const db = require('../db')
const app = require('../index')
const {signToken} = require('../auth/token')
const User = db.model('user')
const Recipie = db.model('recipie')

process.env.JWT_SECRET = 'test-secret'

describe('Recipie routes', () => {
  let owner, other, ownerToken, otherToken

  beforeEach(() => {
    return db.sync({force: true})
      .then(() => Promise.all([
        User.create({email: 'owner@example.com', password: 'password1'}),
        User.create({email: 'other@example.com', password: 'password2'})
      ]))
      .then(users => {
        [owner, other] = users
        ownerToken = signToken(owner)
        otherToken = signToken(other)
      })
  })

  const pumpkinBread = {name: 'Pumpkin Bread', ingredients: ['pumpkin'], recipie: ['bake it']}

  describe('GET /api/recipies', () => {
    it('is public', () => {
      return Recipie.create(Object.assign({AuthorId: owner.id}, pumpkinBread))
        .then(() => request(app).get('/api/recipies').expect(200))
        .then(res => {
          expect(res.body).to.be.an('array')
          expect(res.body[0].name).to.equal('Pumpkin Bread')
        })
    })
  })

  describe('POST /api/recipies', () => {
    it('returns 401 without a token', () => {
      return request(app).post('/api/recipies').send(pumpkinBread).expect(401)
    })

    it('sets the author to the caller, ignoring the body', () => {
      return request(app)
        .post('/api/recipies')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(Object.assign({AuthorId: other.id}, pumpkinBread))
        .expect(200)
        .then(res => {
          expect(res.body.AuthorId).to.equal(owner.id)
          expect(res.body.recipie).to.deep.equal(['bake it'])
        })
    })
  })

  describe('DELETE /api/recipies/:id', () => {
    let recipe

    beforeEach(() => Recipie.create(Object.assign({AuthorId: owner.id}, pumpkinBread))
      .then(created => {
        recipe = created
      }))

    it('returns 401 without a token', () => {
      return request(app).delete(`/api/recipies/${recipe.id}`).expect(401)
    })

    it("returns 403 for someone else's recipe", () => {
      return request(app)
        .delete(`/api/recipies/${recipe.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403)
        .then(() => Recipie.findById(recipe.id))
        .then(found => expect(found).to.not.equal(null))
    })

    it('returns 404 when the recipe does not exist', () => {
      return request(app)
        .delete(`/api/recipies/${recipe.id + 1}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404)
    })

    it("deletes the owner's own recipe", () => {
      return request(app)
        .delete(`/api/recipies/${recipe.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200)
        .then(() => Recipie.findById(recipe.id))
        .then(found => expect(found).to.equal(null))
    })
  })
})
