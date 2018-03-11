const Sequelize = require('sequelize')
const db = require('../db')

const Recipie = db.define('recipie', {
  name: {
    type: Sequelize.STRING,
    allowNull: false
  },
  ingredients: {
    type: Sequelize.ARRAY(Sequelize.TEXT),
  },
  recipie: {
    type: Sequelize.ARRAY(Sequelize.TEXT),
  }
})

module.exports = Recipie
