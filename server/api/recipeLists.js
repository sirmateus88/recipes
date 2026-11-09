const {Op} = require('sequelize')
const {db, Recipe, CreditUse} = require('../db/models')
const {isUuid} = require('../uuid')

const PAGE_SIZE = 50
const MONTHLY_CREDITS = 5

const lists = {
  saves: {table: 'saves', time: 'saved_at', as: 'savedAt'},
  recents: {table: 'recents', time: 'last_opened_at', as: 'openedAt'}
}

// A cursor is the last row's time and recipe id, which together are unique
const makeCursor = (time, recipeId) =>
  Buffer.from(`${time.toISOString()}|${recipeId}`).toString('base64url')

// resolves to {time, recipeId}, or null if the cursor isn't one of ours
const readCursor = cursor => {
  const [time, recipeId] = Buffer.from(String(cursor), 'base64url').toString().split('|')
  return isUuid(recipeId) && !isNaN(Date.parse(time)) ? {time, recipeId} : null
}

// Newest first. Selects only what a card shows, never ingredients or steps.
const fetchRows = (list, userId, limit, after) => db.query(`
  SELECT r.id, r.kind, r.title, r.photo_url AS "photoUrl", r.site_name AS "siteName",
    r.source_url AS "sourceUrl", r.servings, x.${list.time} AS "${list.as}"
  FROM ${list.table} x
  JOIN recipes r ON r.id = x.recipe_id
  WHERE x.user_id = :userId
  ${after ? `AND (x.${list.time}, x.recipe_id) < (CAST(:time AS timestamptz), CAST(:recipeId AS uuid))` : ''}
  ORDER BY x.${list.time} DESC, x.recipe_id DESC
  LIMIT :limit
`, {
  replacements: Object.assign({userId, limit}, after),
  type: db.QueryTypes.SELECT
})

// Home's first rows; one extra row tells us whether more exist
const firstRows = (list, userId, count) =>
  fetchRows(list, userId, count + 1)
    .then(rows => ({items: rows.slice(0, count), hasMore: rows.length > count}))

// One page of the full Saved or Recents list
const page = (list, userId, after) =>
  fetchRows(list, userId, PAGE_SIZE + 1, after)
    .then(rows => {
      const items = rows.slice(0, PAGE_SIZE)
      const last = items[items.length - 1]
      return {
        items,
        nextCursor: rows.length > PAGE_SIZE ? makeCursor(last[list.as], last.id) : null
      }
    })

// A cook can reach their own recipes and any shared import
const findVisibleRecipe = (id, user) => (isUuid(id)
  ? Recipe.findOne({where: {
    id,
    [Op.or]: [{kind: 'import'}, {ownerId: user.id}]
  }})
  : Promise.resolve(null))

// Credit months are calendar months in UTC
const firstOfThisMonth = (now = new Date()) =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10)

const creditsLeft = userId =>
  CreditUse.count({where: {userId, month: firstOfThisMonth()}})
    .then(used => Math.max(0, MONTHLY_CREDITS - used))

module.exports = {lists, firstRows, page, readCursor, findVisibleRecipe, firstOfThisMonth, creditsLeft}
