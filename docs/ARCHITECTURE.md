# PaySilo Architecture

## One-paragraph summary

PaySilo is a confidential payroll layer for Safe treasuries. The Safe executes one
batched transaction (approve + runPayroll). PaySilo wraps the aggregate into an
ERC-7984 confidential token balance and internally transfers each contributor's
share as an encrypted handle. Public on-chain facts: which Safe paid, the total,
and the recipient list. Hidden: every individual amount. Recipients decrypt their
own balance with any standard wallet; they can selectively grant an auditor
decryption rights via the Nox ACL without revealing anything to anyone else.

## Components

```
+--------------------+        one Safe tx (MultiSend)         +---------------------+
|   Safe (treasury)  | -------------------------------------> |      PaySilo        |
|  holds tUSDC       |   1. approve(PaySilo, total)           |  ERC20->ERC7984     |
|  1/1 for the demo  |   2. runPayroll(recips, handles,       |  wrapper + batching |
+--------------------+      proofs, total)                    +----------+----------+
                                                                         |
                                              _transfer(this, recipient, euint256)
                                              (amounts are encrypted handles)
                                                                         v
                                                            +-------------------------+
                                                            | Recipients' confidential|
                                                            | balances (hidden)       |
                                                            +-------------------------+

Off-chain (operated by iExec, attested TEEs):
  NoxCompute (Sepolia: 0x24Ef36Ec5b626D7DCD09a98F3083c2758F0F77bF)
    -> Ingestor -> Runner (Intel TDX) -> Handle Gateway -> KMS
```

## The data flow, step by step

1. **Client-side encryption.** The payroll admin's machine encrypts each amount with
   the Nox JS SDK (`encryptInput(amount, 'uint256', paySiloAddress)`). Each yields a
   32-byte `handle` plus a `handleProof`. Plaintext amounts never leave the admin's
   machine except toward the Nox gateway's encryption path.

2. **One Safe transaction.** Safe Protocol Kit batches `approve` and `runPayroll`
   via MultiSend. `msg.sender` inside `runPayroll` is the Safe, which must equal
   `payrollAdmin` (immutable, set at deploy).

3. **Aggregate wrap.** `runPayroll` calls the inherited `wrap(address(this), total)`,
   pulling `total` tUSDC from the Safe and minting a confidential balance to PaySilo
   itself. The total is the only plaintext amount on-chain, by design: without a
   public deposit figure the wrapper couldn't reconcile the underlying reserves.

4. **Confidential fan-out.** For each recipient, `Nox.fromExternal(handle, proof)`
   validates the encrypted input, then `_transfer(address(this), recipient, amount)`
   moves the hidden amount. The `ConfidentialTransfer` event indexes an encrypted
   handle, not a number.

5. **Off-chain computation.** The balance arithmetic (`sub` from PaySilo's balance,
   `add` to the recipient's) executes inside Intel TDX TEEs run by the Nox off-chain
   stack, coordinated through events NoxCompute emits. Result handles come back with
   transient ACL access which the token contracts persist.

6. **Decryption.** A recipient asks the Handle Gateway to decrypt their balance
   handle. The gateway checks the on-chain ACL (`isAllowed` / `isViewer`); the KMS
   performs decryption delegation via ECDH so the requester derives the AES key
   locally. Anyone without ACL rights gets nothing.

7. **Selective disclosure.** `grantAuditorAccess(auditor)` calls
   `Nox.addViewer(balanceHandle, auditor)`. Only the caller's own current balance
   handle is disclosed, only to that address, revocable in the sense that future
   balance handles (after any new payout) are fresh handles the auditor has no
   rights over.

## What each party learns

| Observer                  | Learns                                             |
|---------------------------|----------------------------------------------------|
| Anyone on Etherscan       | Safe address, total per batch, recipient list, timing |
| A recipient               | Their own amounts and balance, nothing about peers |
| The payroll admin (Safe)  | Everything (it authored the amounts)               |
| A granted auditor         | The specific balance handle(s) granted, nothing else |
| iExec infrastructure      | Ciphertexts; plaintext exists only inside attested TDX enclaves |

## Honest limitations (stated, not hidden)

- **The batch total is public.** Deliberate: reserve accounting needs it. With N=1
  recipients in a batch, the total IS that person's pay. Mitigation: batch payouts;
  the UI should warn on single-recipient batches.
- **Recipient list is public.** PaySilo hides amounts, not participation. Hiding
  recipients too would need stealth-address-style techniques, out of scope.
- **Total-vs-handles consistency is trusted to the admin.** If the admin submits
  encrypted amounts that do not sum to `totalAmount`, later payouts can fail to
  reconcile. The admin already knows all amounts, so this is a correctness footgun
  for the admin, not a privacy leak. A future version could enforce the sum in-TEE
  with `Nox.add` chains plus an encrypted equality check against the total.
- **TEE trust.** Confidentiality rests on Intel TDX attestation and iExec's
  operated stack, a different trust model than FHE. This is inherent to Nox.
- **Testnet.** Sepolia only, per hackathon rules. No real funds.

## Why the Safe is never modified

The whole thesis of the challenge is adding privacy to transparent infrastructure
without touching it. The Safe here does exactly two vanilla things it always could:
approve an ERC-20 spender, and call a contract function. PaySilo composes on top.
Any Safe, existing or new, on any supported chain, works with zero migration.
