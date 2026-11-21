const router = require('express').Router()
const {requireUser} = require('../auth/token')
const {lists, firstRows, creditsLeft} = require('./recipeLists')
module.exports = router

// The card plus the 10 that See more shows
const HOME_RECENTS = 11
const HOME_SAVES = 10

router.get('/', requireUser, (req, res, next) => {
  const userId = req.user.id
  Promise.all([
    creditsLeft(userId),
    firstRows(lists.recents, userId, HOME_RECENTS),
    firstRows(lists.saves, userId, HOME_SAVES)
  ])
    .then(([credits, recents, saves]) => res.json({
      plan: req.user.plan,
      creditsLeft: credits,
      // credits are counted either way; this only decides whether the app shows them
      creditsVisible: process.env.CREDITS_VISIBLE === 'true',
      recents,
      saves
    }))
    .catch(next)
})
