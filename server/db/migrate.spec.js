/* global describe before after it */

const {expect} = require('chai')
const db = require('./index')
const migrate = require('./migrate')
const {User, Recipe, Save, Recent, CreditUse} = require('./models')

// Other specs build tables with db.sync, which skips check constraints. This one
// runs the real migrations, and checks the models and the tables agree.
describe('Migrations', () => {
  let user

  const ownRow = () => ({
    kind: 'own',
    ownerId: user.id,
    title: 'Lasagne',
    servings: 1,
    ingredients: [{line: 'pasta'}],
    steps: [{text: 'layer it'}]
  })

  const refused = attempt => attempt().then(
    () => { throw new Error('expected the database to refuse this') },
    err => expect(err.name).to.equal('SequelizeDatabaseError')
  )

  before(() => db.query('DROP SCHEMA public CASCADE')
    .then(() => db.query('CREATE SCHEMA public'))
    // tables as the old db.sync made them, which the first migration replaces
    .then(() => db.query('CREATE TABLE users (id serial PRIMARY KEY, email text, password text)'))
    .then(() => db.query('CREATE TABLE recipies (id serial PRIMARY KEY, "AuthorId" integer REFERENCES users (id))'))
    .then(() => migrate())
    .then(() => User.create({email: 'cook@example.com', password: 'password1'}))
    .then(created => {
      user = created
    }))

  // leave a clean slate for db.sync in the other specs
  after(() => db.query('DROP SCHEMA public CASCADE')
    .then(() => db.query('CREATE SCHEMA public')))

  it('replaces the old tables', () => {
    return db.getQueryInterface().showAllTables()
      .then(tables => {
        expect(tables).to.include.members(['users', 'recipes', 'saves', 'recents', 'credit_uses'])
        expect(tables).to.not.include('recipies')
      })
  })

  it('is safe to run again', () => {
    return migrate().then(() => User.count())
      .then(count => expect(count).to.equal(1))
  })

  it('has every column the models use', () => {
    const models = [User, Recipe, Save, Recent, CreditUse]
    return Promise.all(models.map(model =>
      db.getQueryInterface().describeTable(model.getTableName())
        .then(columns => {
          const fields = Object.values(model.rawAttributes).map(attribute => attribute.field)
          expect(columns, model.name).to.include.all.keys(...fields)
        })))
  })

  it('refuses an own recipe with no ingredients or no steps', () => {
    return refused(() => Recipe.create(Object.assign(ownRow(), {ingredients: []})))
      .then(() => refused(() => Recipe.create(Object.assign(ownRow(), {steps: null}))))
      .then(() => refused(() => Recipe.create(Object.assign(ownRow(), {ownerId: null}))))
  })

  it('refuses an import holding ingredients or steps, or with no link', () => {
    const importRow = {kind: 'import', title: 'Soup', sourceUrl: 'https://example.com/soup'}
    return refused(() => Recipe.create(Object.assign({}, importRow, {ingredients: [{line: 'water'}]})))
      .then(() => refused(() => Recipe.create(Object.assign({}, importRow, {steps: [{text: 'boil'}]}))))
      .then(() => refused(() => Recipe.create({kind: 'import', title: 'Soup'})))
  })

  it('allows one row per imported link', () => {
    const importRow = {kind: 'import', title: 'Stew', sourceUrl: 'https://example.com/stew'}
    return Recipe.create(importRow)
      .then(() => Recipe.create(importRow))
      .then(
        () => { throw new Error('expected a duplicate link to be refused') },
        err => expect(err.name).to.equal('SequelizeUniqueConstraintError')
      )
  })

  it('charges a use once', () => {
    const use = {userId: user.id, useId: '00000000-0000-4000-8000-000000000001', kind: 'import', month: '2026-11-01'}
    return CreditUse.create(use)
      .then(() => CreditUse.create(use))
      .then(
        () => { throw new Error('expected a second charge to be refused') },
        err => expect(err.name).to.equal('SequelizeUniqueConstraintError')
      )
  })

  it('cascades as the architecture doc says', () => {
    return Recipe.create(ownRow())
      .then(recipe => Promise.all([
        Save.create({userId: user.id, recipeId: recipe.id, savedAt: new Date()}),
        Recent.create({userId: user.id, recipeId: recipe.id, lastOpenedAt: new Date()}),
        CreditUse.create({
          userId: user.id,
          useId: '00000000-0000-4000-8000-000000000002',
          kind: 'convert',
          recipeId: recipe.id,
          month: '2026-11-01'
        })
      ])
        .then(([, , use]) => recipe.destroy()
          .then(() => Promise.all([Save.count(), Recent.count(), use.reload()]))))
      .then(([saves, recents, use]) => {
        expect(saves).to.equal(0)
        expect(recents).to.equal(0)
        expect(use.recipeId).to.equal(null)
      })
      .then(() => user.destroy())
      .then(() => CreditUse.count())
      .then(uses => expect(uses).to.equal(0))
  })
})
