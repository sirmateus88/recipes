const router = require('express').Router()
const axios = require('axios');
const Nightmare = require('nightmare');
const nightmare = Nightmare();

router.get('/', (req, res, next) => {
  console.log('request query: ', req.query)
  axios({
    method: 'get',
    'Content-Type': 'application/json',
    url: `https://mercury.postlight.com/parser?url=${req.query.url}}`,
    headers: {'x-api-key': process.env.MERCURY_API_KEY}
  })
    .then(found => {
      console.log('found: ', found.data)
      let title = found.data.title
      let ingredients = findInredients(found.data.content)
      let recipie = findRecipie(found.data.content)
      return {
        title,
        ingredients,
        recipie
      }
    })
    .then(processed => res.json(processed))
    .catch(err => {
      res.send("There was a problem connecting to the server")
      console.error(err)});
})

router.get('/recipie', (req, res, next) => {
  console.log('request query: ', req.query)
  nightmare.goto(req.query.url)
  .evaluate(() => {
      let found = [...document.querySelectorAll('jetpack-recipe-directions')]
      return found;
    })
    .then(goTo => console.log('goTo completed, here is the data: ', goTo))
    //.evaluate(() => console.log(document))
    .end()
    //.then(found => console.log('found from nightmare:', found))
    .then(processed => {
      console.log('suscess')
      res.send(processed)
    })
    .catch(err => res.json(err))
})

// router.get('/', (req, res, next) => {
//   axios.get(`https://smittenkitchen.com/2016/10/pumpkin-bread/`)
//     .then(found => found.data)
//     .then(data => parser.parseComplete(data))
//     .then(_ => {
//       res.json(parser._handler.dom[2].attribs)
//     })
//     .catch(err => res.json(err))
// })

// router.get('/', (req, res, next) => {
//   axios.get(`https://smittenkitchen.com/2016/10/pumpkin-bread/`)
//     .then(found => found.data)
//     .then(data => findInredients(data))
//     .then(_ => res.send(found))
//     .catch(err => res.json(err))
// })

module.exports = router


const pullItem = ingredient => {
  let start = ingredient.search('>');
  let trimmed = ingredient.slice(start + 1);
  return trimmed;
}

const findInredients = content => {
  let ingredientPos = content.search('ingredient')
  let trimmedIngredients = content.slice(ingredientPos);
  let startOfList = trimmedIngredients.search('<ul');
  let potentialIngredients = trimmedIngredients.slice(startOfList + 4)
  let endOfList = potentialIngredients.search('</ul>')
  potentialIngredients = potentialIngredients.slice(0, endOfList);
  let ingreArr = potentialIngredients.split('</li>');
  return ingreArr.map(ingredient => pullItem(ingredient)).filter(item => item !== '');
}

const findRecipie = content => {
  let recipiePos = content.search('jetpack-recipe-directions')
  let trimmedRecipie = content.slice(recipiePos);
  let startOfList = trimmedRecipie.search('>');
  let potentialRecipie = trimmedRecipie.slice(startOfList + 1)
  let endOfList = potentialRecipie.search('</div>')
  potentialRecipie = potentialRecipie.slice(0, endOfList);
  let recipieArr = potentialRecipie.split('</p>');
  return recipieArr.map(recipe => pullItem(recipe)).filter(item => item !== '');
}
