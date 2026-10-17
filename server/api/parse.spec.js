/* global describe beforeEach afterEach it */

const {expect} = require('chai')
const request = require('supertest')
const MockAdapter = require('axios-mock-adapter')
const db = require('../db')
const app = require('../index')
const parseRouter = require('./parse')
const {signToken} = require('../auth/token')
const User = db.model('user')

process.env.JWT_SECRET = 'test-secret'

describe('Parse routes', () => {
  let mock, token

  const authedGet = path => request(app).get(path).set('Authorization', `Bearer ${token}`)

  beforeEach(() => {
    process.env.SPOONACULAR_API_KEY = 'test-key'
    mock = new MockAdapter(parseRouter.foodAPI)
    return db.sync({force: true})
      .then(() => User.create({email: 'cook@example.com', password: 'password1'}))
      .then(user => {
        token = signToken(user)
      })
  })

  afterEach(() => mock.restore())

  describe('login', () => {
    const routes = [
      ['/api/parse', {url: 'https://example.com/recipe'}],
      ['/api/parse/convert', {ingredientName: 'flour', sourceAmount: 2.5, sourceUnit: 'cups', targetUnit: 'grams'}]
    ]

    routes.forEach(([path, query]) => {
      it(`GET ${path} returns 401 without a token and never calls Spoonacular`, () => {
        let calledSpoonacular = false
        mock.onAny().reply(() => {
          calledSpoonacular = true
          return [200, {}]
        })

        return request(app)
          .get(path)
          .query(query)
          .expect(401)
          .then(() => expect(calledSpoonacular).to.equal(false))
      })

      it(`GET ${path} returns 401 for an invalid token and never calls Spoonacular`, () => {
        let calledSpoonacular = false
        mock.onAny().reply(() => {
          calledSpoonacular = true
          return [200, {}]
        })

        return request(app)
          .get(path)
          .set('Authorization', 'Bearer not-a-token')
          .query(query)
          .expect(401)
          .then(() => expect(calledSpoonacular).to.equal(false))
      })
    })
  })

  describe('GET /api/parse', () => {
    it('forwards the full recipe URL, including its query string', () => {
      const url = 'https://example.com/recipe?id=1&print=true'
      mock.onGet('recipes/extract').reply(config => {
        expect(config.params.url).to.equal(url)
        expect(config.params.apiKey).to.equal('test-key')
        return [200, {title: 'Pumpkin Bread'}]
      })

      return authedGet('/api/parse')
        .query({url})
        .expect(200)
        .then(res => expect(res.body.title).to.equal('Pumpkin Bread'))
    })

    it('returns a clean error without the upstream response', () => {
      mock.onGet('recipes/extract').reply(500, {secret: 'upstream detail'})

      return authedGet('/api/parse')
        .query({url: 'https://example.com/recipe'})
        .expect(502)
        .then(res => {
          expect(res.body).to.deep.equal({error: 'Could not parse recipe'})
          expect(res.text).to.not.include('test-key')
        })
    })
  })

  describe('GET /api/parse/convert', () => {
    it('forwards the conversion parameters', () => {
      mock.onGet('recipes/convert').reply(config => {
        expect(config.params).to.include({ingredientName: 'flour', sourceAmount: '2.5', sourceUnit: 'cups', targetUnit: 'grams'})
        return [200, {targetAmount: 312.5, targetUnit: 'grams'}]
      })

      return authedGet('/api/parse/convert')
        .query({ingredientName: 'flour', sourceAmount: 2.5, sourceUnit: 'cups', targetUnit: 'grams'})
        .expect(200)
        .then(res => expect(res.body.targetAmount).to.equal(312.5))
    })

    const flourQuery = {ingredientName: 'flour', sourceAmount: 2.5, sourceUnit: 'cups', targetUnit: 'grams'}

    it('returns the Spoonacular response unchanged', () => {
      // a real response for 2.5 cups flour, captured 2026-10-16
      const spoonacularResponse = {
        sourceAmount: 2.5,
        sourceUnit: 'cups',
        targetAmount: 312.5,
        targetUnit: 'grams',
        answer: '2.5 cups flour translates to 312.5 grams.',
        type: 'CONVERSION'
      }
      mock.onGet('recipes/convert').reply(200, spoonacularResponse)

      return authedGet('/api/parse/convert')
        .query(flourQuery)
        .expect(200)
        .then(res => expect(res.body).to.deep.equal(spoonacularResponse))
    })

    it('sends the API key', () => {
      mock.onGet('recipes/convert').reply(config => {
        expect(config.params.apiKey).to.equal('test-key')
        return [200, {}]
      })

      return authedGet('/api/parse/convert').query(flourQuery).expect(200)
    })

    it('passes ingredient names with spaces and symbols through intact', () => {
      mock.onGet('recipes/convert').reply(config => {
        expect(config.params.ingredientName).to.equal('salt & pepper mix')
        expect(config.params.sourceUnit).to.equal('tbsp')
        return [200, {}]
      })

      return authedGet('/api/parse/convert')
        .query({ingredientName: 'salt & pepper mix', sourceAmount: 1, sourceUnit: 'tbsp', targetUnit: 'grams'})
        .expect(200)
    })

    it('does not send parameters the client left out', () => {
      // assert after the request: a failed assertion inside reply() would
      // itself become a 502 and let the test pass
      let sentParams
      mock.onGet('recipes/convert').reply(config => {
        sentParams = config.params
        return [400, {status: 'failure'}]
      })

      return authedGet('/api/parse/convert')
        .query({ingredientName: 'flour', sourceAmount: 2.5, sourceUnit: 'cups'})
        .expect(502)
        .then(() => {
          // axios leaves undefined values out of the query string
          expect(sentParams.targetUnit).to.equal(undefined)
          expect(sentParams.ingredientName).to.equal('flour')
        })
    })

    it('returns 502 with a clean message when Spoonacular rejects the request', () => {
      mock.onGet('recipes/convert').reply(400, {status: 'failure', message: 'upstream detail'})

      return authedGet('/api/parse/convert')
        .query({ingredientName: 'flour', sourceAmount: 2.5, sourceUnit: 'cups', targetUnit: 'parsecs'})
        .expect(502)
        .then(res => {
          expect(res.body).to.deep.equal({error: 'Could not convert ingredient'})
          expect(res.text).to.not.include('upstream detail')
          expect(res.text).to.not.include('test-key')
        })
    })

    it('returns 503 when the Spoonacular quota is used up', () => {
      mock.onGet('recipes/convert').reply(402, {message: 'daily points limit reached'})

      return authedGet('/api/parse/convert')
        .query(flourQuery)
        .expect(503)
        .then(res => expect(res.body).to.deep.equal({error: 'Could not convert ingredient'}))
    })

    it('returns 503 when Spoonacular rate limits us', () => {
      mock.onGet('recipes/convert').reply(429)

      return authedGet('/api/parse/convert').query(flourQuery).expect(503)
    })

    it('returns 502 when Spoonacular cannot be reached', () => {
      mock.onGet('recipes/convert').networkError()

      return authedGet('/api/parse/convert')
        .query(flourQuery)
        .expect(502)
        .then(res => expect(res.body).to.deep.equal({error: 'Could not convert ingredient'}))
    })
  })
})
