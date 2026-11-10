const router = require('express').Router()
module.exports = router

router.use('/recipies', require('./recipies'))
router.use('/parse', require('./parse'))
router.use('/home', require('./home'))
router.use('/recents', require('./recents'))
router.use('/saves', require('./saves'))


router.use((req, res, next) => {
  const error = new Error('Not Found')
  error.status = 404
  next(error)
})
