/**
 * GrowthKit — AI director (local script).
 *
 * Runs the "director" server-side: for each app it asks OpenAI which growth
 * mechanics to activate and with what copy, then upserts the resulting strategy
 * into Supabase (table `strategies`). The SDK later reads that strategy and
 * renders the assigned mechanics (Step 9).
 *
 * The OpenAI key and Supabase service_role key live in a local .env
 * (gitignored) and NEVER reach the browser.
 *
 * Usage (from the repo root):
 *   node backend/director/director.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");

// --- Minimal .env loader (no dependency) --------------------------------------
function loadEnv(path) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    console.error(`Missing .env at ${path}\nCopy .env.example to .env and fill it in.`);
    process.exit(1);
  }
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
  return env;
}

const env = loadEnv(join(ROOT, ".env"));
for (const key of ["OPENAI_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
  if (!env[key]) {
    console.error(`Missing ${key} in .env`);
    process.exit(1);
  }
}

// --- The mechanics catalog the AI chooses from --------------------------------
const ALLOWED_TYPES = ["share", "watermark", "referral", "waitlist"];

const CATALOG = `
Available growth mechanics — choose the 1-3 that create the STRONGEST viral loop
for THIS specific app (do not just pick all of them):

- "share": achievement / result sharing. A user shares a branded card of their
  result. Best for apps with milestones, scores, streaks, finished sessions.
  params: { "title": string (card headline), "cta": string (short call to action) }

- "watermark": a passive "Made with [App]" badge on user-generated output.
  Best for apps that create shareable content.
  params: { "text": string }

- "referral": invite a friend, both get a reward. Best when the app becomes more
  valuable the more people (or contacts) the user adds.
  params: { "reward": string }

- "waitlist": a queue where inviting friends moves you up. Best for apps that are
  NOT launched yet (pre-launch / early access).
  params: { "title": string, "sub": string }
`;

const SYSTEM_PROMPT =
  "You are GrowthKit's growth strategist. Given one app, choose the growth " +
  "mechanics that form the strongest viral loop for it and write short, " +
  "app-specific copy. Different apps must get different loops. Respond ONLY " +
  "with a JSON object, no prose.";

function buildUserPrompt(app) {
  return (
    `App name: ${app.name}\n` +
    `Niche: ${app.niche}\n` +
    `Launched: ${app.launched}\n` +
    `Has achievements/results: ${app.hasAchievements}\n\n` +
    `${CATALOG}\n\n` +
    `Return JSON exactly in this shape:\n` +
    `{ "mechanics": [ { "type": "<one of ${ALLOWED_TYPES.join("|")}>", "params": { ... } } ], ` +
    `"reasoning": "one short sentence explaining the choice" }`
  );
}

// --- OpenAI call --------------------------------------------------------------
async function askDirector(app) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(app) },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI HTTP ${response.status}: ${await response.text()}`);
  }
  const data = await response.json();
  const strategy = JSON.parse(data.choices[0].message.content);

  // Keep only mechanics the SDK actually knows about.
  strategy.mechanics = (strategy.mechanics || []).filter((m) => {
    const ok = ALLOWED_TYPES.includes(m.type);
    if (!ok) console.warn(`  ⚠ dropping unknown mechanic "${m.type}"`);
    return ok;
  });
  return strategy;
}

// --- Save to Supabase (upsert on app_key, via service_role) -------------------
async function saveStrategy(app, strategy) {
  const response = await fetch(
    `${env.SUPABASE_URL}/rest/v1/strategies?on_conflict=app_key`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        app_key: app.apiKey,
        app_name: app.name,
        app_niche: app.niche,
        launched: app.launched,
        strategy,
        reasoning: strategy.reasoning ?? null,
      }),
    }
  );
  if (!response.ok) {
    throw new Error(`Supabase HTTP ${response.status}: ${await response.text()}`);
  }
}

// --- Main ---------------------------------------------------------------------
const apps = JSON.parse(readFileSync(join(__dirname, "apps.json"), "utf8"));

console.log(`GrowthKit director — deciding strategies for ${apps.length} app(s)\n`);

for (const app of apps) {
  process.stdout.write(`• ${app.name} (${app.apiKey}) … `);
  try {
    const strategy = await askDirector(app);
    await saveStrategy(app, strategy);
    const types = strategy.mechanics.map((m) => m.type).join(" + ");
    console.log("done");
    console.log(`    mechanics: ${types}`);
    console.log(`    reasoning: ${strategy.reasoning}\n`);
  } catch (error) {
    console.log("FAILED");
    console.error(`    ${error.message}\n`);
  }
}

console.log("Finished. Strategies are stored in Supabase (table: strategies).");
