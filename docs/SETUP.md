# PaySilo Setup

Zero to a live confidential payroll on Sepolia. Follow in order; every step depends
on the one before it.

## Prerequisites

- Node.js >= 22 (Nox packages state >= 24 in their own repo; if compile or the plugin
  misbehaves on 22, `nvm install 24 && nvm use 24` and note it in feedback.md)
- Docker running (only needed for `npm test`, which boots the local Nox stack)
- A funded Sepolia burner wallet (ETH from any Sepolia faucet)
- A Sepolia RPC URL (Alchemy/Infura free tier is fine)

## 1. Install and compile

```bash
cd contracts
cp .env.example .env    # fill SEPOLIA_RPC_URL and DEPLOYER_PRIVATE_KEY now
npm install
npm run compile
```

Do not proceed past a failing compile. If the Solidity version pin fights the Nox
packages, the protocol contracts use `^0.8.35` and the confidential contracts
`^0.8.28`; the config pins 0.8.35 which satisfies both.

## 2. Local end-to-end test (optional but strongly recommended)

```bash
npm test
```

The Nox hardhat plugin spins up the full offchain stack (KMS, ingestor, runner,
handle gateway) in Docker and injects NoxCompute locally. If this passes, the
encrypt -> transfer -> decrypt -> viewer-grant loop is proven before any gas is spent.

## 3. Create the Safe (the demo centerpiece)

Go to https://app.safe.global, connect the burner wallet, create a **1/1 Safe on
Sepolia**. Record this screen for the video. Put the address in `.env` as both
`SAFE_ADDRESS` and `PAYROLL_ADMIN` (they must be the same address).

A 1/1 Safe keeps the demo single-signer while still being a genuine Safe contract
on-chain, which is what the judges verify on Etherscan.

## 4. Deploy the payroll token and PaySilo

```bash
npm run deploy:mock       # deploys MockUSDC, mints 1,000,000 tUSDC to deployer
# put the printed address in .env as UNDERLYING_TOKEN
npm run deploy:sepolia    # deploys PaySilo with payrollAdmin = your Safe
# put the printed address in .env as PAYSILO_ADDRESS
```

Then verify on Etherscan (command is printed by the deploy script). Verified source
is non-negotiable per our own submission rules.

## 5. Fund the Safe

Send tUSDC from the deployer to the Safe address (MetaMask send, or through the
Safe UI). The Safe is the treasury; PaySilo pulls from it.

## 6. Pre-flight

```bash
npm run check:sepolia
```

Fix anything it flags. Do not record the demo until this is all green.

## 7. Run payroll through the Safe

Edit the `PAYROLL` array in `scripts/runPayrollViaSafe.ts` with 2-3 real recipient
addresses you control (fresh burner wallets are perfect) and distinct amounts, then:

```bash
npm run payroll:safe
```

This executes ONE Safe transaction batching `approve` + `runPayroll`. Open the
printed Etherscan link: the visible facts are the Safe, the total, the recipients.
No individual amount anywhere. That Etherscan page is your proof screenshot.

## 8. Prove the privacy model, all three sides

```bash
# As recipient A (their key in DEPLOYER_PRIVATE_KEY): decrypts their own pay
npm run decrypt:sepolia

# As recipient B, targeting A's balance (TARGET_ACCOUNT=A): decryption DENIED
npm run decrypt:sepolia

# As A: grant the auditor
# (.env: AUDITOR_ADDRESS=<auditor>, DEPLOYER_PRIVATE_KEY=<A's key>)
npm run grant:sepolia

# As the auditor, targeting A (TARGET_ACCOUNT=A): decryption now SUCCEEDS
npm run decrypt:sepolia
```

Those four runs, in that order, are the core of the demo video.

## Troubleshooting notes

Log every real issue you hit into `docs/feedback.md` as you hit it. It's a scored
deliverable and honest friction reports are what sponsors actually want from it.
