# ai-policy — Claude Code Skill

> Built for small VC and PE firms. If your team regularly handles board decks, LP data, deal memos, and NDA-bound materials — and you want a clear, enforceable answer to "can I put this in ChatGPT?" — this is for you.

Ask a question, get a named tool and a clear yes/no. No policy binders, no guessing.

```
/ai-policy can I use ChatGPT for this pitch deck?
```
```
❌ No. Pitch decks shared under NDA are Confidential — use an approved tool
   (M365 Copilot or Gemini for Workspace) logged in with your company email.

What to do instead:
• Use M365 Copilot (company email) to summarize or extract key points
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

## Tool list format

A CSV with seven columns: `Group`, `Tool`, `Plan`, `Notes`, `Highly Confidential`, `Confidential`, `NonConfidential`

```csv
Group,Tool,Plan,Notes,Highly Confidential,Confidential,NonConfidential
Microsoft 365,Microsoft 365 Copilot,Enterprise,Work email only,n,y,y
Google Workspace,Gemini + NotebookLM,Enterprise,Work email only,n,y,y
_meta,hc_label,,LP identities · cap tables · fund financials · sensitive PII,,,
_meta,conf_label,,Board decks · deal memos · NDA pitch decks · portfolio financials,,,
_meta,nc_label,,Public filings · market research · no-NDA decks,,,
```

The `_meta` rows define your classification tier labels. The advisor reads these to understand your firm's specific definitions — update them in the CSV and the advisor updates automatically.

Run `/ai-policy reset` to get a pre-filled template you can import or edit directly.

---

## Config

`config.yaml` is gitignored. Never commit it. Share with teammates via a secure channel (Slack DM, 1Password, etc.).

```yaml
firm_name: Your Firm
sheet_url: https://docs.google.com/spreadsheets/d/e/...  # Google Sheets published CSV URL
# sheet_url: /path/to/tools.csv                          # or a local CSV file
```

`sheet_url` accepts:
- A **Google Sheets** published CSV URL (recommended — live sync, change detection built in)
- A **local CSV file** path — works with Excel (Save As CSV) or Notion (Export → CSV)
