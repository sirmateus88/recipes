const User = require('./user')
const Recipe = require('./recipe')
const Save = require('./save')
const Recent = require('./recent')
const CreditUse = require('./creditUse')
const db = require('../db.js');

/**
 * Deleting follows "What deleting does" in the architecture doc: an account or
 * own recipe takes its saves and recents with it; a credit use outlives its
 * recipe with the link emptied. The migration declares the same rules.
 */
Recipe.belongsTo(User, {as: 'owner', foreignKey: 'ownerId', onDelete: 'CASCADE'});
Recipe.belongsTo(Recipe, {as: 'adaptedFrom', foreignKey: 'adaptedFromId', onDelete: 'SET NULL'});

[Save, Recent].forEach(model => {
  model.belongsTo(User, {foreignKey: 'userId', onDelete: 'CASCADE'});
  model.belongsTo(Recipe, {foreignKey: 'recipeId', onDelete: 'CASCADE'});
});

CreditUse.belongsTo(User, {foreignKey: {name: 'userId', allowNull: false}, onDelete: 'CASCADE'});
CreditUse.belongsTo(Recipe, {foreignKey: 'recipeId', onDelete: 'SET NULL'});

/**
 * We'll export all of our models here, so that any time a module needs a model,
 * we can just require it from 'db/models'
 * for example, we can say: const {User} = require('../db/models')
 * instead of: const User = require('../db/models/user')
 */
module.exports = {
  User,
  Recipe,
  Save,
  Recent,
  CreditUse,
  db
}
