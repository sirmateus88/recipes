/* global describe beforeEach it */

const {expect} = require('chai')
const request = require('supertest')
const db = require('../db')
const app = require('../index')
const {signToken} = require('../auth/token')
const {User, Recipe, Save, Recent} = require('../db/models')

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

  const createRecipe = () => request(app)
    .post('/api/recipies')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send(pumpkinBread)
    .expect(200)
    .then(res => res.body)

  describe('GET /api/recipies', () => {
    it('is gone, with or without a token', () => {
      return request(app).get('/api/recipies').expect(404)
        .then(() => request(app)
          .get('/api/recipies')
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(404))
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
          expect(res.body.name).to.equal('Pumpkin Bread')
          expect(res.body.ingredients).to.deep.equal(['pumpkin'])
          expect(res.body.recipie).to.deep.equal(['bake it'])
        })
    })

    it('stores ingredients and steps as rows', () => {
      return createRecipe()
        .then(created => Recipe.findByPk(created.id))
        .then(found => {
          expect(found.kind).to.equal('own')
          expect(found.ingredients).to.deep.equal([{line: 'pumpkin'}])
          expect(found.steps).to.deep.equal([{text: 'bake it'}])
        })
    })

    it('saves the new recipe for its author', () => {
      return createRecipe()
        .then(created => Save.findOne({where: {userId: owner.id, recipeId: created.id}}))
        .then(save => expect(save).to.not.equal(null))
    })

    it('refuses a recipe with no name, ingredient or step', () => {
      const authedPost = body => request(app)
        .post('/api/recipies')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(Object.assign({}, pumpkinBread, body))
        .expect(400)
      return authedPost({name: ' '})
        .then(() => authedPost({ingredients: []}))
        .then(() => authedPost({recipie: ['']}))
        .then(() => Recipe.count())
        .then(count => expect(count).to.equal(0))
    })
  })

  describe('GET /api/recipies/:id', () => {
    it("returns the owner's recipe in the old shape", () => {
      return createRecipe()
        .then(created => request(app)
          .get(`/api/recipies/${created.id}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200))
        .then(res => expect(res.body.recipie).to.deep.equal(['bake it']))
    })

    it("hides someone else's recipe", () => {
      return createRecipe()
        .then(created => request(app)
          .get(`/api/recipies/${created.id}`)
          .set('Authorization', `Bearer ${otherToken}`)
          .expect(404))
    })

    it('returns 404 for a malformed id', () => {
      return request(app)
        .get('/api/recipies/42')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404)
    })
  })

  describe('DELETE /api/recipies/:id', () => {
    let recipe

    beforeEach(() => createRecipe()
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
        .then(() => Recipe.findByPk(recipe.id))
        .then(found => expect(found).to.not.equal(null))
    })

    it('returns 403 for a shared import', () => {
      return Recipe.create({kind: 'import', title: 'Soup', sourceUrl: 'https://example.com/soup'})
        .then(shared => request(app)
          .delete(`/api/recipies/${shared.id}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(403))
    })

    it('returns 404 when the recipe does not exist', () => {
      return request(app)
        .delete('/api/recipies/00000000-0000-4000-8000-000000000000')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404)
    })

    it('returns 404 for a malformed id', () => {
      return request(app)
        .delete('/api/recipies/42')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404)
    })

    it("deletes the owner's recipe, and its saves and recents", () => {
      return Recent.create({userId: owner.id, recipeId: recipe.id, lastOpenedAt: new Date()})
        .then(() => request(app)
          .delete(`/api/recipies/${recipe.id}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200))
        .then(() => Promise.all([
          Recipe.findByPk(recipe.id),
          Save.count({where: {recipeId: recipe.id}}),
          Recent.count({where: {recipeId: recipe.id}})
        ]))
        .then(([found, saves, recents]) => {
          expect(found).to.equal(null)
          expect(saves).to.equal(0)
          expect(recents).to.equal(0)
        })
    })
  })
})
