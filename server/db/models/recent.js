const Sequelize = require('sequelize')
const db = require('../db')

// One row per cook and opened recipe, so reopening moves it to the top
const Recent = db.define('recent', {
  userId: {
    type: Sequelize.UUID,
    primaryKey: true
  },
  recipeId: {
    type: Sequelize.UUID,
    primaryKey: true
  },
  lastOpenedAt: {
    type: Sequelize.DATE(3),
    allowNull: false
  }
}, {
  underscored: true,
  timestamps: false,
  indexes: [{
    name: 'recents_user_time',
    fields: ['user_id', {name: 'last_opened_at', order: 'DESC'}, {name: 'recipe_id', order: 'DESC'}]
  }]
})

module.exports = Recent
