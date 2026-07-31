# PaySilo

Confidential payroll on Ethereum, built on iExec Nox — WTF!! Hackathon Summer Edition.

PaySilo runs a payroll batch in a single transaction. Individual amounts are encrypted
client-side using iExec Nox's KMS before the transaction hits the chain. What is
public: who paid, the aggregate total, the recipient list. What is hidden: what any
individual earned. Recipients decrypt their own pay with MetaMask, and can grant an
auditor view access with one additional transaction.

## Live deployment (Sepolia)

| Contract | Address |
|----------|---------|
| MockUSDC | [`0x1b3c959070292f9a0227780615ff119da04b6f51`](https://sepolia.etherscan.io/address/0x1b3c959070292f9a0227780615ff119da04b6f51) |
| PaySilo  | [`0x7e63e5651c490d805168856b2cc172434116f028`](https://sepolia.etherscan.io/address/0x7e63e5651c490d805168856b2cc172434116f028) |
| NoxCompute (iExec, pre-deployed) | `0x24Ef36Ec5b626D7DCD09a98F3083c2758F0F77bF` |

## Repo layout

```
contracts/
  contracts/PaySilo.sol          # ERC-7984 wrapper + confidential batch fan-out + auditor ACL
  contracts/MockUSDC.sol         # mintable Sepolia test stablecoin
  scripts/deploy.ts              # deploy PaySilo
  scripts/deployMockUSDC.ts      # deploy MockUSDC
  scripts/runPayroll.ts          # encrypt amounts client-side + submit batch
  scripts/demoFlow.ts            # full e2e demo: decrypt → deny → grant → audit
  scripts/decryptBalance.ts      # decrypt a single balance (as recipient or auditor)
  scripts/grantAuditorAccess.ts  # recipient grants auditor view access
  scripts/checkSetup.ts          # pre-flight invariant checks
  test/PaySilo.test.ts           # local e2e against the Docker Nox stack
frontend/
  app/page.tsx                   # landing
  app/admin/page.tsx             # payroll admin UI
  app/recipient/page.tsx         # recipient decrypt UI
  app/audit/page.tsx             # auditor decrypt UI
docs/
  SETUP.md                       # zero-to-live-Sepolia walkthrough
  ARCHITECTURE.md                # handle flow, ACL model, privacy guarantees
  feedback.md                    # iExec Nox tooling feedback (hackathon deliverable)

```

## Quick start

### Contracts

```bash
cd contracts
cp .env.example .env       # fill in SEPOLIA_RPC_URL and DEPLOYER_PRIVATE_KEY
npm install
npm run compile
npm test                   # requires Docker — boots the local Nox stack
npm run deploy:mock        # deploy MockUSDC, set UNDERLYING_TOKEN in .env
npm run deploy:sepolia     # deploy PaySilo, set PAYSILO_ADDRESS in .env
npm run check:sepolia      # confirm all invariants pass
npm run payroll:sepolia    # encrypt + submit a payroll batch
npm run demo:sepolia       # decrypt → deny → grant → auditor decrypt
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # fill in contract addresses
npm run dev                         # http://localhost:3000
npm run build                       # production build
```

## How it works

1. **Encrypt** — the payroll admin calls `encryptInput` for each recipient amount.
   The iExec KMS returns an encrypted handle + proof. Plaintext never leaves the client.

2. **Submit** — `runPayroll` is called with the handles and proofs. `NoxCompute.validateInputProof`
   verifies each proof on-chain, then `Nox.fromExternal` stores the encrypted amounts.
   The tx calldata contains handles (opaque bytes), not plaintext amounts.

3. **Decrypt** — a recipient calls `handleClient.decrypt(handle)`. The KMS checks the
   on-chain ACL: if the caller owns the handle, it returns the plaintext. No smart
   contract call needed for decryption.

4. **Audit** — a recipient calls `grantAuditorAccess(auditorAddress)`, which calls
   `Nox.addViewer`. The auditor can then decrypt that recipient's balance handle.

## Stack

- Solidity 0.8.35
- Hardhat 3 + viem
- iExec Nox (`@iexec-nox/nox-confidential-contracts` 0.2.2, `@iexec-nox/handle` 0.1.0-beta.13)
- Next.js 15 + Tailwind CSS
- Ethereum Sepolia

## License

MIT
