const router = require('express').Router()
const {Recent} = require('../db/models')
const {requireUser} = require('../auth/token')
const {lists, page, readCursor, findVisibleRecipe} = require('./recipeLists')
module.exports = router

router.use(requireUser)

router.get('/', (req, res, next) => {
  const after = req.query.after ? readCursor(req.query.after) : undefined
  if (after === null) return res.status(400).send('Bad cursor')
  page(lists.recents, req.user.id, after)
    .then(result => res.json(result))
    .catch(next)
})

router.post('/', (req, res, next) => {
  const {recipeId} = req.body
  findVisibleRecipe(recipeId, req.user)
    .then(recipe => {
      if (!recipe) return res.status(404).send('Not found')
      return Recent.upsert({userId: req.user.id, recipeId, lastOpenedAt: new Date()})
        .then(() => res.sendStatus(204))
    })
    .catch(next)
})
