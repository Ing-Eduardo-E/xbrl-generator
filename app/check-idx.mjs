import postgres from "postgres";
const sql = postgres("postgresql://neondb_owner:npg_PcLTCRh7a6nv@ep-aged-firefly-ae7j5k1l-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require", { ssl: "require" });
const r = await sql`SELECT indexname, tablename FROM pg_indexes WHERE indexname LIKE ${"idx_%"} ORDER BY tablename, indexname`;
console.table(r);
await sql.end();
