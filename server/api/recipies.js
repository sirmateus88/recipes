const router = require('express').Router()
const {Recipie} = require('../db/models')
const {requireUser} = require('../auth/token')
module.exports = router

router.get('/', (req, res, next) => {
  Recipie.findAll()
    .then(recipies => res.json(recipies))
    .catch(next)
})

router.post('/', requireUser, (req, res, next) => {
  const {name, ingredients, recipie, isPrivate} = req.body
  // the author is always the logged-in user, never taken from the body
  Recipie.create({name, ingredients, recipie, isPrivate, AuthorId: req.user.id})
  .then(created => res.json(created))
  .catch(err => {
    console.error(err);
    res.status(400).json(err)
  })
})

router.delete('/:id', requireUser, (req, res, next) => {
  Recipie.findById(req.params.id)
  .then(found => {
    if (!found) return res.status(404).send('Not found')
    if (found.AuthorId !== req.user.id) return res.status(403).send('Not your recipe')
    return found.destroy()
      .then(_ => res.status(200).send('Deleted Suscessfully'))
  })
  .catch(err => {
    console.error(err);
    res.status(400).json(err)
  })
})
