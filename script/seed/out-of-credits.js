const {seedOwn} = require('./parts')

// This month's credits used up, for the counter once CREDITS_VISIBLE is on
module.exports = {
  own: [seedOwn('Weekend shakshuka', 4)],
  saveImports: [0, 1],
  openImports: [0],
  creditsUsed: 5
}
