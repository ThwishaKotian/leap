# Alumni Match

A study-abroad aspirant enters their LinkedIn URL, the degree they want, the target country and their current city. The tool returns **exactly three alumni** who studied that degree in that country and whose **LinkedIn profile before their degree** looked most like the student's profile today. Each match comes with ways to connect, an ethically sourced email where one exists, and a personalised cold email pitching a paid mentorship call.

Built as a working prototype (Track 1) in a 3-hour timebox.

- **Live demo:** _link added after deployment_
- **Stack:** Vite + React 19 + TypeScript + Tailwind CSS 4. Static single-page app, no backend.
- **Data:** synthetic only (see [Synthetic data](#synthetic-data)).

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # 114 tests: matching, explanations, email, daily limit, UI flows
npm run build    # type-check + production build to dist/
npm run lint
```

---

## Product hypothesis

> An aspirant trusts and acts on advice from someone who **started where they are now** (same skills, industry, experience level and city) and then made the exact move they are planning (same degree, same country). Three such people, each with a clear reason they were picked and a ready-to-send personal message, convert to booked mentorship calls far better than a long list of loosely related alumni.

What follows from this:

- **The comparison point is the alumnus's past, not their present.** A Data Scientist in Munich today is only a useful mentor for a Bangalore analyst if they *were* something like a Bangalore analyst before their master's.
- **Degree and country are hard requirements.** Similarity on everything else can't make up for having studied the wrong thing in the wrong place.
- **Few, explained matches beat many.** That's why the count is fixed at 3 and every card says why that person was picked.

### Quality metrics

| Level | Metric | How it's defined here |
|---|---|---|
| Match quality | Similarity score (0–100) | The weighted formula below, shown on every card with a per-signal breakdown |
| | Strength label | ≥ 75 "Very similar start", ≥ 60 "Strong match", ≥ 40 "Some overlap", below 40 "Loose match" |
| | Exact-match rate | Share of results that are exact degree + country matches. A search is `complete` only when all 3 are exact |
| Contact quality | Source of the contact | Self-published email > public university-directory email > LinkedIn/X only. The source is shown next to every email |
| Email quality | Personalisation and a clear ask | The template always uses the alumnus's university and pre-study background, adds up to 3 shared skills and 2 shared activities when they exist, and ends with one specific request (a paid 30-minute call) |
| Outcome (production) | Reply rate, calls booked per student, call rating | Not measurable in a prototype. These are what the weights would eventually be tuned against |

## User journey

The student reaches an alumnus's email in **3 clicks**:

1. **Find my 3 alumni matches.** The form opens pre-filled with a demo student (Riya Deshpande, MS in Data Science, Germany, Bangalore), so an evaluator can click straight away.
2. **Connect with ⟨name⟩.** Opens a panel inside the card with the email and its source (or a plain "no email published" message), LinkedIn / X / résumé links, and an editable subject and message.
3. **Copy email** (or **Open in email app** when an email exists).

Five demo students are one click away under the form. Between them they cover all five streams and every state, including the limited-match case (Aniket Jadhav, Mechanical Engineering, Germany).

Every card shows the alumnus's name, degree, university and country, graduation year, current role, a score ring, a "Why this match?" list in plain language, and an expandable score breakdown. A **How is this calculated?** section above the cards shows the weights.

## Matching approach

The matching is rule-based and deterministic, in [`src/lib/match.ts`](src/lib/match.ts). There's no LLM in the ranking: the same input always gives the same 3 people in the same order, and every point of the score can be explained.

1. **Normalise** free text with alias tables ([`src/data/synonyms.ts`](src/data/synonyms.ts)). Degree prefixes are stripped ("M.Sc.", "MS in", "Master's in"), so "M.Sc. Data Science", "MS DS" and "MS in Data Science" all become `data-science`. Bengaluru = Bangalore, Deutschland = Germany, reactjs = React, SolidWorks = CAD. Anything unrecognised is kept as typed, never guessed.
2. **Filter** on degree + country (see [below](#exact-stream--country-filtering)).
3. **Score** each candidate's pre-study snapshot against the student.
4. **Sort** by tier (exact first), then score, then alumnus id so ties always come out in the same order. Take 3.

### Scoring weights

| Signal | Weight | Similarity, 0 to 1 |
|---|---|---|
| Skills | **35%** | Sørensen–Dice overlap of normalised skills: 2·shared / (student's + alumnus's) |
| Industry | **20%** | 1 if the same industry; 0.5 if related (shares a group, e.g. Fintech and Banking); else 0 |
| Experience | **20%** | 1 − (gap in years ÷ 5), not below 0 |
| City | **15%** | 1 if the same city; 0.5 if the same country; else 0 |
| Extracurriculars | **10%** | Sørensen–Dice overlap of normalised activities |

`score = round(100 × Σ weight × similarity)`. The weights live in [`src/config.ts`](src/config.ts) and a test checks they sum to 100%.

**Why these weights:** skills are the strongest evidence of a similar starting point and the most detailed signal, so they get the most weight. Industry and experience level decide whether the alumnus's application story applies to the student. City is a weaker signal, but it matters for practical advice (same colleges, employers, visa offices). Extracurriculars are often missing from profiles, so they only break ties. These are a starting hypothesis; in production they'd be tuned against reply and booking rates.

**Why Dice and not Jaccard:** profiles list 4–6 skills. Jaccard punishes short lists harshly (3 shared out of 6 and 6 is 0.33), while Dice gives 0.5 for the same overlap. That matches what a person would call "half the same skills".

### Why pre-study snapshots

Each alumnus has a `preStudy` snapshot (skills, industry, years of experience, city, extracurriculars), recorded as of just before their degree. **It is the only alumnus data used for similarity.** Current role, university, graduation year and contact details never affect the score. The type signature enforces this (`scoreSnapshot(student, preStudy)`), and tests check that changing every other field leaves the score the same. Comparing against today's profile would favour senior alumni whose current skills look like a wish list, not a starting point.

### Exact stream + country filtering

Only alumni whose normalised degree **and** country both match the search count as **exact** matches. Exact matches always rank above anything else: an exact match scoring 0 still ranks above a fallback scoring 100. Tests check this over all 150 combinations of demo student × stream × country.

### Fallback strategy

Fallbacks are used only when fewer than 3 exact matches exist. In order:

1. **Same degree, different country** (`any-country`)
2. **Related degree, same country** (`related-stream`). Related degrees are listed explicitly: Data Science ↔ Business Analytics / Computer Science, MBA ↔ Business Analytics.

Fallbacks are scored the same way and sorted below every exact match. The matcher never adds unrelated people to reach 3: if there aren't enough candidates, it returns fewer.

### Limited-match behaviour

A result set is `complete` only when all 3 are exact matches. Otherwise it is `limited`, and the UI:

- changes the heading from "Your 3 alumni matches" to, for example, **"2 exact matches + 1 fallback"**;
- shows a note above the cards: *"Only 2 alumni in our network studied Mechanical Engineering in Germany. We've added 1 close alternative…"*;
- puts a **Fallback match** banner on that card, stating what they actually studied: *"Studied Mechanical Engineering in United States, not Germany."*;
- writes the outreach email to match: *"You did Mechanical Engineering at Purdue University in United States rather than Germany…"*.

A degree with no alumni at all shows an empty state instead of unrelated people.

## Contact-data ethics

- **Only contact details the alumnus published themselves**, each shown with its source:
  - *Published on their own site* (an email on their résumé site)
  - *Public university alumni directory*
  - *Public profile* (LinkedIn, X)
- **No guessing** email addresses from name patterns, **no scraping**, and no paid "email finder" lookups.
- When there's no public email (19 of the 45 synthetic alumni), the panel says so and points the student to LinkedIn. The draft is still provided.
- The outreach email is written *by* the student and sent *from* the student's own email or LinkedIn. The tool never sends anything.
- In production, alumni would opt in to being matched (see [What I'd build next](#what-id-build-next-in-production)).

## Synthetic data

**All 45 alumni and the 5 demo students are fictional.** Universities are real institutions; people, employers ("a Munich insurtech") and contact details are invented. Emails and résumé sites use the reserved `.example` domain (RFC 2606), so they can never reach anyone; a test checks this. LinkedIn and X links use made-up handles ending in `-synthetic` / `_synthetic` and will 404. The data files carry this notice in their headers, and the app's footer repeats it.

The dataset covers 5 degrees (Data Science, Computer Science, MBA, Business Analytics, Mechanical Engineering) across 5 countries (Germany, UK, US, Canada, Ireland). Every demo student's search has at least 3 exact matches, except Mechanical Engineering in Germany, which has only 2 so the limited-match state can be demonstrated.

## Daily limit

The brief asks for a static daily limit of 3 alumni. Implemented in [`src/lib/dailyLimit.ts`](src/lib/dailyLimit.ts):

- A student can see up to **3 different alumni per calendar day** (local midnight reset).
- An alumnus is counted **when a search actually shows them**, not on page load. Unknown profiles and searches with no results cost nothing.
- **Seeing the same alumni again is free**, so re-running a search never locks you out.
- A search that would show more *new* alumni than remain is not run. The student sees a friendly explanation: the reason for the limit, when it resets, and that repeat views are free.
- The remaining allowance is always shown under the main button ("3 of 3 new alumni left today").

**This is client-side demo enforcement, not abuse prevention.** Usage is stored in the browser's `localStorage`, so clearing site data, a private window or another browser restores the allowance. That's deliberate: so an evaluator is never locked out, the limit screen has a **Reset demo allowance** button, and if storage is blocked the app allows the search rather than blocking it. A real limit needs a server and a signed-in account (see [What I'd build next](#what-id-build-next-in-production)).

## What was deliberately not built, and why

| Not built | Why |
|---|---|
| **LinkedIn scraping** | Against LinkedIn's terms of service and legally risky. A matching product that depends on scraping can't be shipped. The demo maps 5 sample LinkedIn URLs to sample profiles and says plainly when a URL isn't one of them. |
| **People Data Labs (or similar enrichment)** | Needs a paid key and sends personal data to a third party. It's the right production source for the student's profile and the alumni pool (see below), but it adds nothing to proving the matching and UX in a 3-hour prototype. |
| **Authentication** | No user accounts are needed to show the flow, and requiring a login would slow down the demo. The trade-off is the client-side daily limit above. |
| **Backend / database** | The dataset is small and matching is a pure function, so it runs instantly in the browser. Everything deploys as static files. |
| **LLM email generation** | See next section. |

## LLM decision

**A fixed email template first; an LLM optionally, later.**

- The template ([`src/lib/emailTemplate.ts`](src/lib/emailTemplate.ts)) is always available, free and instant. It never states anything that isn't in the data, so a fallback alumnus is never told they studied the requested degree. Tests check that last point.
- An LLM could make the wording warmer and less formulaic. But it needs a server endpoint to keep the API key secret, adds cost and delay, and can introduce made-up claims ("I loved your talk at…"). None of that was worth it in the timebox.
- **Planned design:** one serverless endpoint takes only the structured facts the template already uses (shared skills, pre-study background, what they studied and where) and asks the model to rewrite, not to add facts. If no key is set, the call fails or times out, or a check finds a claim not in the input, the endpoint returns the template email. The UI would label which version is shown.

## Main assumptions

1. **The LinkedIn URL identifies the student.** Its profile supplies skills, industry, years of experience and extracurriculars. The city typed into the form overrides the profile's city.
2. **An alumnus's pre-study profile can be reconstructed** from their dated LinkedIn history (experience entries before the degree's start date). The synthetic data stores it directly.
3. **"Stream / degree" is the subject, not the degree type.** MS vs MSc vs MEng are treated as the same. MBA is its own subject.
4. **Most users are applying from India**, so the city list and "same country" credit are India-centric. Unknown cities still match exactly by name.
5. **The daily limit is "3 different alumni per day".** It exists to keep outreach focused and protect alumni from being flooded. Repeat views of the same alumni don't count.
6. **Mentorship is paid.** The email says so up front, as the brief describes paid one-to-one guidance. Payment and booking are out of scope.
7. **Fallback order:** a student asking for Data Science in Germany is better served by a Data Scientist who studied in the UK than by a Business Analytics graduate in Germany, so `any-country` comes before `related-stream`.

## Key trade-offs

| Choice | Gained | Cost |
|---|---|---|
| Rule-based scoring instead of embeddings | Explainable, deterministic, testable, no API | Misses meaning outside the alias lists (e.g. "PyTorch" isn't related to "Deep Learning") |
| Fixed weights | A clear hypothesis that can be argued about | Not tuned on outcomes |
| Exact matches always first | Never implies a fallback fits the request | A near-perfect fallback can rank below a weak exact match |
| Returning fewer than 3 when the data is thin | Honest | Breaks "exactly three" in rare cases. Shown clearly as a limited state |
| Matching in the browser | No backend, instant, free to host | The whole (synthetic) dataset ships to the browser. Real alumni data would have to stay on a server |
| Template email | Reliable, no made-up claims, no cost | Every draft follows the same structure |
| localStorage daily limit | No accounts, no backend, the evaluator can't be locked out | Easy to get around. Demo only |
| 450 ms simulated profile lookup | The loading state reflects the real flow | Slightly slower than strictly necessary |

## Known limitations

- Only the 5 demo LinkedIn URLs work. Other URLs get a clear "couldn't read that profile" message.
- Synthetic contact links don't lead anywhere.
- Coverage is 5 degrees × 5 countries. Typos like "Data Sciense" aren't recognised.
- Industry groupings are coarse (e.g. Marketing and E-commerce are unrelated).
- The daily limit can be reset or bypassed by clearing browser storage.
- No analytics, so the outcome metrics above can't yet be measured.
- Emails are templated, not AI-written.

## What I'd build next in production

1. **Data:** Sign In with LinkedIn only provides basic identity (name, email, photo), so the student's profile would come from a licensed enrichment API such as People Data Labs (looked up by their LinkedIn URL, with consent) or from the PDF export of their LinkedIn profile, which they upload themselves. The alumni pool would come from **opted-in alumni**: Leap's own alumni network and university partnerships. Rebuild each pre-study snapshot from dated experience entries.
2. **Accounts and a server-side limit:** sign-in, the 3-per-day allowance enforced per account on the server, and matching run on the server so alumni data never reaches the browser.
3. **Better similarity:** skill embeddings on top of the alias tables, a learned industry taxonomy, and weights tuned against reply and booking outcomes, with the current scorer kept as an explainable baseline.
4. **The optional LLM email** behind a server endpoint, with the template fallback and fact-checking described above.
5. **Booking and payments:** alumni availability, paid call checkout, and reviews after the call.
6. **Measurement:** events for search → connect → copy/send → reply → booked → rated, to track the outcome metrics and tune the weights.
7. **Privacy and compliance:** alumni consent and opt-out, data retention limits, GDPR/DPDP handling for EU and Indian users, and rate limits on outreach per alumnus.

## Project layout

```
src/
  config.ts              Weights, result count, daily limit
  types.ts               Data types
  data/                  Synthetic alumni, demo students, alias tables
  lib/
    normalize.ts         Text normalisation and labels
    match.ts             Filtering, scoring, ranking
    explain.ts           "Why this match?" and score labels
    emailTemplate.ts     Fixed outreach email
    dailyLimit.ts        localStorage daily allowance
  components/            Form, results, card, connect panel, score badge
  App.tsx                Page and search states
```

## Deploying to Vercel

The app is a static Vite build; [`vercel.json`](vercel.json) pins the settings.

1. Push the repo to GitHub and import it in Vercel. The framework preset is detected as **Vite**.
2. Build command `npm run build`, output directory `dist`, Node 22.12 or newer (Vercel’s default Node 22.x works).
3. No environment variables are needed.

Or from the command line: `npx vercel` (preview) / `npx vercel --prod`.

## Deploying to GitHub Pages

This repository deploys to GitHub Pages through GitHub Actions ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)).

- Every push to `main` (or a manual **Run workflow**) installs with `npm ci`, runs `npm test`, then builds and deploys `dist` using the official GitHub Pages actions. A failing test stops the deployment.
- Pages serves the site from `/leap/`, so the workflow builds with `BASE_PATH=/leap/`. Without that variable, `vite.config.ts` falls back to `/`, so local and Vercel builds are unaffected.
- One-time setup: in the repository's **Settings → Pages**, set **Source** to **GitHub Actions**.
