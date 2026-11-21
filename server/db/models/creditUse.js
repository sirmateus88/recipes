const Sequelize = require('sequelize')
const db = require('../db')

// A ledger of charged uses. Credits left is 5 minus this month's rows, so
// nothing is reset when the month turns.
const CreditUse = db.define('creditUse', {
  id: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  useId: {
    type: Sequelize.UUID,
    allowNull: false
  },
  kind: {
    type: Sequelize.TEXT,
    allowNull: false,
    validate: {
      isIn: [['import', 'adapted', 'convert']]
    }
  },
  source: Sequelize.TEXT,
  month: {
    type: Sequelize.DATEONLY,
    allowNull: false
  }
}, {
  tableName: 'credit_uses',
  underscored: true,
  updatedAt: false,
  indexes: [{unique: true, fields: ['user_id', 'use_id']}]
})

module.exports = CreditUse
