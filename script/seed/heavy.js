const {seedOwn} = require('./parts')

const range = count => Array.from({length: count}, (_, idx) => idx)

// See more, See all, and the full Recents and Saved pages: 200 saved in all,
// and 60 opened in all
module.exports = {
  own: [seedOwn("Grandma's lemon drizzle", 12), seedOwn('Weekend shakshuka', 4), seedOwn("Dad's Sunday roast potatoes", 6)],
  saveImports: range(197),
  openImports: range(57),
  creditsUsed: 3
}
