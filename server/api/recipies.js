const router = require('express').Router()
const {db, Recipe, Save} = require('../db/models')
const {requireUser} = require('../auth/token')
const {isUuid} = require('../uuid')
module.exports = router

// The old add and recipe screens use this shape until PRD 4 replaces them
const toOldShape = recipe => ({
  id: recipe.id,
  name: recipe.title,
  ingredients: recipe.ingredients.map(row => row.line),
  recipie: recipe.steps.map(step => step.text),
  isPrivate: true,
  servings: recipe.servings,
  AuthorId: recipe.ownerId,
  createdAt: recipe.createdAt,
  updatedAt: recipe.updatedAt
})

const isFilledList = list =>
  Array.isArray(list) && list.length > 0 &&
  list.every(item => typeof item === 'string' && item.trim() !== '')

router.post('/', requireUser, (req, res, next) => {
  const {name, ingredients, recipie} = req.body
  if (typeof name !== 'string' || name.trim() === '' || !isFilledList(ingredients) || !isFilledList(recipie)) {
    return res.status(400).send('A recipe needs a name, an ingredient and a step')
  }
  // the owner is always the logged-in user, never taken from the body, and own
  // recipes start saved, in one transaction so one is never left out of Saved
  db.transaction(transaction =>
    Recipe.create({
      kind: 'own',
      ownerId: req.user.id,
      title: name,
      servings: 1,
      ingredients: ingredients.map(line => ({line})),
      steps: recipie.map(text => ({text}))
    }, {transaction})
      .then(created => Save.create(
        {userId: req.user.id, recipeId: created.id, savedAt: new Date()},
        {transaction}
      )
        .then(() => created)))
    .then(created => res.json(toOldShape(created)))
    .catch(next)
})

router.get('/:id', requireUser, (req, res, next) => {
  if (!isUuid(req.params.id)) return res.status(404).send('Not found')
  Recipe.findOne({where: {id: req.params.id, kind: 'own', ownerId: req.user.id}})
    .then(found => (found ? res.json(toOldShape(found)) : res.status(404).send('Not found')))
    .catch(next)
})

router.delete('/:id', requireUser, (req, res, next) => {
  if (!isUuid(req.params.id)) return res.status(404).send('Not found')
  Recipe.findByPk(req.params.id)
    .then(found => {
      if (!found) return res.status(404).send('Not found')
      // shared imports have no owner, so nobody can delete one
      if (found.ownerId !== req.user.id) return res.status(403).send('Not your recipe')
      // the database removes its saves and recents
      return found.destroy()
        .then(() => res.status(200).send('Deleted Suscessfully'))
    })
    .catch(next)
})
