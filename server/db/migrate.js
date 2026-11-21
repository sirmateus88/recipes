const {Umzug, SequelizeStorage} = require('umzug')

// Loaded before db.js, which reads DATABASE_URL when it's required
if (require.main === module && process.env.NODE_ENV !== 'production') require('../../secrets')

const db = require('./db')

const umzug = new Umzug({
  migrations: {glob: ['migrations/*.js', {cwd: __dirname}]},
  context: db.getQueryInterface(),
  storage: new SequelizeStorage({sequelize: db}),
  logger: process.env.NODE_ENV === 'test' ? undefined : console
})

// Runs every migration that hasn't run yet. The server calls this on startup
const migrate = () => umzug.up()

module.exports = migrate

if (require.main === module) {
  migrate()
    .then(() => db.close())
    .catch(err => {
      console.error(err)
      process.exit(1)
    })
}
