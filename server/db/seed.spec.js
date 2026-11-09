/* global describe beforeEach afterEach it */

const {expect} = require('chai')
const db = require('./index')
const {User, Recipe, Save, Recent, CreditUse} = require('./models')
const {problemWith, emailFor, add, remove, reset} = require('../../script/seed')

describe('Seed tool', () => {
  const env = {APP_ENV: 'dev', SEED_PASSWORD: 'password1'}

  describe('guards', () => {
    it('refuses in production, or when APP_ENV is not set', () => {
      expect(problemWith('all', [], {APP_ENV: 'production', SEED_PASSWORD: 'x'})).to.include('Refusing')
      expect(problemWith('all', [], {SEED_PASSWORD: 'x'})).to.include('Refusing')
    })

    it('runs in dev and test', () => {
      expect(problemWith('all', [], env)).to.equal(null)
      expect(problemWith('add', ['new'], Object.assign({}, env, {APP_ENV: 'test'}))).to.equal(null)
    })

    it('needs a known action, known accounts and a password', () => {
      expect(problemWith('wipe', ['new'], env)).to.include('Usage')
      expect(problemWith('add', [], env)).to.include('Usage')
      expect(problemWith('all', ['new'], env)).to.include('Usage')
      expect(problemWith('add', ['nobody'], env)).to.include('Unknown')
      expect(problemWith('add', ['new'], {APP_ENV: 'dev'})).to.include('SEED_PASSWORD')
      expect(problemWith('remove', ['new'], {APP_ENV: 'dev'})).to.equal(null)
    })
  })

  describe('accounts', () => {
    let realAccount
    const seedPassword = process.env.SEED_PASSWORD

    const countsFor = user => Promise.all([
      Save.count({where: {userId: user.id}}),
      Recent.count({where: {userId: user.id}}),
      CreditUse.count({where: {userId: user.id}})
    ])

    const findSeed = name => User.findOne({where: {email: emailFor(name)}})

    beforeEach(() => {
      process.env.SEED_PASSWORD = 'password1'
      return db.sync({force: true})
        .then(() => User.create({email: 'real@example.com', password: 'password1'}))
        .then(user => {
          realAccount = user
        })
    })

    afterEach(() => {
      if (seedPassword === undefined) delete process.env.SEED_PASSWORD
      else process.env.SEED_PASSWORD = seedPassword
    })

    it('builds each account to its size', function () {
      this.timeout(60000)
      return add('new')
        .then(() => add('light'))
        .then(() => add('heavy'))
        .then(() => add('out-of-credits'))
        .then(() => Promise.all(['new', 'light', 'heavy', 'out-of-credits'].map(findSeed)))
        .then(users => Promise.all(users.map(countsFor)))
        .then(counts => expect(counts).to.deep.equal([
          [0, 0, 0],
          [5, 4, 2],
          [200, 60, 3],
          [3, 2, 5]
        ]))
    })

    it('add skips an account that exists', () => {
      return add('light')
        .then(() => findSeed('light'))
        .then(first => add('light')
          .then(() => findSeed('light'))
          .then(second => expect(second.id).to.equal(first.id)))
    })

    it('reset undoes changes to a seed account', () => {
      return add('light')
        .then(() => findSeed('light'))
        .then(user => Save.destroy({where: {userId: user.id}}))
        .then(() => reset('light'))
        .then(() => findSeed('light'))
        .then(countsFor)
        .then(([saves]) => expect(saves).to.equal(5))
    })

    it('remove and reset leave other accounts and shared imports alone', () => {
      return add('light')
        .then(() => add('out-of-credits'))
        .then(() => Recipe.findOne({where: {kind: 'import'}}))
        .then(shared => Save.create({userId: realAccount.id, recipeId: shared.id, savedAt: new Date()}))
        .then(() => remove('light'))
        .then(() => reset('out-of-credits'))
        .then(() => Promise.all([findSeed('light'), User.findByPk(realAccount.id), countsFor(realAccount)]))
        .then(([gone, real, [saves]]) => {
          expect(gone).to.equal(null)
          expect(real).to.not.equal(null)
          expect(saves).to.equal(1)
        })
    })
  })
})
