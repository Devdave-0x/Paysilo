# PaySilo frontend

Next.js 14 App Router. Radix primitives (Dialog, Toast) with hand-rolled shadcn-style
components, Framer Motion for orchestration, wagmi/viem for chain access,
@iexec-nox/handle for in-browser encryption/decryption, Safe Protocol Kit for the
one-transaction payroll execution.

Ionic was deliberately not used: it's a hybrid mobile framework and would fight
Next.js for routing and styling. Radix + Tailwind covers the same accessibility
ground natively.

## Design system (v3, Relay-referenced)

v1 used two co-equal accents (teal + violet) on a navy-panel background with
scattered ambient motion (scanline sweep, pulsing dots everywhere). It read as
generic-crypto-dashboard rather than premium. v2 changes:

- Palette: void #050607 (near-black, not navy), panel #0B0D10, line #22262C,
  ink #F2F4F6. ONE dominant accent, seal #2BE4C6, carries all interactive and
  decryption meaning. Sigil #8F7BFF is demoted to a rare tag for Safe-authority
  moments only, not a second competing accent.
- Type: Space Grotesk / JetBrains Mono, SOLID color only. v2's gradient-text
  headline was rejected and removed; the only remaining gradient in the app is
  inside the Spotlight component itself (its radial glow IS the component).
- Theme toggle: light/dark via next-themes (class strategy). All colors are
  RGB-triplet CSS variables, so every component flips automatically. Dark is
  the default. Seal is #2BE4C6 in dark and #0D947D in light for contrast.
- Structure follows relay-ashen-zeta.vercel.app: anchor nav (How it works /
  Live proof / FAQ) + theme toggle + "Open the app" CTA on the landing, app
  links + Connect elsewhere; hero with stat row (1 Safe tx / 0 amounts
  revealed / 100% verifiable); numbered 01-03 flow; a five-hop pipeline
  section (You → Browser → Safe → Nox TEE → Recipient); native-details FAQ;
  final CTA; columned footer.
- Hero centerpiece: the exact SplineScene + Spotlight + Card pattern from the
  pasted 21st.dev component, with the robot demo scene the user selected.
  The scene URL is the component's public demo asset; swap the URL for a
  themed .splinecode scene later without touching layout. cipher-orb.tsx is
  kept in the repo as the lightweight fallback if the Spline asset ever
  disappears.
- Components: `components/ui/card.tsx` and `components/ui/spotlight.tsx` are
  the actual shadcn Card and ibelick/21st.dev Spotlight components, adapted to
  our tokens, not reimplemented from scratch. `lib/utils.ts` has the standard
  shadcn `cn()` helper. Card is now the one elevation unit used everywhere
  (hero, flow steps, disclosure table, live batches) instead of ad-hoc
  bordered divs, per the reference component's actual structure.
- Signature: `components/cipher-orb.tsx`, a rotating Fibonacci-sphere particle
  field of hex glyphs on canvas. This occupies the same slot the reference's
  `SplineScene` would. We do NOT have a real Spline scene (`.splinecode` files
  are made in Spline's visual editor, not generated from a prompt), so this is
  an honest substitute in the same visual register: 3D-feeling, ambient,
  cursor-reactive via the Spotlight wrapper. Swap in a real `<SplineScene>`
  later without changing the surrounding layout if you make or source one.
- Motion: v1's constant scanline + pulsing-dot loops are gone, that was the
  "gimmicky" motion. Now one orchestrated hero (orb + gradient headline +
  staggered copy), scroll reveals, decrypt sweeps on actual state changes only,
  and Spotlight hover on cards (motion in response to the user, not ambient
  noise). prefers-reduced-motion collapses all of it to static.
- CipherText (the decrypt-sweep component) is unchanged — it wasn't the part
  that was rejected and still carries the core "your balance stays sealed
  until you decrypt it" idea through the recipient and audit pages.

## Pages

- `/` landing: thesis hero + cipher ledger, 3-step flow (a real sequence), the
  who-learns-what disclosure table, live batches read from the contract.
- `/admin` batch builder: encrypts amounts in the browser, executes approve +
  runPayroll as ONE Safe transaction. Warns on single-recipient batches.
- `/recipient` decrypt own balance (cipher sweep on success), payout history from
  events, auditor grant dialog.
- `/audit` attempt decryption of any recipient; shows granted or denied honestly.

## Run

```bash
cp .env.example .env.local   # fill after contracts are deployed
npm install
npm run dev
```

## Status honesty

Written against the verified package APIs but NOT yet run against a live
deployment (built in a sandbox). Expected first-run friction to check:
- @iexec-nox/handle in the browser (it's ethers/viem dual; the viem path is what
  we use, confirm bundling under Next 14).
- Safe Protocol Kit in the browser with window.ethereum (documented EIP-1193
  support; confirm on Sepolia).
- The ABI in lib/contracts.ts is hand-written against PaySilo.sol; regenerate from
  the compiled artifact after any contract change.
Log anything you hit into docs/feedback.md.
