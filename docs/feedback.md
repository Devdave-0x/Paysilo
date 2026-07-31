# Nox / iExec tooling feedback

Running notes from building PaySilo, updated as we go rather than written after the fact.

## What worked well

- `Nox.fromExternal` + `_transfer` API mirrors familiar FHE-style primitives closely enough
  that the PaySilo contract logic required essentially no Nox-specific plumbing beyond
  importing `Nox`, `euint256`, and `externalEuint256`. The primitives compose naturally with
  existing ERC-20 patterns.

- `ERC20ToERC7984Wrapper` handled the wrap/unwrap lifecycle, confidential total supply, and
  `confidentialBalanceOf` out of the box. No bespoke storage layout needed.

- `Nox.addViewer` for selective disclosure is a one-liner that maps cleanly to the auditor
  grant use case. The ACL is enforced at the KMS/gateway layer transparently.

- The `nox-hardhat-plugin`'s Docker Compose setup (`--wait` flag) blocks until all services
  are healthy before returning, which made the test environment reliable with no manual
  synchronization needed in test code.

- `@safe-global/protocol-kit` v8's `createTransaction` accepts a `transactions` array that
  automatically uses MultiSend when length > 1, batching approve + runPayroll into one Safe
  transaction with a single signature — exactly the design goal.

## Friction / rough edges

### 1. Local chain 31337 not in `@iexec-nox/handle` NETWORK_CONFIGS

**Symptom:** `createViemHandleClient(walletClient)` throws
`"Chain 31337 is not supported. Supported chains: 421614, 11155111."` when called from tests.

**Root cause:** `resolveNetworkConfig` in `@iexec-nox/handle` only has entries for Arbitrum
Sepolia and Ethereum Sepolia. Chain 31337 is not listed. The SDK supports overrides via a
second `config` argument but the test template doesn't document this, and the nox plugin's
own `nox.connect()` handles it internally — callers using `createViemHandleClient` directly
must supply all three override fields or get a hard throw with no actionable suggestion.

**Fix applied:** Import `handleGatewayUrl` and `NOX_COMPUTE_ADDRESS` from
`@iexec-nox/nox-hardhat-plugin` and pass them as a config override to every
`createViemHandleClient` call. The `subgraphUrl` is required for schema validation even when
never queried; we use `"https://example.com/subgraphs/id/none"` (same pattern the plugin's
own `nox.ts` uses internally).

**Suggestion:** Export a `localHandleConfig()` helper from `@iexec-nox/nox-hardhat-plugin`,
or document the pattern clearly in the getting-started guide.

### 2. `nox.connect()` vs `hre.network.connect()` — two separate EDR state machines

**Symptom:** Calling `hre.network.connect()` in a test connects to the in-process `default`
EDR simulation, NOT to the external JSON-RPC server at port 8545 where the plugin deploys
NoxCompute. The handle client's `gateway()` call on NoxCompute returns `0x` (empty data),
producing a confusing `ContractFunctionZeroDataError` that looks like an ABI mismatch.

**Root cause:** The plugin runs two networks: `noxHost` (external EDR server at 8545 where
NoxCompute is deployed) and `noxLocal` (HTTP connection to it). The user's `default` network
is a completely separate in-process EDR that the plugin never touches.

**Fix applied:** Use `nox.connect()` (which internally calls `network.create("noxLocal")`)
instead of `hre.network.connect()` in tests, so all transactions go to the chain where
NoxCompute lives.

**Suggestion:** Add a prominent note in the plugin README or test template: tests MUST use
`nox.connect()` or `hre.network.create("noxLocal")`. The current error
(`ContractFunctionZeroDataError: gateway() returned 0x`) gives no indication the problem is a
network mismatch, not an ABI error.

### 3. `ViemBlockchainService.getAddress()` always returns `eth_accounts[0]`

**Symptom:** `createViemHandleClient(alice)` where `alice` is a JSON-RPC wallet client from
Hardhat's `viem.getWalletClients()` produces a handle client whose identity is the first
Hardhat account (admin), not alice. The ACL check in `decrypt()` then fails with
"user is not authorized" even though alice IS the legitimate recipient.

**Root cause:** `WalletClientAdapter.getAddress()` calls `walletClient.getAddresses()[0]`.
For JSON-RPC wallet clients, `getAddresses()` calls `eth_accounts` which returns ALL node
accounts — so `[0]` is always the first account regardless of which wallet client was passed.
The `walletClient.account` property (which IS the correct account) is only used in
`signTypedData`, not in `getAddress()`.

**Fix applied:** Create per-role wallet clients using `privateKeyToAccount(HARDHAT_KEYS[role])`
and `createWalletClient({ account, transport: http(RPC_URL) })`. Local-account clients return
only their own address from `getAddresses()`, so `[0]` is always correct.

**Suggestion:** `WalletClientAdapter.getAddress()` should prefer
`this.walletClient.account?.address` over `getAddresses()[0]` when `account` is set. This
would make JSON-RPC wallet clients from `getWalletClients()` work correctly without requiring
callers to understand the difference between local and JSON-RPC accounts.

