export const PAYSILO_ADDRESS = (process.env.NEXT_PUBLIC_PAYSILO_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;
export const UNDERLYING_TOKEN = (process.env.NEXT_PUBLIC_UNDERLYING_TOKEN ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;
export const DEFAULT_SAFE = (process.env.NEXT_PUBLIC_SAFE_ADDRESS ?? "") as string;
export const SEPOLIA_RPC =
  process.env.NEXT_PUBLIC_SEPOLIA_RPC ?? "https://rpc.sepolia.org";

export const configured =
  PAYSILO_ADDRESS !== "0x0000000000000000000000000000000000000000";

/** Hand-written against contracts/contracts/PaySilo.sol. Regenerate from the
 *  compiled artifact once deployed if the contract changes. */
export const PAYSILO_ABI = [
  {
    type: "function",
    name: "runPayroll",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipients", type: "address[]" },
      { name: "encryptedAmounts", type: "bytes32[]" },
      { name: "inputProofs", type: "bytes[]" },
      { name: "totalAmount", type: "uint256" },
    ],
    outputs: [{ name: "batchId", type: "uint256" }],
  },
  {
    type: "function",
    name: "grantAuditorAccess",
    stateMutability: "nonpayable",
    inputs: [{ name: "auditor", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "confidentialBalanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    type: "function",
    name: "payrollAdmin",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "underlying",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "batches",
    stateMutability: "view",
    inputs: [{ name: "batchId", type: "uint256" }],
    outputs: [
      { name: "id", type: "uint256" },
      { name: "timestamp", type: "uint256" },
      { name: "recipientCount", type: "uint256" },
      { name: "totalDeposited", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "batchRecipients",
    stateMutability: "view",
    inputs: [{ name: "batchId", type: "uint256" }],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    type: "function",
    name: "nextBatchId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "BatchCreated",
    inputs: [
      { name: "batchId", type: "uint256", indexed: true },
      { name: "recipientCount", type: "uint256", indexed: false },
      { name: "totalDeposited", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ConfidentialPayout",
    inputs: [
      { name: "batchId", type: "uint256", indexed: true },
      { name: "recipient", type: "address", indexed: true },
    ],
  },
] as const;

export const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;
