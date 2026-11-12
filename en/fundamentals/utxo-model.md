# The UTxO Model

Cardano tracks ownership with unspent transaction outputs (UTxOs) instead of account balances. The choice is not cosmetic: it shapes transaction structure, fees, parallelism, and how smart contracts are written, so understanding it early prevents most "why doesn't this behave like Solidity" surprises.

## UTxO Model vs Account Model

| Aspect | UTxO (Cardano, Bitcoin) | Account model (Ethereum, bank ledgers) |
|---|---|---|
| Where balance lives | Sum of unspent outputs owned by an address | A single balance per account |
| What a transaction does | Consumes whole outputs, creates new ones | Debits and credits balances |
| Spending the same funds twice | Impossible by construction: an output is spent once | Requires per-account nonce/ordering logic |
| Concurrency | Independent outputs validate in parallel | All transactions touching one account serialize |
| Contract state | Carried in output datums; scripts read the transaction | Shared mutable global storage |
| Change | Must be created explicitly | Not needed |
| Fee predictability | Deterministic up front (size and script budget) | Depends on state and gas market at execution time |

## Anatomy of a UTxO

A UTxO is addressed by the pair **(transaction hash, output index)**, written `txhash#index`, for example `8c9a...e41b#0`. Each UTxO carries:

- **value** — an amount of lovelace plus, optionally, native assets.
- **address** — the "lock": whoever can satisfy it (a payment key signature or a script) may spend the output.
- **datum** — optional data attached for scripts: either committed as a hash or, since the Babbage era, stored inline in the output.

```text
UTxO reference: 8c9a...e41b#0
  address : addr1...x9k2      (payment credential, optionally + stake credential)
  value   : 120,000,000 lovelace + 5 mytoken (policy abc..., name 4d79...)
  datum   : inline {"owner": "addr1...x9k2", "deadline": 145600000}   (optional)
```

The set of all currently unspent outputs is the **UTxO set** — the chain state every node keeps a copy of.

## Inputs, Outputs, and Change

A transaction:

1. **Consumes inputs** — references to existing UTxOs. Each must still be unspent, and the transaction must satisfy the lock: sign with the required key(s), or run and pass the script.
2. **Creates outputs** — brand-new UTxOs that future transactions can spend.
3. **Pays a fee** — see [Transactions & Addresses](transactions-and-addresses.md) for the linear fee formula.

Value is conserved exactly:

```text
sum(inputs) = sum(outputs) + fee
```

### Why change exists

Outputs are consumed whole, so a payment rarely uses an input exactly. If you want to send 20 ADA from a 100 ADA UTxO, the transaction creates 20 ADA for the recipient, a change output back to you, and the fee:

```text
before                          transaction                    after
UTxO A  100 ADA  ────────────▶  inputs : A                     UTxO X  20 ADA → recipient
                                outputs: X, Y                  UTxO Y  79.83 ADA → your change
                                fee    : 0.17 ADA
```

## Worked Example: Two Inputs, Three Outputs

Alice pays 300 ADA to a recipient, locks 250 ADA at a script address, and uses two of her UTxOs to fund it.

| Part | Reference | Value (lovelace) |
|---|---|---|
| Input 1 | `8c9a...e41b#0` | 500,000,000 |
| Input 2 | `2f10...7d3c#1` | 250,000,000 |
| **Total in** | | **750,000,000** |
| Output 1 (payment) | new `a1f3...#0` | 300,000,000 |
| Output 2 (script) | new `a1f3...#1` | 250,000,000 |
| Fee | | 181,000 (illustrative) |
| Output 3 (change) | new `a1f3...#2` | 199,819,000 |

Check: `300,000,000 + 250,000,000 + 181,000 + 199,819,000 = 750,000,000`. The change output must also satisfy the minimum-ADA rule for its size, and if any input is script-locked, the transaction must carry the witnesses that script requires.

## The Extended UTxO (eUTxO) Model

Plain UTxO scripting (as in early Bitcoin) can only check signatures and simple conditions. The **extended UTxO** model, enabled with the Alonzo era, adds three pieces that make general-purpose contracts possible:

- **Datum** — data attached to the output being spent; this is where a contract keeps its state (an owner, a deadline, an escrow balance).
- **Redeemer** — data supplied by the spender in the transaction to say which action it is attempting (redeem, cancel, bid).
- **Script context** — the ledger hands the validator the full transaction view: validity range, required signers, fee, minted values, and the output being spent. The validator returns accept or reject.

```text
validator (spend) := fn (datum, redeemer, context) -> accept | reject

  require context.tx.signed_by(owner)             // who may spend
  require context.tx.validity.ends_before(deadline) // time constraint
  require redeemer.amount == datum.amount          // action-specific check
```

### Execution units

Script runs are metered in **execution units** — separate budgets for memory (`exUnitsMem`) and CPU steps (`exUnitsSteps`). A transaction declares the maximum it will spend, prices are set by the protocol parameter `executionUnitPrices`, and the resulting cost is added to the fee. Exceeding the budget fails the script.

### Determinism and parallel validation

Because a validator is a pure function of `(datum, redeemer, context)`, validation is **local and deterministic**: you can evaluate a transaction off-chain and know in advance whether it will succeed, how much it costs, and what it does. Two transactions spending two different UTxOs never interfere, so nodes can validate them in parallel.

The flip side is contention: two users trying to spend the *same* contract UTxO cannot both succeed, and one transaction may invalidate the other if it lands first. Good designs spread work across many UTxOs instead of funneling everything through one.

## Why This Matters for Smart Contract Design

- **No shared global state.** Everything a contract needs lives in datums of UTxOs and in the transaction itself.
- **Value continuity is your job.** The ledger guarantees inputs equal outputs plus fee; the validator must additionally check that its own outputs pay the right values to the right addresses.
- **Reentrancy as known from account models has no direct analogue** — a script cannot call back into another contract mid-execution; it only inspects a fixed transaction snapshot.
- **Deadlines are checked against the validity range**, not against wall-clock calls — see [Epochs, Slots & Time](epochs-and-time.md).
- **Design for parallelism.** One UTxO per user or per request, or a batching pattern, rather than a single "hot" contract output.
- **Budget and collateral.** Script execution must fit in its execution-unit budget, and transactions touching scripts carry collateral in case a script fails after phase-1 checks.

## See also

- [Transactions & Addresses](transactions-and-addresses.md)
- [What Is Cardano](what-is-cardano.md)
- [Your First Validator](../aiken/aiken-first-validator.md)
- [Building Transactions with cardano-cli](../cli/cli-transactions.md)
