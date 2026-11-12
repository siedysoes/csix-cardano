# Transactions & Addresses

A Cardano transaction is a deterministic bundle: it consumes specific UTxOs, creates new ones, pays a fee, and may mint tokens or demand extra signatures. Understanding each field — and how addresses encode who can spend versus who can stake — turns cryptic build errors into predictable checks.

## Anatomy of a Transaction

| Field | Role |
|---|---|
| **inputs** | UTxOs being consumed; each requires a payment-key signature or a passing script witness |
| **outputs** | New UTxOs created: address, value, optional datum or datum hash |
| **fee** | Lovelace paid for processing and storage (pooled and shared among block producers) |
| **validity interval** | Slot window (`invalid_before` / `invalid_hereafter`); the transaction is only valid inside it |
| **required signers** | Extra verification-key hashes that must sign, even though they spend nothing |
| **collateral** | ADA inputs forfeited if a script fails after phase-1 checks; present only when scripts are involved |
| **mint** | Native assets created (+) or burned (-), authorized by a minting policy script |
| **metadata** | Optional user-defined data, committed by hash in the witness set |

The signed transaction is the body above plus **witnesses**: signatures, required scripts, datums, and redeemers.

## Fees: The Linear Model

Fees are linear in transaction size:

```text
fee = a + b * size(tx)
```

- `a` — fixed base fee per transaction: **155,381 lovelace** on mainnet (protocol parameter `minFeeB`, aka txFeeFixed).
- `b` — per-byte rate: **44 lovelace/byte** on mainnet (protocol parameter `minFeeA`, aka txFeePerByte).
- `size(tx)` — serialized transaction size in bytes.

Note the naming quirk: in the protocol parameters, `minFeeA` is the per-byte term and `minFeeB` is the fixed term — the letters map opposite to the formula above. Both values are protocol parameters (as of writing; verify current values). Example for a 300-byte transaction:

```text
fee = 155,381 + 44 * 300 = 168,581 lovelace  (~0.1686 ADA)
```

Script transactions add an execution charge based on the declared memory and CPU execution units, priced by the `executionUnitPrices` parameter. Anything that grows the transaction — bigger metadata, a large inline datum, many assets — grows the fee proportionally.

## Minimum ADA per Output

Every output must carry a minimum amount of ADA derived from the output's serialized size: a **coins-per-byte** protocol parameter multiplied by that size (the Babbage era uses `coinsPerUTxOByte`; earlier eras used a per-word variant). On mainnet this has been **4,310 lovelace per byte** (as of writing — verify current protocol parameters).

Consequences to remember:

- An output with a large inline datum, heavy metadata, or many distinct tokens needs more ADA to stay valid.
- The rule prevents junk outputs from bloating the UTxO set for free — storage must always be paid for.

## Addresses on Cardano

An address is bech32-encoded and packs two independent credentials plus a network tag:

- **Payment credential** — a payment verification-key hash (or a script hash): who may authorize spending.
- **Stake credential** — a stake verification-key hash (or a script hash): who receives staking rights and rewards.
- **Network tag** — mainnet or testnet, which is why addresses from different networks never match.

### Address types

| Type | Mainnet prefix | Testnet prefix | Credentials | Typical use |
|---|---|---|---|---|
| Base | `addr1...` | `addr_test1...` | payment + stake | Standard wallet address: spends and delegates |
| Enterprise | `addr1...` | `addr_test1...` | payment only | Scripts, exchanges, services that do not stake |
| Stake (reward) | `stake1...` | `stake_test1...` | stake | Delegation certificates and the reward account |

Prefixes follow CIP-5. Because base and enterprise addresses share the same prefix, you cannot tell them apart by prefix alone — decode the address (any wallet or explorer will) to see whether a stake credential is embedded.

### Script addresses

A script address uses a **script hash** as its payment credential, so no private key exists for it. Spending requires providing the script itself (or a reference to it on-chain), the datum stored with the UTxO, a redeemer describing the action, and the script context; the transaction must also cover the fee and, for Plutus scripts, collateral. This is what makes "locked funds" possible: only logic, not a key holder, approves the spend.

## Reading txhash#index

A UTxO reference is written `transaction_hash#index`:

```text
2f10c1...7d3c#1
└──── 64 hex chars ────┘ └ index of the output, in creation order
   (blake2b-256 of the transaction body)
```

`#0` is the first output the transaction created, `#1` the second, and so on. Copy this exact string into explorers, `cardano-cli query utxo`, or API calls to inspect one specific output.

## A Transaction in JSON-ish Form

Illustrative, human-readable sketch of a plain ADA payment (the real wire format is CBOR; cardano-cli can render transactions as JSON):

```jsonc
{
  "inputs":  [ { "tx_hash": "8c9a...e41b", "index": 0 } ],
  "outputs": [
    { "address": "addr1qx9...recipient", "value": { "lovelace": 40000000 } },
    { "address": "addr1qw8...change",    "value": { "lovelace": 59831419 } }
  ],
  "fee": 168581,
  "validity": { "invalid_before": null, "invalid_hereafter": 145678300 },
  "required_signers": null,
  "collateral": null,
  "mint": null,
  "metadata": null
}
```

Balance check: the referenced input is worth `100,000,000` lovelace, which equals outputs `40,000,000 + 59,831,419` plus fee `168,581`. (Inputs are only references; values are looked up from the UTxO set.) The `required_signers`, `collateral`, and `mint` fields would be populated for transactions that involve extra signers, Plutus scripts, or native tokens — see [The UTxO Model](utxo-model.md) for what scripts expect, and [Native Tokens & Minting](../cli/cli-native-tokens.md) for the mint field in practice.

## See also

- [The UTxO Model](utxo-model.md)
- [cardano-cli Quickstart](../cli/cli-quickstart.md)
- [Building Transactions with cardano-cli](../cli/cli-transactions.md)
- [Native Tokens & Minting](../cli/cli-native-tokens.md)
