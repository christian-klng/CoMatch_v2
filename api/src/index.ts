import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { health } from "./routes/health.js";
import { auth } from "./routes/auth.js";
import { skills } from "./routes/skills.js";
import { communities } from "./routes/communities.js";
import { matches } from "./routes/matches.js";
import { admin } from "./routes/admin.js";

const app = new Hono();

app.use("*", cors({ origin: process.env.CORS_ORIGIN ?? "*" }));

app.route("/health", health);
app.route("/api/auth", auth);
app.route("/api/skills", skills);
app.route("/api/communities", communities);
app.route("/api/matches", matches);
app.route("/api/admin", admin);

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`CoMatch API listening on :${info.port}`);
});
