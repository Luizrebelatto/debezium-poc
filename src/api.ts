import { Database } from "bun:sqlite";

const db = new Database(":memory:");

const PG_CONFIG = {
  host: "localhost",
  port: 5434,
  user: "postgres",
  password: "postgres",
  database: "app",
};

async function query(sql: string, params: any[] = []) {
  const { Client } = await import("pg");
  const client = new Client(PG_CONFIG);
  await client.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    await client.end();
  }
}

async function execute(sql: string, params: any[] = []) {
  const { Client } = await import("pg");
  const client = new Client(PG_CONFIG);
  await client.connect();
  try {
    const result = await client.query(sql, params);
    return result;
  } finally {
    await client.end();
  }
}

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (method === "OPTIONS") {
      return new Response(null, { headers });
    }

    try {
      if (path === "/users" && method === "GET") {
        const users = await query("SELECT * FROM users ORDER BY id");
        return new Response(JSON.stringify(users), { headers });
      }

      if (path === "/users" && method === "POST") {
        const body = await req.json();
        const { name, email } = body;
        const result = await execute(
          "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *",
          [name, email]
        );
        return new Response(JSON.stringify(result.rows[0]), { headers, status: 201 });
      }

      const putMatch = path.match(/^\/users\/(\d+)$/);
      if (putMatch && method === "PUT") {
        const id = putMatch[1];
        const body = await req.json();
        const { name, email } = body;
        const result = await execute(
          "UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING *",
          [name, email, id]
        );
        if (result.rowCount === 0) {
          return new Response(JSON.stringify({ error: "User not found" }), { headers, status: 404 });
        }
        return new Response(JSON.stringify(result.rows[0]), { headers });
      }

      const deleteMatch = path.match(/^\/users\/(\d+)$/);
      if (deleteMatch && method === "DELETE") {
        const id = deleteMatch[1];
        const result = await execute("DELETE FROM users WHERE id = $1 RETURNING *", [id]);
        if (result.rowCount === 0) {
          return new Response(JSON.stringify({ error: "User not found" }), { headers, status: 404 });
        }
        return new Response(JSON.stringify({ deleted: result.rows[0] }), { headers });
      }

      if (path === "/orders" && method === "GET") {
        const orders = await query("SELECT * FROM orders ORDER BY id");
        return new Response(JSON.stringify(orders), { headers });
      }

      if (path === "/orders" && method === "POST") {
        const body = await req.json();
        const { user_id, total, status = "pending" } = body;
        const result = await execute(
          "INSERT INTO orders (user_id, total, status) VALUES ($1, $2, $3) RETURNING *",
          [user_id, total, status]
        );
        return new Response(JSON.stringify(result.rows[0]), { headers, status: 201 });
      }

      return new Response(JSON.stringify({ error: "Not found" }), { headers, status: 404 });

    } catch (error: any) {
      console.error("Error:", error);
      return new Response(JSON.stringify({ error: error.message }), { headers, status: 500 });
    }
  },
});

console.log(`API running http://localhost:${server.port}`);
