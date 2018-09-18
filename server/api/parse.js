const router = require('express').Router()
const axios = require('axios');
const Nightmare = require('nightmare');
const nightmare = Nightmare({executionTimeout: 10000});
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const findIngredients = body => {
  let everything = body;
  //let end = [...everything];
  console.log(everything)
  return everything;
}

router.get('/recipe', (req, res, next) => {
  console.log('request query: ', req.query.url)
  // const dom = new JSDOM(``, {
  //   url: req.query.url,
  //   referrer: "https://example.com/",
  //   contentType: "text/html",
  //   includeNodeLocations: true,
  //   storageQuota: 10000000,
  //   runScripts: 'outside-only'
  // })

  axios.get(req.query.url)
  .then(response => response.data)
  .then(data => new JSDOM(data, {runScripts: 'outside-only'}))
  .then(test => {
    //console.log('response', response);
    console.log('in axios', test)
    console.log('what is the data', typeof test);
    res.send(test.window.document.querySelectorAll('p')[0]);
  })
  .catch(err => {
    res.status(500).send(err)
  })

  // let foundDoc = dom.window.document.querySelectorAll('p');
  // console.log('dom made brah', foundDoc);
  // res.send(foundDoc);
})

// router.get('/recipe', (req, res, next) => {
//   console.log('request query: ', req.query.url)
//   let p1 = 1
//   let p2 = 3
//   nightmare
//   .goto(req.query.url)
//   .evaluate(p1 => {
//     return {
//       key: document.body
//     }
//   }, p1) // <-- that's how you pass parameters from Node scope to browser scope
//  //end evaluate
//   .then(body => {
//     console.log('panic')
//     findIngredients(body)
//   })
//   .then(result => {
//     res.send(result);
//   })
//   .catch(err => {
//     res.send("Help something went wrong out heah")
//     console.error(err)});
// })

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

// const findInredients = content => {
//   let ingredientPos = content.search('ingredient')
//   let trimmedIngredients = content.slice(ingredientPos);
//   let startOfList = trimmedIngredients.search('<ul');
//   let potentialIngredients = trimmedIngredients.slice(startOfList + 4)
//   let endOfList = potentialIngredients.search('</ul>')
//   potentialIngredients = potentialIngredients.slice(0, endOfList);
//   let ingreArr = potentialIngredients.split('</li>');
//   return ingreArr.map(ingredient => pullItem(ingredient)).filter(item => item !== '');
// }



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


// router.get('/', (req, res, next) => {
//   console.log('request query: ', req.query.url)
//   axios({
//     method: 'get',
//     'Content-Type': 'application/json',
//     url: `https://mercury.postlight.com/parser?url=${req.query.url}}`,
//     headers: {'x-api-key': process.env.MERCURY_API_KEY}
//   })
//     .then(found => {
//       console.log('found: ', found.data)
//       let title = found.data.title
//       let ingredients = findInredients(found.data.content)
//       let recipie = findRecipie(found.data.content)
//       return {
//         title,
//         ingredients,
//         recipie
//       }
//     })
//     .then(processed => res.json(processed))
//     .catch(err => {
//       res.send("There was a problem connecting to the server")
//       console.error(err)});
// })
