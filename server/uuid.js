const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Postgres errors on a malformed uuid, so routes check before querying
const isUuid = value => typeof value === 'string' && UUID.test(value)

module.exports = {isUuid}
