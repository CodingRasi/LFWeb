# Lingofisy website

Static frontend for [lingofisy.com](https://lingofisy.com), published to GitHub Pages.

```
index.html, styles.css, script.js   the site
affiliate/                          Creator Program page and its application form
legal/                              imprint, terms, privacy
404.html, robots.txt, sitemap.xml, llms.txt
```

There is no backend. GitHub Pages can only serve files, so the two things that need a
server — the waitlist and the Creator Program application — are both Tally forms. The
site holds no secret and stores nothing itself.

## Local preview

```bash
python3 -m http.server 4173
```

Open http://localhost:4173.

## Forms

Both forms live in Tally and are loaded only when a visitor asks for them, so a page
view never contacts tally.so on its own.

| Form | Where | Tally |
| - | - | - |
| Waitlist | hero button on `/`, plus the CTAs in the closing strip | [`M1RAlE`](https://tally.so/r/M1RAlE) |
| Creator Program | `/affiliate/`, behind a "load the form" button | embedded iframe |

The waitlist form asks for an email address and nothing else, plus one optional,
unticked box for occasional updates. It accepts one submission per address and carries
Tally's reCAPTCHA bot check.

`script.js` shares one `loadTally()` loader between the two: it injects
`https://tally.so/widgets/embed.js` at most once, on demand. The waitlist triggers are
real links to the hosted form, so they still work if the widget is blocked or fails.

To point the waitlist at a different form, change `WAITLIST_FORM` in `script.js` and
the three `href`s in `index.html` that carry `data-waitlist-open`.

## Before launch

- Replace the app-store placeholder buttons in `index.html` when the listings are live.
- Update `legal/imprint.html` and `legal/privacy.html` when the UG is registered.
- Review the legal pages with a qualified adviser. Section 20 of the Privacy Policy
  describes the waitlist as it actually works, including that joining does **not**
  send a verification link.
- Set up the mail tool that sends the launch email. Tally holds the addresses and
  exporting them is a manual step. The tool must carry an unsubscribe link, and it
  **must run its own double opt-in over the addresses that ticked "occasional
  updates"** before any update goes out: the Privacy Policy and the form both promise
  that confirmation, and Tally cannot do it on the free plan (email verification is a
  Tally Business feature). Buttondown and MailerLite do double opt-in on free tiers.
  The single launch email itself does not need this — it is the step people asked for.
