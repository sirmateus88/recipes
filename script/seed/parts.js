// Shared by the seed account files. Imported links use a reserved domain, so
// they're never real pages: opening one shows the failure message.
const title = idx => [
  'Weeknight chicken tikka masala', 'Crispy smashed potatoes', 'Miso glazed salmon',
  'Fluffy American pancakes', 'One-pot pesto pasta', 'Slow-cooked beef ragu',
  'Fudgy brownies', 'Chickpea curry', 'Roasted squash soup', 'Crispy fish tacos'
][idx % 10]

const seedImport = idx => ({
  title: idx < 10 ? title(idx) : `${title(idx)} ${idx}`,
  sourceUrl: `https://recipes.seed.recipily.test/${idx}`,
  siteName: 'recipes.seed.recipily.test',
  // every third import has no photo, to show the basil tile
  photoUrl: idx % 3 === 2 ? null : `https://picsum.photos/seed/recipily${idx}/192`
})

const seedOwn = (name, servings) => ({
  title: name,
  servings,
  ingredients: [{line: '2 cups plain flour'}, {line: '1 tsp salt'}, {line: 'water, to bring it together'}],
  steps: [{text: 'Mix everything in a large bowl.'}, {text: 'Cook until done.'}]
})

module.exports = {seedImport, seedOwn}
