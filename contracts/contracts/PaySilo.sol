// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {ERC20ToERC7984Wrapper} from "@iexec-nox/nox-confidential-contracts/contracts/token/extensions/ERC20ToERC7984Wrapper.sol";
import {Nox, euint256, externalEuint256} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";

/**
 * @title PaySilo
 * @notice Confidential payroll layer on top of a Safe treasury. The Safe deposits the
 *         aggregate payroll total in a single visible transaction; PaySilo wraps it into
 *         a Nox confidential balance and fans out per-recipient amounts as encrypted
 *         handles, so on-chain observers see the total and the recipient list, but never
 *         any individual amount.
 *
 * Built for the iExec WTF!! Hackathon Summer Edition (Nox track).
 *
 * Underlying protocol (the Safe) is never modified. This contract only ever calls the
 * Safe as a normal ERC-20 spender via a pre-approved allowance.
 */
contract PaySilo is ERC20ToERC7984Wrapper {
    /// @notice The Safe (or any admin address) authorized to run payroll batches.
    address public immutable payrollAdmin;

    struct Batch {
        uint256 id;
        uint256 timestamp;
        uint256 recipientCount;
        uint256 totalDeposited; // Public aggregate only. Individual splits stay hidden.
    }

    uint256 public nextBatchId;
    mapping(uint256 batchId => Batch) public batches;
    mapping(uint256 batchId => address[] recipients) private _batchRecipients;

    event BatchCreated(uint256 indexed batchId, uint256 recipientCount, uint256 totalDeposited);
    event ConfidentialPayout(uint256 indexed batchId, address indexed recipient);
    event AuditorGranted(address indexed recipient, address indexed auditor);

    error NotPayrollAdmin();
    error ArrayLengthMismatch();
    error EmptyBatch();

    modifier onlyPayrollAdmin() {
        if (msg.sender != payrollAdmin) revert NotPayrollAdmin();
        _;
    }

    constructor(
        string memory name_,
        string memory symbol_,
        string memory contractURI_,
        IERC20 underlying_,
        address payrollAdmin_
    ) ERC20ToERC7984Wrapper(name_, symbol_, contractURI_, underlying_) {
        payrollAdmin = payrollAdmin_;
    }

    /**
     * @notice Runs one payroll batch: pulls `totalAmount` of the underlying ERC-20 from
     *         the Safe (must be pre-approved), wraps it into a confidential balance held
     *         by this contract, then fans it out to each recipient as a hidden amount.
     *
     * The only public facts after this call: the total deposited, and which addresses
     * were paid. No observer, including this contract's own event log, learns how much
     * any individual recipient received.
     *
     * @param recipients        Addresses to pay in this batch.
     * @param encryptedAmounts  Per-recipient encrypted amount handles (from the Nox JS SDK
     *                          `encryptInput` call, one per recipient).
     * @param inputProofs       Matching input proofs for each encrypted amount.
     * @param totalAmount       Plaintext sum of all amounts in this batch. This is the only
     *                          number that becomes public, and it must equal the sum of the
     *                          encrypted amounts or downstream recipient balances will not
     *                          reconcile against the contract's confidential total supply.
     */
    function runPayroll(
        address[] calldata recipients,
        externalEuint256[] calldata encryptedAmounts,
        bytes[] calldata inputProofs,
        uint256 totalAmount
    ) external onlyPayrollAdmin returns (uint256 batchId) {
        uint256 len = recipients.length;
        if (len == 0) revert EmptyBatch();
        if (len != encryptedAmounts.length || len != inputProofs.length) {
            revert ArrayLengthMismatch();
        }

        // Single aggregate deposit: pulls totalAmount from the Safe and mints it as a
        // confidential balance held by this contract. This is the only plaintext amount
        // that ever touches the chain.
        wrap(address(this), totalAmount);

        batchId = nextBatchId++;
        Batch storage batch = batches[batchId];
        batch.id = batchId;
        batch.timestamp = block.timestamp;
        batch.recipientCount = len;
        batch.totalDeposited = totalAmount;

        for (uint256 i = 0; i < len; i++) {
            euint256 amount = Nox.fromExternal(encryptedAmounts[i], inputProofs[i]);
            // Internal transfer: moves the hidden amount from this contract's confidential
            // balance to the recipient. No msg.sender ACL check applies here because the
            // Safe (payrollAdmin) is the one authorizing the batch, not each recipient.
            _transfer(address(this), recipients[i], amount);
            _batchRecipients[batchId].push(recipients[i]);
            emit ConfidentialPayout(batchId, recipients[i]);
        }

        emit BatchCreated(batchId, len, totalAmount);
    }

    /**
     * @notice Recipient-controlled selective disclosure. Lets a contributor grant an
     *         auditor or tax authority address permission to decrypt their current
     *         confidential balance handle, without making it public and without needing
     *         a new payout or wallet.
     */
    function grantAuditorAccess(address auditor) external {
        Nox.addViewer(confidentialBalanceOf(msg.sender), auditor);
        emit AuditorGranted(msg.sender, auditor);
    }

    /// @notice Returns the recipient list for a batch (public), with amounts staying hidden.
    function batchRecipients(uint256 batchId) external view returns (address[] memory) {
        return _batchRecipients[batchId];
    }
}
