# Demo video script (4:00 hard cap)

Target 3:30 so editing slack exists. One take per section, screen capture + voiceover.
Everything shown must be live on Sepolia. Nothing simulated, nothing pre-rendered.

## 0:00 - 0:25 | The problem
- Screen: Etherscan token-transfer page of any real DAO payroll wallet (or the mock
  equivalent), amounts fully visible.
- VO: "Every team that pays contributors on-chain publishes its entire payroll.
  Anyone can see exactly what everyone earns. That's why payroll stays on Deel and
  bank rails. PaySilo fixes this without changing the treasury teams already use:
  a Gnosis Safe."

## 0:25 - 0:50 | What PaySilo is
- Screen: architecture diagram from docs/ARCHITECTURE.md.
- VO: "One Safe transaction deposits the payroll total. PaySilo wraps it into an
  iExec Nox confidential token and fans it out. On-chain: the total and who got
  paid. Hidden: what each person earned. Built on ERC-7984, computed inside Intel
  TDX enclaves, works with plain MetaMask."

## 0:50 - 1:40 | Live: the Safe runs payroll
- Screen: the real Safe on app.safe.global, Sepolia, showing the tUSDC balance.
- Screen: terminal, `npm run payroll:safe` with 3 recipients, distinct amounts.
- Screen: the Etherscan tx. Point at what IS visible: total, recipients.
- Point at what is NOT visible: scroll the logs, show ConfidentialTransfer events
  carrying handles, not numbers.
- VO closes: "This is a genuine, unmodified Safe. One transaction. Total public,
  splits gone."

## 1:40 - 2:20 | Live: recipient decrypts their own pay
- Screen: terminal as recipient A, `npm run decrypt:sepolia`, plaintext appears.
- Screen: same command as recipient B targeting A's balance. DENIED.
- VO: "Alice reads her own pay with her normal wallet. Bob tries to read Alice's:
  the Nox access control list says no, and the KMS never releases the key."

## 2:20 - 3:00 | Live: selective disclosure
- Screen: terminal as A, `npm run grant:sepolia` (auditor grant tx on Etherscan).
- Screen: terminal as auditor, decrypt A's balance. SUCCEEDS.
- VO: "Alice grants her accountant view access. One transaction, one address, only
  her balance. Privacy with compliance, not privacy against it."

## 3:00 - 3:30 | Wrap
- Screen: repo, verified contract on Etherscan, docs/feedback.md open.
- VO: "PaySilo. Confidential payroll for any Safe, zero protocol changes, live on
  Sepolia, open source, built on iExec Nox. Contract address and repo below."

## Pre-record gate: the six rules
- [ ] Every claim in the VO is true in the code
- [ ] Nothing shown is localhost-only while claimed live
- [ ] No feature appears that isn't working end-to-end
- [ ] No unverifiable claim
- [ ] Cross-chain / infra sourcing acknowledged honestly (Nox off-chain stack is iExec-operated)
- [ ] Demo runs from the LIVE deployment, checkSetup all green immediately before recording
