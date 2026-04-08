# ai-policy — Claude Code Skill

> Built for small VC and PE firms. If your team regularly handles board decks, LP data, deal memos, and NDA-bound materials — and you want a clear answer grounded in your company's actual approved tools — this is for you.

Ask a question, get a named tool and a clear yes/no. Answers reflect your firm's real-time tool policy, not generic advice.

```
/ai-policy can I use ChatGPT for this pitch deck?
```
```
❌ No. Pitch decks shared under NDA are Confidential — ChatGPT is not on the
   approved list. Use Claude Enterprise logged in with your company email.

What to do instead:
• Use Claude Enterprise (company email) to summarize or extract key points
• If it's a no-NDA deck, any reputable tool is fine for public-info research
• Ask the MP if you're unsure whether an NDA was signed
```

When the policy changes, update your tool list. Everyone's advisor updates automatically.

---

## How it works

Your firm's tool list and data classification rules live in a CSV — not in code. The advisor reads it, reasons from it, and gives grounded answers. No redeploys, no policy binders.

**Three modes:**

- `/ai-policy [question]` — instant policy Q&A ("can I use Granola for this LP call?")
- `/ai-policy doc` — generates a one-page PDF policy document from your Sheet
- `/ai-policy reset` — first-time setup for a new firm

**Data tiers** (defined in your Sheet, not hardcoded):

| Tier | Examples | AI tools allowed |
|------|----------|-----------------|
| Highly Confidential | LP identities, cap tables, fund financials, sensitive PII | None |
| Confidential | Board decks, deal memos, NDA pitch decks, portfolio financials | Approved tools only |
| Non-Confidential | Public filings, market research, no-NDA decks | Any reputable tool |

Your Sheet defines what goes in each tier via `_meta` rows — so if your firm adds "investor decks with financial projections" to Confidential, the advisor knows that without any code change.

---

## Install

```bash
git clone https://github.com/Nyaiken/ai-policy-skill ~/.claude/skills/ai-policy
cd ~/.claude/skills/ai-policy
npm install
```

Get `config.yaml` from your Managing Partner and drop it in:

```yaml
firm_name: Your Firm
sheet_url: https://docs.google.com/spreadsheets/d/e/...
```

That's it. Run `/ai-policy can I use X for Y?` in Claude Code.

---

## First-time setup (new firm)

No config yet? Run:

```
/ai-policy reset
```

This generates a Google Sheet template, walks you through filling it out, and creates your `config.yaml`. Takes about 5 minutes.

---

## Requirements

- [Claude Code](https://claude.ai/code)
- Node.js (for PDF generation via `npm install`)

---

## Tool list

Your tool list lives in a Google Sheet (or a local CSV file). Each row is one AI tool. Each column answers a question:

| Column | What to put here |
|--------|-----------------|
| **Group** | Category heading, e.g. "Microsoft 365", "Meeting AI" |
| **Tool** | Tool name as it should appear in the policy doc |
| **Plan** | Enterprise / Pro / Team / Business / Blocked / — |
| **Notes** | Anything worth knowing — shown in the doc and used by the advisor for Q&A |
| **Highly Confidential** | y / n — can this tool be used with highly confidential data? |
| **Confidential** | y / n |
| **NonConfidential** | y / n |

Three special `_meta` rows define what belongs in each data tier. The advisor reads these — so if your firm adds "investor decks with financial projections" to Confidential, the advisor automatically knows to ask about it.

| Group | Tool | Notes |
|-------|------|-------|
| _meta | hc_label | LP identities · cap tables · fund financials · sensitive PII |
| _meta | conf_label | Board decks · deal memos · NDA pitch decks · portfolio financials |
| _meta | nc_label | Public filings · market research · no-NDA decks |

Run `/ai-policy reset` to get a pre-filled template ready to import into Google Sheets.

---

## Config

`config.yaml` is gitignored. Never commit it. Share with teammates via a secure channel (Slack DM, 1Password, etc.).

```yaml
firm_name: Your Firm
sheet_url: https://docs.google.com/spreadsheets/d/e/...  # Google Sheets published CSV URL
# sheet_url: /path/to/tools.csv                          # or a local CSV file path
```
