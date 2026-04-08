# ai-policy — Claude Code Skill

An AI policy advisor and one-page policy doc generator for your firm, built as a [Claude Code](https://claude.ai/code) skill.

## What it does

- **Advisor**: Ask "can I use ChatGPT for this pitch deck?" and get an instant, policy-grounded answer
- **Doc generator**: Generates a one-page PDF policy document from your Google Sheet tool list
- **Smart caching**: Detects Google Sheet changes via redirect timestamp — only re-fetches when needed

## Install

```bash
git clone https://github.com/YOUR_ORG/ai-policy ~/.claude/skills/ai-policy
cd ~/.claude/skills/ai-policy
npm install
```

Then drop in your `config.yaml` (get this from your Managing Partner):

```yaml
firm_name: Your Firm
sheet_url: https://docs.google.com/spreadsheets/d/e/...
```

## First-time setup (new firm)

If you don't have a config yet, run:

```
/ai-policy reset
```

This walks you through creating your Google Sheet and generating `config.yaml`.

## Usage

```
/ai-policy can I use ChatGPT for this pitch deck?
/ai-policy doc
```

## Requirements

- [Claude Code](https://claude.ai/code)
- Node.js + `npm install` (for PDF generation)
- A Google Sheet with your firm's tool list (see Mode 0 for the template)

## Config

`config.yaml` is gitignored — it contains your firm name and Sheet URL. Never commit it. Share it with teammates via a secure channel (Slack DM, 1Password, etc.).

```yaml
firm_name: Your Firm
sheet_url: https://docs.google.com/spreadsheets/d/e/...
```

## Google Sheet format

| Group | Tool | Plan | Notes | Highly Confidential | Confidential | NonConfidential |
|-------|------|------|-------|--------------------:|-------------:|----------------:|
| Microsoft 365 | Microsoft 365 Copilot | Enterprise | Work email only | n | y | y |
| ... | | | | | | |

Add `_meta` rows for `hc_label`, `conf_label`, `nc_label` to customize classification tier descriptions.
