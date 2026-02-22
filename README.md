# wizanon.me

**Financial tools that mind their own business.**

Wizanon (_wizard_ + _anonymous_) is a suite of privacy-respecting financial tools that run entirely client-side. No accounts, no tracking, no cookies, no server-side processing. Everything executes in the browser. The wizard helps; the wizard asks nothing in return.

## Tools

| Tool | Description | Status |
|------|-------------|--------|
| Compound Interest Calculator | Principal, rate, time, contributions, compounding frequency | 🔨 In Progress |
| Loan/Mortgage Calculator | Monthly payment, amortization schedule, total interest | 📋 Planned |
| FIRE Calculator | Financial independence — how long until you can retire | 📋 Planned |
| Inflation Adjuster | What $X today equals in Y years | 📋 Planned |
| Investment Comparison | Compare two investment scenarios side by side | 📋 Planned |
| Savings Goal Calculator | How much to save monthly to reach a target | 📋 Planned |
| Net Worth Tracker | Client-side only, localStorage, zero server contact | 📋 Planned |
| Crypto Mining Calculator | Profitability calculator (hashrate, power, difficulty) | 📋 Planned |

## Architecture

- **Framework:** React + Vite + TypeScript
- **Routing:** React Router (SPA)
- **Hosting:** GitHub Pages with custom domain (`wizanon.me`)
- **Deployment:** GitHub Actions — push to `main` → build → deploy
- **SSL:** Automatic via GitHub Pages (Let's Encrypt)

## Principles

- 🔒 **No tracking** — zero analytics, zero cookies, zero external requests at runtime
- 🧙 **Client-side only** — all computation happens in the browser
- 👻 **Anonymous** — no accounts, no logins, no data collection
- 📦 **Static** — served as plain files, no server-side processing

## Development

```bash
npm install
npm run dev       # Local dev server
npm run build     # Production build
npm run preview   # Preview production build
```

## License

See [LICENSE](LICENSE).
