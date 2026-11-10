const Sequelize = require('sequelize')
const db = require('../db')

// One row per cook and saved recipe, so a recipe can't be saved twice
const Save = db.define('save', {
  userId: {
    type: Sequelize.UUID,
    primaryKey: true
  },
  recipeId: {
    type: Sequelize.UUID,
    primaryKey: true
  },
  savedAt: {
    type: Sequelize.DATE(3),
    allowNull: false
  }
}, {
  underscored: true,
  timestamps: false,
  indexes: [{
    name: 'saves_user_time',
    fields: ['user_id', {name: 'saved_at', order: 'DESC'}, {name: 'recipe_id', order: 'DESC'}]
  }]
})

module.exports = Save
