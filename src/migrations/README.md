# TypeORM migrations (scaffold)

**Current production-safe default:** the API uses `synchronize` controlled by `TYPEORM_SYNCHRONIZE` (defaults to `true`). This does **not** wipe data; TypeORM sync only applies additive schema changes.

## When you are ready to own schema via migrations

1. Set `TYPEORM_SYNCHRONIZE=false` in `.env` / App Service settings.
2. Generate a baseline migration from entities:

```bash
npx typeorm-ts-node-commonjs migration:generate -d src/data-source.ts src/migrations/InitSchema
```

3. Review the generated SQL (never auto-drop columns with data).
4. Apply:

```bash
npx typeorm-ts-node-commonjs migration:run -d src/data-source.ts
# or after build:
npx typeorm migration:run -d dist/data-source.js
```

Do **not** enable destructive sync or drop tables on free-tier Neon/Render databases without a backup.
