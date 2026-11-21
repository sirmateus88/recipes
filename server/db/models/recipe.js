const Sequelize = require('sequelize')
const db = require('../db')

// Every recipe a cook can see. `own` rows belong to their author. `import` rows
// are shared by every cook who opens the link and never hold ingredients or
// steps. Check constraints in the migration enforce those two shapes.
const Recipe = db.define('recipe', {
  id: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  kind: {
    type: Sequelize.TEXT,
    allowNull: false,
    validate: {
      isIn: [['own', 'import']]
    }
  },
  title: {
    type: Sequelize.TEXT,
    allowNull: false
  },
  photoUrl: Sequelize.TEXT,
  sourceUrl: Sequelize.TEXT,
  siteName: Sequelize.TEXT,
  servings: Sequelize.INTEGER,
  ingredients: Sequelize.JSONB,
  steps: Sequelize.JSONB,
  lastImportedAt: Sequelize.DATE
}, {underscored: true})

module.exports = Recipe
