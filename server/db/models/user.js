const bcrypt = require('bcryptjs')
const Sequelize = require('sequelize')
const db = require('../db')

const BCRYPT_COST = 10

const User = db.define('user', {
  email: {
    type: Sequelize.STRING,
    unique: true,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: Sequelize.STRING,
    // Making `.password` act like a func hides it when serializing to JSON.
    // This is a hack to get around Sequelize's lack of a "private" option.
    get() {
      return () => this.getDataValue('password')
    }
  },
  googleId: {
    type: Sequelize.STRING
  }
})

module.exports = User

/**
 * instanceMethods
 */
// resolves to true/false; bcrypt hashes carry their own salt
User.prototype.correctPassword = function (candidatePwd) {
  if (!this.password()) return Promise.resolve(false)
  return bcrypt.compare(candidatePwd, this.password())
}

/**
 * hooks
 */
const hashPassword = user => {
  if (user.changed('password') && user.password()) {
    return bcrypt.hash(user.password(), BCRYPT_COST)
      .then(hash => {
        user.password = hash
      })
  }
}

User.beforeCreate(hashPassword)
User.beforeUpdate(hashPassword)
