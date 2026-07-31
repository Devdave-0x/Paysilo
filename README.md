# PaySilo

Confidential payroll for Safe treasuries, built on iExec Nox for the WTF!! Hackathon
Summer Edition.

A Safe executes ONE batched transaction. PaySilo wraps the aggregate payroll total
into an ERC-7984 confidential token and fans it out to each contributor as an
encrypted amount. Public: which Safe paid, the total, the recipient list. Hidden:
what any individual earned. Recipients decrypt their own pay with plain MetaMask,
and can grant an auditor view access to their own balance with one transaction.

The Safe is never modified. It does two things any Safe already can: approve an
ERC-20 spender and call a function. Privacy composes on top.

## Repo map

```
contracts/
  contracts/PaySilo.sol        # wrapper + confidential batch fan-out + auditor ACL
  contracts/MockUSDC.sol       # mintable Sepolia test payroll token
  scripts/deployMockUSDC.ts    # step 1: test token
  scripts/deploy.ts            # step 2: PaySilo (payrollAdmin = your Safe)
  scripts/checkSetup.ts        # pre-flight: all invariants green before any demo
  scripts/runPayrollViaSafe.ts # THE flow: encrypt client-side, one Safe tx (approve+runPayroll)
  scripts/runPayroll.ts        # same flow from a plain EOA admin (early testing only)
  scripts/decryptBalance.ts    # recipient / third-party / auditor decryption proof
  scripts/grantAuditorAccess.ts# selective disclosure grant
  test/PaySilo.test.ts         # local e2e vs the Docker Nox stack (encrypt->pay->decrypt->grant)
docs/
  SETUP.md                     # zero-to-live-Sepolia, in order
  ARCHITECTURE.md              # handle flow, ACL model, who-learns-what, honest limits
  feedback.md                  # required deliverable, updated as we build
demo/
  script.md                    # 4-min video beat sheet with pre-record gate
  submission.md                # checklist + X post draft
```

## Quick start

See `docs/SETUP.md` for the full ordered walkthrough. Short version:

```bash
cd contracts && cp .env.example .env && npm install && npm run compile
npm test                    # needs Docker; boots the real local Nox stack
npm run deploy:mock         # then set UNDERLYING_TOKEN
npm run deploy:sepolia      # then set PAYSILO_ADDRESS; verify on Etherscan
npm run check:sepolia       # everything green before proceeding
npm run payroll:safe        # one Safe tx, whole team paid, amounts hidden
```

## Honesty ledger (what is verified vs not)

- Contract and scripts are written against the ACTUAL published package source
  (`@iexec-nox/nox-confidential-contracts` 0.2.2, `nox-protocol-contracts` 0.2.4,
  `@iexec-nox/handle` 0.1.0-beta.13, `@safe-global/protocol-kit` 8.0.4): interfaces
  extracted from the npm tarballs, Safe API confirmed from its .d.ts files.
- Compilation and deployment have NOT yet been executed (built in a sandbox without
  access to the solc binary host). First local `npm run compile` is step one.
- Nothing in this repo is claimed live until it is live. See docs/feedback.md and
  the pre-record gate in demo/script.md.

## Stack

Solidity 0.8.35 · Hardhat 3 + viem · iExec Nox (ERC-7984, Intel TDX TEEs) ·
Safe Protocol Kit v8 · Ethereum Sepolia (NoxCompute: 0x24Ef36Ec5b626D7DCD09a98F3083c2758F0F77bF)

## License

MIT
