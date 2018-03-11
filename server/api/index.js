const router = require('express').Router()
module.exports = router

router.use('/users', require('./users'))
router.use('/recipies', require('./recipies'))
router.use('/parse', require('./parse'))


router.use((req, res, next) => {
  const error = new Error('Not Found')
  error.status = 404
  next(error)
})
