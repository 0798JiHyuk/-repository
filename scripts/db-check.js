require("dotenv").config();
const { Client } = require("pg");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DB_ERR Missing DATABASE_URL in .env");
    process.exit(1);
  }

  const client = new Client({
    connectionString: url,
    connectionTimeoutMillis: 5000,
    statement_timeout: 5000,
  });
  try {
    await client.connect();
    const res = await client.query("SELECT 1 as ok");
    console.log("DB_OK", res.rows[0].ok);
  } catch (err) {
    console.error("DB_ERR", err.message);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

main();
