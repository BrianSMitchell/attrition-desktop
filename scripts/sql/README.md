# Schema snapshot helpers

This folder contains scripts to dump your local Postgres schema so you can diff against Supabase migrations.

## Option A: pg_dump (exact DDL)

PowerShell:

```
docker exec -i {{pg_container}} pg_dump -U {{DB_USER}} -d {{DB_NAME}} -n public -s --no-owner --no-privileges > schema_dump.sql
```

- `-s` schema only
- `-n public` limit to public schema
- Output: `schema_dump.sql` (CREATE TABLE/INDEX/CONSTRAINT statements)

## Option B: SQL introspection (deterministic JSON)

1) Copy `schema_introspection.sql` into the container or mount it, then run:

```
docker exec -i {{pg_container}} psql -U {{DB_USER}} -d {{DB_NAME}} -f /path/in/container/schema_introspection.sql > schema.json
```

- Output: `schema.json` with tables, columns, PK/unique/indexes, FKs, and RLS policies.

## Focused buildings-only DDL (optional)

```
docker exec -i {{pg_container}} pg_dump -U {{DB_USER}} -d {{DB_NAME}} -t public.buildings -s --no-owner --no-privileges > buildings.sql
```

## Tips
- To view policies only:
  ```sql
  SELECT * FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;
  ```
- To list tables quickly:
  ```sql
  SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
  ```
