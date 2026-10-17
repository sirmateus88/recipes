const router = require('express').Router()
const axios = require('axios');
const {parseLimiter} = require('../rateLimit')

const getFromFoodAPI = axios.create({
  baseURL: 'https://api.spoonacular.com/'
})

// axios `params` URL-encodes values, so recipe URLs keep their ? and & parts
const callFoodAPI = (path, params) =>
  getFromFoodAPI.get(path, {
    params: Object.assign({}, params, {apiKey: process.env.SPOONACULAR_API_KEY})
  })

// log the upstream failure, but never send it on: it includes our request and key
const sendFoodAPIError = (res, err, message) => {
  const status = err.response && err.response.status
  console.error(`Spoonacular error (${status || 'no response'}): ${err.message}`)
  res.status(status === 402 || status === 429 ? 503 : 502).json({error: message})
}

router.use(parseLimiter)

router.get('/', (req, res, next) => {
  console.log('request query: ', req.query.url)

  callFoodAPI('recipes/extract', {url: req.query.url})
  .then(response => response.data)
  .then(data => {
    res.status(200).send(data)
  })
  .catch(err => sendFoodAPIError(res, err, 'Could not parse recipe'))

})

router.get('/convert', (req, res, next) => {
  const {ingredientName, sourceAmount, sourceUnit, targetUnit} = req.query
  console.log('request query: ', req.query)

  callFoodAPI('recipes/convert', {ingredientName, sourceAmount, sourceUnit, targetUnit})
  .then(response => response.data)
  .then(data => {
    res.status(200).send(data)
  })
  .catch(err => sendFoodAPIError(res, err, 'Could not convert ingredient'))

})


module.exports = router
// exposed so specs can mock Spoonacular
router.foodAPI = getFromFoodAPI
