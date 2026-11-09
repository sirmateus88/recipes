// Moves to the architecture doc's schema (PRD 03). Production starts fresh, by
// Matthew's decision, so the sync-created tables are dropped, not converted.
// Times used for paging are timestamptz(3): JavaScript dates hold milliseconds,
// so a cursor made from one matches its row exactly.
const statements = [
  'DROP TABLE IF EXISTS recipies, users CASCADE',

  `CREATE TABLE users (
    id uuid PRIMARY KEY,
    email text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'subscribed')),
    settings jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL
  )`,

  `CREATE TABLE recipes (
    id uuid PRIMARY KEY,
    kind text NOT NULL CHECK (kind IN ('own', 'import')),
    owner_id uuid REFERENCES users (id) ON DELETE CASCADE,
    title text NOT NULL CHECK (btrim(title) <> ''),
    photo_url text,
    source_url text,
    site_name text,
    adapted_from_id uuid REFERENCES recipes (id) ON DELETE SET NULL,
    servings integer,
    ingredients jsonb,
    steps jsonb,
    last_imported_at timestamptz,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    CONSTRAINT recipes_own_shape CHECK (
      kind <> 'own' OR (
        owner_id IS NOT NULL
        AND servings IS NOT NULL
        AND source_url IS NULL
        AND ingredients IS NOT NULL AND jsonb_typeof(ingredients) = 'array' AND ingredients <> '[]'
        AND steps IS NOT NULL AND jsonb_typeof(steps) = 'array' AND steps <> '[]'
      )
    ),
    CONSTRAINT recipes_import_shape CHECK (
      kind <> 'import' OR (
        owner_id IS NULL
        AND source_url IS NOT NULL
        AND adapted_from_id IS NULL
        AND servings IS NULL
        AND ingredients IS NULL
        AND steps IS NULL
      )
    )
  )`,
  'CREATE INDEX recipes_owner_id ON recipes (owner_id)',
  `CREATE UNIQUE INDEX recipes_source_url ON recipes (source_url) WHERE kind = 'import'`,

  `CREATE TABLE saves (
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    recipe_id uuid NOT NULL REFERENCES recipes (id) ON DELETE CASCADE,
    saved_at timestamptz(3) NOT NULL,
    PRIMARY KEY (user_id, recipe_id)
  )`,
  'CREATE INDEX saves_user_time ON saves (user_id, saved_at DESC, recipe_id DESC)',

  `CREATE TABLE recents (
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    recipe_id uuid NOT NULL REFERENCES recipes (id) ON DELETE CASCADE,
    last_opened_at timestamptz(3) NOT NULL,
    PRIMARY KEY (user_id, recipe_id)
  )`,
  'CREATE INDEX recents_user_time ON recents (user_id, last_opened_at DESC, recipe_id DESC)',

  `CREATE TABLE credit_uses (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    use_id uuid NOT NULL,
    kind text NOT NULL CHECK (kind IN ('import', 'adapted', 'convert')),
    recipe_id uuid REFERENCES recipes (id) ON DELETE SET NULL,
    source text CHECK (source IN ('paste', 'share', 'reopen')),
    month date NOT NULL,
    created_at timestamptz NOT NULL,
    UNIQUE (user_id, use_id)
  )`,
  'CREATE INDEX credit_uses_user_month ON credit_uses (user_id, month)'
]

const runAll = (context, list) => context.sequelize.transaction(transaction =>
  list.reduce(
    (done, sql) => done.then(() => context.sequelize.query(sql, {transaction})),
    Promise.resolve()
  ))

module.exports = {
  up: ({context}) => runAll(context, statements),
  down: ({context}) => runAll(context, ['DROP TABLE IF EXISTS credit_uses, recents, saves, recipes, users CASCADE'])
}
