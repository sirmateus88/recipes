const {seedOwn} = require('./parts')

// Home with a short library
module.exports = {
  own: [seedOwn("Grandma's lemon drizzle", 12), seedOwn('Weekend shakshuka', 4)],
  saveImports: [0, 1, 2],
  openImports: [0, 3],
  creditsUsed: 2
}
