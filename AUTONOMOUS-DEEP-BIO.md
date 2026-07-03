# Autonomous deep-bio run — runbook

You are running **unattended** to generate v2 deep bios for people who don't have
one yet. Keep working batch after batch, on your own, until either the list is
empty or you've been told to stop. Nobody is watching — so verify your own work,
recover from your own errors, and never fabricate to keep moving.

Full per-bio spec (schema + rules) lives in `.claude/commands/deep-bio.md` — read
it once at the start; the JSON schema there applies regardless of which agent you
are. This file is the *loop*; that file is the *how to write one*.

**Resuming:** progress lives on disk, so you can be stopped and restarted at any
time. Whenever you begin (fresh or after a pause), just start the loop at step 1 —
the worklists recompute state from disk, so you never repeat or lose work.

**Two kinds of work** (do MISSING first, then BROKEN):
- **MISSING** — people with no bio file yet. Worklist: `deep-bio-worklist.mjs`.
- **BROKEN** — bio files that exist but FAIL validation (older schema, missing
  required Korean fields). Worklist: `deep-bio-broken.mjs`. Repairing = rewriting
  the file to full v2 schema; research the missing facts, never fabricate them.

---

## The loop — repeat until done

Run this cycle over and over. One cycle = one batch of **15** people.

1. **Check remaining.**
   `node scripts/deep-bio-worklist.mjs --count`  (missing)
   `node scripts/deep-bio-broken.mjs --count`    (broken)
   - If BOTH are 0, you are DONE — go to "Finishing".
   - If missing > 0, work missing (step 2a). Else work broken (step 2b).

2a. **Pull a MISSING batch.** `node scripts/deep-bio-worklist.mjs 15 --json`.
   Use its `id/name/birthday/nationality/industry/netWorth/source` as seed facts.
   These people are guaranteed missing — never re-check, never skip ahead.

2b. **Pull a BROKEN batch.** `node scripts/deep-bio-broken.mjs 15 --json`.
   Each already has a file at `public/deep-bios-v2/<id>.json` — open it, keep any
   correct data, and rewrite it to the full v2 schema (fill required fields from
   research). The seed facts come from the same DB fields.

3. **Research each person from REAL sources** (Wikipedia, Forbes, Bloomberg,
   Reuters, WSJ, NYT, FT, BBC, filings, official bios). Do **not** invent facts,
   dates, quotes, or net-worth numbers. If you cannot verify a person at all,
   skip *that person* (log it — see step 7) and keep going with the rest.

4. **Write** `public/deep-bios-v2/<id>.json` for each, exactly matching the
   schema in `.claude/commands/deep-bio.md`. All `*Ko` fields required and in
   natural Korean. Target depth = **whatever the validator accepts** (see step 5):
   a full career timeline, 3+ failures, money mechanics, and character are what
   matter. `quotes` and `wealthHistory` are optional — include a real sourced
   quote or a wealth point only if you already have it from your research; do
   **not** slow down hunting for them, and never fabricate one to fill the field.
   An empty `quotes: []` and a single-point `wealthHistory` are acceptable.

5. **Validate the batch:**
   `node scripts/validate-deep-bio-v2.mjs <id1> <id2> ...`
   Fix every `error:` and re-run until it prints `0 failed`. Do **not** proceed
   with a failing file — either fix it or delete it and log the skip.

6. **Rebuild the index:** `node scripts/build-deep-bio-index.ts`

7. **Checkpoint.** Append one line per batch to `deep-bio-run.log` at the repo
   root: the UTC time, ids written, ids skipped (+reason), and remaining count.
   Then commit:
   ```bash
   git add public/deep-bios-v2 public/deep-bio-index.json deep-bio-run.log
   git commit -m "Add deep bios: <id1>-<idN> (autonomous batch)"
   ```
   Committing every batch means a crash never loses more than one batch, and the
   worklist auto-resumes from disk on the next cycle.

8. **Go back to step 1.**

---

## Stop conditions

Stop the loop and go to "Finishing" when ANY of these is true:
- The worklist count reaches **0**.
- You have completed **~18 batches (≈270 people)** this run — a safe ceiling for
  a 4–5 hour session. (Recount if unsure; better to stop early than drift.)
- Validation keeps failing on the same file after **3** honest fix attempts, or
  the same command errors **3 times in a row** — stop and report rather than loop
  forever. Leave the log explaining where you stopped.

## Guardrails (do NOT violate)

- **Accuracy over throughput.** A skipped person is fine; a fabricated one is not.
  Every `source` must be a real URL or a recognizable outlet name.
- **Only touch bio data.** Files you may create/edit: `public/deep-bios-v2/*.json`,
  `public/deep-bio-index.json`, `deep-bio-run.log`. Do not modify app code,
  existing passing bios, `billionaires.json`, configs, or dependencies.
- **`careerTimeline` ages must match `birthday`** (age ≈ year − birthYear ±1) and
  have no >10-year gap — the validator enforces this; respect it while writing.
- **Never `git push`** and never open a PR. Local commits only; the human reviews
  and pushes.
- If something is ambiguous, prefer the conservative choice (skip + log) over a
  guess.

## Finishing

When you stop, write a final summary to the end of `deep-bio-run.log` and print it:
- total bios written this run, total skipped (with reasons),
- remaining count (`node scripts/deep-bio-worklist.mjs --count`),
- the last commit hash,
- anything the human should look at.
