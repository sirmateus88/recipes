const router = require('express').Router()
const {Recipie} = require('../db/models')
module.exports = router

router.get('/', (req, res, next) => {
  Recipie.findAll()
    .then(recipies => res.json(recipies))
    .catch(next)
})
