if (process.env.NODE_ENV !== 'production') require('../secrets')

const crypto = require('crypto')
const {db, User, Recipe, Save, Recent, CreditUse} = require('../server/db/models')
const migrate = require('../server/db/migrate')
const {firstOfThisMonth} = require('../server/api/recipeLists')
const {seedImport} = require('./seed/parts')

// One file per seed account (PRD 10 S7). To add one, add a file and list it here.
const accounts = {
  new: require('./seed/new'),
  light: require('./seed/light'),
  heavy: require('./seed/heavy'),
  'out-of-credits': require('./seed/out-of-credits')
}

const USAGE = `Usage:
  npm run seed -- add <accounts>      create them, skipping any that exist
  npm run seed -- reset <accounts>    put them back to their seeded state
  npm run seed -- remove <accounts>   delete them and everything they own
  npm run seed -- all                 reset every seed account
Accounts: ${Object.keys(accounts).join(', ')}`

// The reserved domain is how seed accounts are told apart. This is the only
// place an email is built, so no other account can be matched.
const emailFor = name => `${name}@seed.recipily.test`

// resolves to the shared row for a link, as an import would leave it
const sharedImport = idx => {
  const fields = seedImport(idx)
  return Recipe.findOrCreate({
    where: {kind: 'import', sourceUrl: fields.sourceUrl},
    defaults: Object.assign({lastImportedAt: new Date()}, fields)
  }).then(([recipe]) => recipe)
}

// Rows get their times a minute apart, so lists have a stable order
const minutesAgo = minutes => new Date(Date.now() - minutes * 60 * 1000)

const inOrder = (items, step) => items.reduce(
  (done, item) => done.then(results => step(item).then(result => results.concat([result]))),
  Promise.resolve([])
)

const add = name => {
  const spec = accounts[name]
  const email = emailFor(name)
  return User.findOne({where: {email}})
    .then(found => {
      if (found) {
        console.log(`${email} exists, skipping`)
        return null
      }
      return User.create({email, password: process.env.SEED_PASSWORD})
        .then(user => Promise.all(spec.own.map(fields =>
          Recipe.create(Object.assign({kind: 'own', ownerId: user.id}, fields))))
          .then(own => Promise.all([
            inOrder(spec.saveImports, sharedImport),
            inOrder(spec.openImports, sharedImport)
          ])
            .then(([saved, opened]) => {
              // own recipes are always saved, and they were opened after Save
              const saveRows = own.concat(saved)
              const recentRows = own.concat(opened)
              return Promise.all([
                Save.bulkCreate(saveRows.map((recipe, idx) => ({
                  userId: user.id, recipeId: recipe.id, savedAt: minutesAgo(idx + 1)
                }))),
                Recent.bulkCreate(recentRows.map((recipe, idx) => ({
                  userId: user.id, recipeId: recipe.id, lastOpenedAt: minutesAgo(idx + 1)
                }))),
                CreditUse.bulkCreate(Array.from({length: spec.creditsUsed}, () => ({
                  userId: user.id,
                  useId: crypto.randomUUID(),
                  kind: 'import',
                  source: 'paste',
                  month: firstOfThisMonth()
                })))
              ])
            })))
        .then(() => console.log(`${email} added`))
    })
}

// Cascades remove what it owns; shared import rows stay, as they do for anyone
const remove = name =>
  User.destroy({where: {email: emailFor(name)}})
    .then(count => console.log(`${emailFor(name)} ${count ? 'removed' : 'not found'}`))

const reset = name => remove(name).then(() => add(name))

const actions = {add, reset, remove}

// Returns a problem to report, or null if the command can run. Takes the env
// so specs can check it without running anything.
const problemWith = (action, names, env) => {
  if (env.APP_ENV !== 'dev' && env.APP_ENV !== 'test') {
    return 'Refusing to seed: APP_ENV must be dev or test'
  }
  if (action === 'all' ? names.length : !actions[action] || !names.length) return USAGE
  const unknown = names.filter(name => !accounts[name])
  if (unknown.length) return `Unknown seed account: ${unknown.join(', ')}\n${USAGE}`
  if (action !== 'remove' && !env.SEED_PASSWORD) return 'Set SEED_PASSWORD to seed'
  return null
}

const main = () => {
  const [action, ...names] = process.argv.slice(2)
  const problem = problemWith(action, names, process.env)
  if (problem) {
    console.error(problem)
    process.exit(1)
  }
  const run = action === 'all' ? reset : actions[action]
  migrate()
    .then(() => inOrder(action === 'all' ? Object.keys(accounts) : names, run))
    .then(() => db.close())
    .catch(err => {
      console.error(err)
      process.exit(1)
    })
}

module.exports = {problemWith, emailFor, add, remove, reset}

if (require.main === module) main()
