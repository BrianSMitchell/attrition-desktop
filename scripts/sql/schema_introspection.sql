-- schema_introspection.sql
-- Deterministic JSON snapshot of public schema (tables, columns, constraints, indexes, policies)
-- Use this to diff your running Postgres (Docker) against Supabase migrations.

WITH tables AS (
  SELECT c.oid AS oid, n.nspname AS schema, c.relname AS name
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind = 'r'  -- ordinary tables
    AND n.nspname = 'public'
),
cols AS (
  SELECT
    t.schema,
    t.name,
    a.attnum,
    a.attname AS column_name,
    pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
    NOT a.attnotnull AS is_nullable,
    (SELECT pg_get_expr(ad.adbin, ad.adrelid)
     FROM pg_attrdef ad
     WHERE ad.adrelid = t.oid AND ad.adnum = a.attnum) AS column_default
  FROM tables t
  JOIN pg_attribute a ON a.attrelid = t.oid
  WHERE a.attnum > 0 AND NOT a.attisdropped
),
pks AS (
  SELECT
    t.schema,
    t.name,
    i.relname AS index_name,
    array_agg(a.attname ORDER BY a.attnum) AS columns
  FROM tables t
  JOIN pg_index ix         ON ix.indrelid = t.oid AND ix.indisprimary
  JOIN pg_class i          ON i.oid = ix.indexrelid
  JOIN pg_attribute a      ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
  GROUP BY 1,2,3
),
uniqs AS (
  SELECT
    t.schema,
    t.name,
    i.relname AS index_name,
    array_agg(a.attname ORDER BY a.attnum) AS columns
  FROM tables t
  JOIN pg_index ix         ON ix.indrelid = t.oid AND ix.indisunique AND NOT ix.indisprimary
  JOIN pg_class i          ON i.oid = ix.indexrelid
  JOIN pg_attribute a      ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
  GROUP BY 1,2,3
),
idx AS (
  SELECT
    t.schema,
    t.name,
    i.relname AS index_name,
    pg_get_indexdef(i.oid) AS definition
  FROM tables t
  JOIN pg_index ix ON ix.indrelid = t.oid
  JOIN pg_class i  ON i.oid = ix.indexrelid
),
fks AS (
  SELECT
    n.nspname        AS schema,
    c.relname        AS name,
    con.conname      AS constraint_name,
    rn.nspname       AS ref_schema,
    rc.relname       AS ref_table,
    ARRAY(
      SELECT a.attname
      FROM unnest(con.conkey) AS k
      JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = k
      ORDER BY a.attnum
    ) AS columns,
    ARRAY(
      SELECT a.attname
      FROM unnest(con.confkey) AS k
      JOIN pg_attribute a ON a.attrelid = con.confrelid AND a.attnum = k
      ORDER BY a.attnum
    ) AS ref_columns,
    con.confupdtype  AS update_action,
    con.confdeltype  AS delete_action
  FROM pg_constraint con
  JOIN pg_class c ON c.oid = con.conrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_class rc ON rc.oid = con.confrelid
  JOIN pg_namespace rn ON rn.oid = rc.relnamespace
  WHERE con.contype = 'f' AND n.nspname = 'public'
),
pol AS (
  SELECT
    schemaname AS schema,
    tablename  AS name,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
  FROM pg_policies
  WHERE schemaname = 'public'
)

SELECT jsonb_pretty(
  jsonb_agg(
    jsonb_build_object(
      'schema', t.schema,
      'table',  t.name,
      'columns', (
        SELECT jsonb_agg(
                 jsonb_build_object(
                   'name', c.column_name,
                   'type', c.data_type,
                   'nullable', c.is_nullable,
                   'default', c.column_default
                 )
                 ORDER BY c.attnum
               )
        FROM cols c
        WHERE c.schema = t.schema AND c.name = t.name
      ),
      'primary_key', (
        SELECT jsonb_agg(
                 jsonb_build_object(
                   'name', pk.index_name,
                   'columns', pk.columns
                 )
               )
        FROM pks pk
        WHERE pk.schema = t.schema AND pk.name = t.name
      ),
      'unique_constraints', (
        SELECT jsonb_agg(
                 jsonb_build_object(
                   'name', uq.index_name,
                   'columns', uq.columns
                 )
               )
        FROM uniqs uq
        WHERE uq.schema = t.schema AND uq.name = t.name
      ),
      'indexes', (
        SELECT jsonb_agg(
                 jsonb_build_object(
                   'name', i.index_name,
                   'definition', i.definition
                 )
               )
        FROM idx i
        WHERE i.schema = t.schema AND i.name = t.name
      ),
      'foreign_keys', (
        SELECT jsonb_agg(
                 jsonb_build_object(
                   'name', f.constraint_name,
                   'columns', f.columns,
                   'ref_table', (f.ref_schema || '.' || f.ref_table),
                   'ref_columns', f.ref_columns,
                   'on_update', f.update_action,
                   'on_delete', f.delete_action
                 )
               )
        FROM fks f
        WHERE f.schema = t.schema AND f.name = t.name
      ),
      'policies', (
        SELECT jsonb_agg(
                 jsonb_build_object(
                   'policy', p.policyname,
                   'cmd', p.cmd,
                   'roles', p.roles,
                   'qual', p.qual,
                   'with_check', p.with_check,
                   'permissive', p.permissive
                 )
               )
        FROM pol p
        WHERE p.schema = t.schema AND p.name = t.name
      )
    )
  ORDER BY t.schema, t.name
)) AS schema_json
FROM tables t;
