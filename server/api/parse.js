const router = require('express').Router()
const axios = require('axios');

const getFromFoodAPI = axios.create({
  baseURL: 'https://spoonacular-recipe-food-nutrition-v1.p.rapidapi.com/',
  headers: {
    'X-RapidAPI-Host': 'spoonacular-recipe-food-nutrition-v1.p.rapidapi.com',
    'X-RapidAPI-Key': process.env.SPOONACULAR_API_KEY
  }
})


router.get('/', (req, res, next) => {
  console.log('request query: ', req.query.url)

  getFromFoodAPI.get(`recipes/extract?url=${req.query.url}`)
  .then(response => response.data)
  .then(data => {
    res.status(200).send(data)
  })
  .catch(err => {
    res.status(500).send(err)
  })

})


module.exports = router
