/* global describe beforeEach afterEach it */

const {expect} = require('chai')
const request = require('supertest')
const jwt = require('jsonwebtoken')
const db = require('../db')
const app = require('../index')
const {signToken} = require('../auth/token')
const {User, Recipe, Save, Recent, CreditUse} = require('../db/models')
const {firstOfThisMonth} = require('./recipeLists')

process.env.JWT_SECRET = 'test-secret'

describe('Home, recents and saves', () => {
  let cook, other, token, otherToken

  const get = (path, as = token) => request(app).get(path).set('Authorization', `Bearer ${as}`)

  const makeImports = count => Recipe.bulkCreate(
    Array.from({length: count}, (_, idx) => ({
      kind: 'import',
      title: `Import ${idx}`,
      photoUrl: `https://example.com/${idx}.jpg`,
      sourceUrl: `https://example.com/${idx}`,
      siteName: 'example.com'
    })),
    {returning: true}
  )

  const makeOwn = (user, title) => Recipe.create({
    kind: 'own',
    ownerId: user.id,
    title,
    servings: 4,
    ingredients: [{line: 'secret ingredient'}],
    steps: [{text: 'secret step'}]
  })

  // the first recipe in the list gets the oldest time
  const timed = (user, recipes, field) => recipes.map((recipe, idx) => ({
    userId: user.id,
    recipeId: recipe.id,
    [field]: new Date(Date.UTC(2026, 0, 1, 0, 0, idx))
  }))

  const saveAll = (user, recipes) => Save.bulkCreate(timed(user, recipes, 'savedAt'))
  const openAll = (user, recipes) => Recent.bulkCreate(timed(user, recipes, 'lastOpenedAt'))

  beforeEach(() => {
    delete process.env.CREDITS_VISIBLE
    return db.sync({force: true})
      .then(() => Promise.all([
        User.create({email: 'cook@example.com', password: 'password1'}),
        User.create({email: 'other@example.com', password: 'password2'})
      ]))
      .then(users => {
        [cook, other] = users
        token = signToken(cook)
        otherToken = signToken(other)
      })
  })

  afterEach(() => {
    delete process.env.CREDITS_VISIBLE
  })

  describe('tokens', () => {
    it('needs a token on every route', () => {
      const id = '00000000-0000-4000-8000-000000000000'
      return Promise.all([
        request(app).get('/api/home').expect(401),
        request(app).get('/api/recents').expect(401),
        request(app).post('/api/recents').send({recipeId: id}).expect(401),
        request(app).get('/api/saves').expect(401),
        request(app).put(`/api/saves/${id}`).expect(401),
        request(app).delete(`/api/saves/${id}`).expect(401)
      ])
    })

    it('treats a token from before ids became UUIDs as signed out', () => {
      const oldToken = jwt.sign({id: 7}, process.env.JWT_SECRET)
      return get('/api/home', oldToken).expect(401)
        .then(() => get('/auth/me', oldToken).expect(401))
    })
  })

  describe('GET /api/home', () => {
    it('is empty for a new account, with 5 credits and the counter off', () => {
      return get('/api/home').expect(200)
        .then(res => expect(res.body).to.deep.equal({
          plan: 'free',
          creditsLeft: 5,
          creditsVisible: false,
          recents: {items: [], hasMore: false},
          saves: {items: [], hasMore: false}
        }))
    })

    it('returns the 11 latest recents and the 10 latest saves, newest first', () => {
      return makeImports(12)
        .then(recipes => Promise.all([saveAll(cook, recipes), openAll(cook, recipes)]))
        .then(() => get('/api/home').expect(200))
        .then(res => {
          expect(res.body.recents.items).to.have.length(11)
          expect(res.body.recents.hasMore).to.equal(true)
          expect(res.body.recents.items[0].title).to.equal('Import 11')
          expect(res.body.saves.items).to.have.length(10)
          expect(res.body.saves.hasMore).to.equal(true)
          expect(res.body.saves.items[0].title).to.equal('Import 11')
        })
    })

    it('says no more exist when the lists fit exactly', () => {
      return makeImports(10)
        .then(recipes => saveAll(cook, recipes))
        .then(() => get('/api/home').expect(200))
        .then(res => expect(res.body.saves.hasMore).to.equal(false))
    })

    it('sends what a card shows and no ingredients or steps', () => {
      return makeOwn(cook, 'Lasagne')
        .then(recipe => openAll(cook, [recipe]))
        .then(() => get('/api/home').expect(200))
        .then(res => {
          const card = res.body.recents.items[0]
          expect(card).to.have.all.keys('id', 'kind', 'title', 'photoUrl', 'siteName', 'sourceUrl', 'servings', 'openedAt')
          expect(JSON.stringify(res.body)).to.not.include('secret')
        })
    })

    it('answers in under 300 ms with 500 saves', function () {
      this.timeout(30000)
      return makeImports(500)
        .then(recipes => saveAll(cook, recipes))
        .then(() => {
          const started = Date.now()
          return get('/api/home').expect(200)
            .then(() => expect(Date.now() - started).to.be.below(300))
        })
    })
  })

  describe('credits', () => {
    const use = (month, recipe) => CreditUse.create({
      userId: cook.id,
      useId: require('crypto').randomUUID(),
      kind: 'import',
      source: 'paste',
      month,
      recipeId: recipe && recipe.id
    })

    it('counts only this UTC month', () => {
      return Promise.all([use(firstOfThisMonth()), use(firstOfThisMonth()), use('2020-01-01')])
        .then(() => get('/api/home').expect(200))
        .then(res => expect(res.body.creditsLeft).to.equal(3))
    })

    it('stops at 0', () => {
      return Promise.all(Array.from({length: 6}, () => use(firstOfThisMonth())))
        .then(() => get('/api/home').expect(200))
        .then(res => expect(res.body.creditsLeft).to.equal(0))
    })

    it("finds the first of the month in UTC, whatever the server's clock zone", () => {
      expect(firstOfThisMonth(new Date('2026-11-30T23:59:59Z'))).to.equal('2026-11-01')
      expect(firstOfThisMonth(new Date('2026-12-01T00:00:00Z'))).to.equal('2026-12-01')
    })

    it('reports the switch and the plan', () => {
      process.env.CREDITS_VISIBLE = 'true'
      return get('/api/home').expect(200)
        .then(res => expect(res.body.creditsVisible).to.equal(true))
        .then(() => cook.update({plan: 'subscribed'}))
        .then(() => get('/api/home').expect(200))
        .then(res => expect(res.body.plan).to.equal('subscribed'))
    })
  })

  describe('POST /api/recents', () => {
    const open = (recipeId, as = token) => request(app)
      .post('/api/recents')
      .set('Authorization', `Bearer ${as}`)
      .send({recipeId})

    it('keeps one row per recipe, moved to the top on reopening', () => {
      return makeImports(2)
        .then(([first, second]) => open(first.id).expect(204)
          .then(() => new Promise(resolve => setTimeout(resolve, 5)))
          .then(() => open(second.id).expect(204))
          .then(() => new Promise(resolve => setTimeout(resolve, 5)))
          .then(() => open(first.id).expect(204))
          .then(() => get('/api/recents').expect(200))
          .then(res => expect(res.body.items.map(item => item.id)).to.deep.equal([first.id, second.id])))
    })

    it("can't open someone else's recipe, or a malformed id", () => {
      return makeOwn(other, 'Private')
        .then(recipe => open(recipe.id).expect(404))
        .then(() => open('42').expect(404))
        .then(() => open(undefined).expect(404))
    })
  })

  describe('PUT and DELETE /api/saves/:recipeId', () => {
    const put = (recipeId, as = token) => request(app)
      .put(`/api/saves/${recipeId}`)
      .set('Authorization', `Bearer ${as}`)
    const del = (recipeId, as = token) => request(app)
      .delete(`/api/saves/${recipeId}`)
      .set('Authorization', `Bearer ${as}`)

    it('saves an import once, however many times it is saved', () => {
      return makeImports(1)
        .then(([recipe]) => put(recipe.id).expect(204)
          .then(() => put(recipe.id).expect(204))
          .then(() => Save.count({where: {userId: cook.id, recipeId: recipe.id}})))
        .then(count => expect(count).to.equal(1))
    })

    it('removes an import from saved and leaves it in recents and on other cooks', () => {
      return makeImports(1)
        .then(([recipe]) => Promise.all([
          saveAll(cook, [recipe]),
          saveAll(other, [recipe]),
          openAll(cook, [recipe])
        ])
          .then(() => del(recipe.id).expect(204))
          .then(() => Promise.all([
            Save.count({where: {userId: cook.id}}),
            Save.count({where: {userId: other.id}}),
            Recent.count({where: {userId: cook.id}}),
            Recipe.findByPk(recipe.id)
          ])))
        .then(([mine, theirs, recents, shared]) => {
          expect(mine).to.equal(0)
          expect(theirs).to.equal(1)
          expect(recents).to.equal(1)
          expect(shared).to.not.equal(null)
        })
    })

    it('refuses to un-save an own recipe, which is deleted instead', () => {
      return makeOwn(cook, 'Mine')
        .then(recipe => saveAll(cook, [recipe])
          .then(() => del(recipe.id).expect(409))
          .then(() => Save.count({where: {userId: cook.id}})))
        .then(count => expect(count).to.equal(1))
    })

    it("can't save or un-save someone else's recipe, or a malformed id", () => {
      return makeOwn(other, 'Private')
        .then(recipe => put(recipe.id).expect(404)
          .then(() => del(recipe.id).expect(404)))
        .then(() => put('42').expect(404))
        .then(() => del('42').expect(404))
    })
  })

  describe('paging', () => {
    const walk = (path, seen = []) => get(path).expect(200)
      .then(res => {
        const all = seen.concat(res.body.items)
        return res.body.nextCursor
          ? walk(`${path.split('?')[0]}?after=${res.body.nextCursor}`, all).then(pages => [res.body].concat(pages))
          : [res.body]
      })

    it('walks every saved recipe, 50 at a time, without repeats, and gives the total', function () {
      this.timeout(30000)
      return makeImports(120)
        .then(recipes => saveAll(cook, recipes))
        .then(() => walk('/api/saves'))
        .then(pages => {
          expect(pages.map(result => result.items.length)).to.deep.equal([50, 50, 20])
          expect(pages[0].total).to.equal(120)
          const titles = [].concat(...pages.map(result => result.items.map(item => item.title)))
          expect(new Set(titles).size).to.equal(120)
          expect(titles[0]).to.equal('Import 119')
          expect(titles[119]).to.equal('Import 0')
        })
    })

    it('walks recents, and keeps rows that share a time apart', () => {
      const sameTime = new Date('2026-01-01T00:00:00Z')
      return makeImports(60)
        .then(recipes => Recent.bulkCreate(recipes.map(recipe => ({
          userId: cook.id, recipeId: recipe.id, lastOpenedAt: sameTime
        }))))
        .then(() => walk('/api/recents'))
        .then(pages => {
          expect(pages.map(result => result.items.length)).to.deep.equal([50, 10])
          const ids = [].concat(...pages.map(result => result.items.map(item => item.id)))
          expect(new Set(ids).size).to.equal(60)
        })
    })

    it('refuses a bad cursor', () => {
      return get('/api/saves?after=nonsense').expect(400)
        .then(() => get('/api/recents?after=nonsense').expect(400))
    })
  })

  describe("other accounts' data", () => {
    it('never appears in home or the full lists', () => {
      return makeOwn(other, 'Private')
        .then(recipe => Promise.all([saveAll(other, [recipe]), openAll(other, [recipe])]))
        .then(() => Promise.all([get('/api/home'), get('/api/saves'), get('/api/recents')]))
        .then(([home, saves, recents]) => {
          expect(home.body.recents.items).to.have.length(0)
          expect(home.body.saves.items).to.have.length(0)
          expect(saves.body.items).to.have.length(0)
          expect(saves.body.total).to.equal(0)
          expect(recents.body.items).to.have.length(0)
        })
        .then(() => get('/api/home', otherToken).expect(200))
        .then(res => expect(res.body.saves.items).to.have.length(1))
    })
  })
})