### 4. IPv6 DNS resolution breaks `solc` downloads on some Linux setups

**Symptom:** Node's undici resolver picks the IPv6 address for `solc-bin.ethereum.org` and
fails with `AggregateError` when IPv6 routing is broken, even though the domain is reachable
over IPv4.

**Fix applied:** `NODE_OPTIONS="--dns-result-order=ipv4first"` added to `~/.zshrc`. Forces
undici to prefer IPv4 — matching curl's default behaviour on the same host.

### 5. `nox-hardhat-starter` repository not found

**Symptom:** The hackathon page links to a `nox-hardhat-starter` under the iExec-Nox GitHub
org that does not resolve (404). Setting up a project required manually reading each
package's README and assembling `hardhat.config.ts` from scratch.

**Suggestion:** Publish the starter repo or update the hackathon page with a working template.

### 6. `@iexec-nox/handle` requires `ethers` when bundled for the browser

**Symptom:** Browser builds (Next.js/webpack) fail because `createHandleClient.js` statically
imports `EthersBlockchainService`, pulling `ethers` into the bundle even when only the viem
path is used.

**Fix applied:** Install `ethers@6` as a dev dependency and add the Coinbase/Base/RN aliases
to `next.config.mjs`.

**Suggestion:** Use dynamic `import()` per adapter, or publish separate entry points
(`@iexec-nox/handle/viem`, `@iexec-nox/handle/ethers`) so projects pay only for what they use.

### 7. Safe multisig and Nox `validateInputProof` are mutually exclusive as designed

**Symptom:** A Safe transaction that batches `MockUSDC.approve` + `PaySilo.runPayroll` fails with
`InvalidProof(bytes,string)` ("Owner mismatch") during gas estimation, making the entire batch
unexecutable.

**Root cause:** `NoxCompute.validateInputProof` enforces:
```
require(ownerInProof == owner, InvalidProof(proof, "Owner mismatch"));
```
where `owner` is the second argument passed from `Nox.fromExternal`:
```
_noxComputeContract().validateInputProof(handle, msg.sender, handleProof, TEEType.Uint256);
```
Here `msg.sender` in Nox.sol (a library) inherits from the calling contract's context — so it
equals `msg.sender` *when `runPayroll` is entered*, which is the Safe contract when the Safe
executes the batch.

Meanwhile, `handleClient.encryptInput(amount, "uint256", paySiloAddress)` embeds
`blockchainService.getAddress()` (= the EOA running the JS script) as `ownerInProof` in the KMS
proof. The EOA and the Safe have different addresses → mismatch → `InvalidProof`.

There is no way around this without either:
- Running `encryptInput` from a wallet whose `address` equals the Safe, which requires the Safe
  to have a private key (impossible for a contract wallet).
- Modifying Nox.sol to accept an explicit `owner` argument that overrides `msg.sender` (not
  currently supported).
- Making the EOA payroll admin call `runPayroll` directly — `msg.sender = EOA = ownerInProof` ✓

**Fix applied:** Redeployed PaySilo with `payrollAdmin = deployer EOA`. The Safe is noted in
`SAFE_ADDRESS` but is no longer the call origin for `runPayroll`. The EOA batches approve +
runPayroll in a single script call.

**Impact:** Any Nox application that wants Safe-governed execution of functions containing
`Nox.fromExternal` hits this wall immediately. The proof model ties the "owner" identity to the
JS-side wallet used for encryption AND to the Solidity-side `msg.sender` at validation time.
Contract wallets (Safe, ERC-4337 accounts) break this assumption because the contract is the
`msg.sender` but cannot run JS or hold a private key.

**Suggestion:** The Nox SDK should document this limitation prominently, and consider a design
where the `owner` in the proof is a declared *data owner* (e.g., the entity being paid) rather
than the *transaction submitter*. Alternatively, exposing a `fromExternalFor(handle, proof,
owner)` variant in Nox.sol would let the caller assert who owns the data, with the KMS
signature still enforcing correctness.

## Suggestions (summary)

1. Export `localHandleConfig()` from `@iexec-nox/nox-hardhat-plugin` for use in tests.
2. Fix `WalletClientAdapter.getAddress()` to prefer `walletClient.account?.address`.
3. Document that tests must use `nox.connect()`, not `hre.network.connect()`.
4. Publish `nox-hardhat-starter` or update the hackathon page.
5. Split `@iexec-nox/handle` into viem/ethers entry points to reduce browser bundle size.

## Versions used
- @iexec-nox/handle: 0.1.0-beta.13
- @iexec-nox/nox-confidential-contracts: 0.2.2
- @iexec-nox/nox-protocol-contracts: 0.2.4
- @iexec-nox/nox-hardhat-plugin: 0.1.0
- @safe-global/protocol-kit: 8.0.4
- Solidity: 0.8.35
- Network: Ethereum Sepolia (chain ID 11155111)
