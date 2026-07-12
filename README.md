# GrowthKit — an AI growth engine for apps

Add one `<script>` line and an AI assembles a viral growth loop tailored to your
app from proven mechanics — then optimizes it automatically. No marketing team,
no ad budget.

🔗 **Live demo:** https://2026-07-oleksandr-team.hackonvibe.com
🎬 **Demo video (customer journey):** _<!-- PASTE YOUR VIDEO LINK HERE (YouTube / Loom / Google Drive) -->_

---

## 📋 Submission questionnaire

### 1. What does the application / service do?
GrowthKit is a **B2B growth engine for apps**. A developer drops a single
`<script>` tag into their product. An AI **"growth director"** then diagnoses the
app (its niche, its type, whether it has launched yet) and **assembles a viral
growth loop** for it out of proven, reusable mechanics — a shareable achievement
card, a referral link, a "made with" watermark, a pre-launch waitlist. The SDK
renders whatever the AI assigned, measures which card and copy convert best, and
**self-optimizes** by routing traffic to the winning A/B variant. In short: the
kind of growth loop a startup would hire a marketing team to build, delivered as
one line of code and run on autopilot.

### 2. Who is the target audience?
Indie developers, solo founders, and small early-stage startups shipping web and
mobile apps who have **no marketing team and no ad budget** — the people who can
build a product but not distribute it. It is especially valuable for pre-launch
and just-launched products that need organic, word-of-mouth growth.

### 3. Which countries are the expected buyers?
Developer tools sell globally online (Stripe, no field sales), so the reachable
market is worldwide. The primary buyers are in high-willingness-to-pay,
English-speaking developer markets: **United States, United Kingdom, Canada,
Germany, the Netherlands**, and the broad **global indie-maker community**
(India, Eastern Europe, SE Asia). Go-to-market starts with US + EU.

### 4. Who are your competitors?
- **Referral / growth SaaS:** ReferralCandy, GrowSurf, Viral Loops, Rewardful.
- **Viral "made with" badges / share widgets:** the growth-badge model used by
  Typeform, Linktree, Loom.
- **Mobile attribution & growth platforms:** Branch, AppsFlyer, Firebase
  Dynamic Links.

All of them hand you **tools you must configure and wire up yourself**.

### 5. What is your advantage?
1. **One-line install** — a single `<script>` tag, not an integration project.
2. **The AI picks the strategy**, per app, aware of its niche and stage —
   instead of you manually choosing and configuring mechanics.
3. **Self-optimizing** — it A/B-tests copy and auto-routes traffic to the winner.
4. **One SDK, different loops** — proven adaptability: for **FitTrack** (fitness,
   launched) the AI assembled *share + referral*; for **GuardianSOS** (safety,
   pre-launch) the same `growthkit.js` assembled *referral + waitlist*.
5. **Zero ad budget, zero marketing team** required.

---

## 🎬 Customer journey (what the video shows)

**1.1 — What the user enters and clicks**
1. Lands on the GrowthKit landing page → clicks **"Try the live demo."**
2. Inside the **FitTrack** demo app, completes a workout → GrowthKit pops up an
   **auto-generated share card** with the achievement → clicks **Share** (which
   carries a referral link).
3. Opens the **Dashboard** to see how the loop is performing.

**1.2 — What the user receives**
- A **working viral growth loop** (share + referral) live inside their app,
  assembled by the AI — with no marketing work on their part.
- A **developer dashboard** showing real numbers: clicks, conversion, the
  winning A/B variant, and the exact strategy the AI assigned to the app.
- **Growth on autopilot** — the loop keeps optimizing itself as data comes in.

---

## The idea in three layers
1. **AI director** — diagnoses the app and decides which growth mechanics fit it.
2. **Loop assembly** — the SDK renders the assigned mechanics from a library of
   reusable blocks (share, watermark, referral, waitlist).
3. **Self-optimization** — measures which card/copy converts best and routes more
   traffic to the winning A/B variant.

## Try it live
- **Landing / pitch:** https://2026-07-oleksandr-team.hackonvibe.com
- **FitTrack demo:** …/apps/fittrack/index.html
- **GuardianSOS demo:** …/apps/guardiansos/index.html
- **Dashboard:** …/dashboard/index.html

## Integrating the SDK
```html
<script src="config.js"></script>
<script
  src="sdk/growthkit.js"
  data-app-name="FitTrack"
  data-app-niche="fitness & sport"
  data-install-url="install.html"
  data-api-key="demo-fittrack"
></script>
```

## Stack
- Demo apps, dashboard, landing: plain HTML/CSS/JS (no frameworks).
- SDK: a single JS file; the share card is drawn on `<canvas>` (no external deps).
- Backend + DB: Supabase (Postgres + REST).
- AI: OpenAI `gpt-4o-mini`, **server-side only**.

## Security
The OpenAI key and Supabase `service_role` key are **server-side only** (`.env`,
never committed). Only the public `anon` key reaches the client, protected by
Row Level Security.

> Status: hackathon prototype. GuardianSOS is a UI mock with a demo disclaimer —
> it never sends real alerts, SMS, or contacts anyone.
