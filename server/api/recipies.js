const router = require('express').Router()
const {Recipie} = require('../db/models')
module.exports = router

router.get('/', (req, res, next) => {
  Recipie.findAll()
    .then(recipies => res.json(recipies))
    .catch(next)
})

router.post('/', (req, res, next) => {
  Recipie.create(req.body)
  .then(created => res.json(created))
  .catch(err => {
    console.error(err);
    res.status(400).json(err)
  })
})
