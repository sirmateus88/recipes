const router = require('express').Router()
const {Save} = require('../db/models')
const {requireUser} = require('../auth/token')
const {lists, page, readCursor, findVisibleRecipe} = require('./recipeLists')
module.exports = router

router.use(requireUser)

router.get('/', (req, res, next) => {
  const after = req.query.after ? readCursor(req.query.after) : undefined
  if (after === null) return res.status(400).send('Bad cursor')
  Promise.all([
    page(lists.saves, req.user.id, after),
    Save.count({where: {userId: req.user.id}})
  ])
    .then(([result, total]) => res.json(Object.assign(result, {total})))
    .catch(next)
})

router.put('/:recipeId', (req, res, next) => {
  const {recipeId} = req.params
  findVisibleRecipe(recipeId, req.user)
    .then(recipe => {
      if (!recipe) return res.status(404).send('Not found')
      // the pair is the primary key, so saving twice keeps the first time
      return Save.bulkCreate(
        [{userId: req.user.id, recipeId, savedAt: new Date()}],
        {ignoreDuplicates: true}
      )
        .then(() => res.sendStatus(204))
    })
    .catch(next)
})

router.delete('/:recipeId', (req, res, next) => {
  const {recipeId} = req.params
  findVisibleRecipe(recipeId, req.user)
    .then(recipe => {
      if (!recipe) return res.status(404).send('Not found')
      // removing a recipe you wrote deletes it (DELETE /api/recipies/:id), so
      // it can never sit outside Saved
      if (recipe.kind === 'own') return res.status(409).send('Delete your own recipe instead')
      return Save.destroy({where: {userId: req.user.id, recipeId}})
        .then(() => res.sendStatus(204))
    })
    .catch(next)
})
