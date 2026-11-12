# Epochs, Slots & Time

Cardano measures protocol time in slots and epochs rather than trusting block timestamps alone. Consensus, staking rewards, transaction validity, and smart-contract deadlines all key off these units, so a working mental model matters for both delegators and dApp developers.

## Slots and Epochs

- **Slot** — the basic time tick. Slot length is a protocol parameter, set to **1 second** on mainnet since the Shelley era.
- **Epoch** — a fixed window of **432,000 slots = 5 days exactly** (432,000 s ÷ 86,400 s per day).
- Nodes translate wall-clock time into the current slot and tick forward even when no block arrives; a slot number is a position in the protocol's own timeline, not a raw timestamp.

### Counting slots into epochs

Slot numbers are global, so epoch arithmetic is simple division:

```text
epoch               = floor(slot / 432000)
position in epoch   = slot % 432000
next epoch boundary = (floor(slot / 432000) + 1) * 432000

example: slot 288,576,092
  epoch              = floor(288,576,092 / 432,000) = 668
  position           = 92 slots (92 seconds) past that epoch's start
  next boundary slot = 289,008,000  (431,908 seconds later, i.e. ~5 days)
```

This is how tools derive "current epoch" and "time until rewards" from a chain tip.

## Blocks Are Probabilistic, Not Guaranteed

Not every slot holds a block. The **active slot coefficient `f`** is the probability that a given slot is assigned a block producer; on mainnet `f = 0.05` (as of writing — verify).

```text
expected interval between blocks = slot length / f = 1 s / 0.05 = 20 seconds
```

So empty slots are normal: roughly 19 in every 20 slots carry no block, and wallets or indexers simply wait.

### Leader selection with VRF (brief)

Under Praos-style consensus, each epoch's randomness (a seed derived from previous-epoch output) is combined with a pool's operational key material in a **verifiable random function (VRF)**. A pool may produce the slot's block only if its VRF result falls below a threshold proportional to its relative stake — so stake buys probability, not guarantees. Because the VRF output cannot be known before the seed is fixed, leaders are unpredictable in advance, which blunts denial-of-service targeting; the block carries the VRF output so anyone can verify it.

## The Security Parameter k and Finality

The security parameter **`k`** is the number of blocks after which the chain is treated as immutable. Official documentation describes the **stability window** — the period in which no hard fork can occur and transaction finality is guaranteed — as taking up to **3k/f slots**, which is **36 hours with current parameters** (roughly a day and a half), and states that transaction finality takes approximately one day and cannot happen in less than a day.

```text
3k/f = 129,600 slots = 36 hours   with f = 0.05 and k = 2160
```

Practical guidance:

- Within minutes or hours, confidence is already high; the probability of a block being discarded falls exponentially with depth.
- Treat a payment as **practically irreversible after about a day or more** of confirmations for high-value scenarios.
- Both `k` and `f` are governance-adjustable protocol parameters — as of writing the values above reflect mainnet, so verify current parameters on docs.cardano.org.

## Time Units at a Glance

| Unit | Length | Used for |
|---|---|---|
| Slot | 1 second | Base time step; a block may appear in each slot |
| Block (expected) | ~20 seconds on average (1 s ÷ f, f = 0.05) | Measuring confirmation depth |
| Epoch | 432,000 slots = 5 days | Stake snapshots, leader schedules, reward calculation, parameter changes |
| Stability window | up to 3k/f ≈ 36 hours (k = 2160, f = 0.05) | Immutability / finality horizon |
| Rewards | Distributed at an epoch boundary, after a snapshot delay | Delegator and pool-operator payouts |

On testnets these numbers can differ: preview has used 1-day epochs while preprod mirrors mainnet (as of writing — verify). Delegated stake also only becomes active after an epoch-boundary snapshot, so expect a delay of one to two epochs before earning; check the exact snapshot-to-payout schedule on docs.cardano.org rather than memorizing it.

## Seeing the Chain Tip

Any synced node can report its tip. With cardano-cli:

```console
$ cardano-cli query tip --mainnet
{
    "era": "Conway",
    "epoch": 668,
    "slot": 288576092,
    "hash": "3f2c...abcd",
    "syncProgress": "100.00"
}
```

Illustrative output only — values are not live data, field names vary by node version, and testnets are queried with `--testnet-magic N` instead of `--mainnet` (see [Cardano Testnets](cardano-testnets.md)). Explorers (for example cardanoscan.io) and data providers (Blockfrost, Koios) expose the same tip fields: slot, epoch, block number, and hash.

## What This Means for dApp Timing

### Validity intervals

Every transaction carries a **validity interval**: a lower bound (`invalid_before`) and an upper bound (`invalid_hereafter`) in slots. The chain excludes a transaction outside its interval, and an expired transaction is never included — so it never consumes a fee; wallets typically just resubmit with a fresh upper bound.

### Deadlines inside validators

Scripts receive the validity range as **POSIX time** (converted from slots by consensus), and can assert things like "this transaction is valid only before/after time D". They cannot observe the exact validation moment — that would break determinism.

A standard two-path escrow pattern:

| Contract action | Off-chain: validity range to set | On-chain: validator check |
|---|---|---|
| Claim before deadline D | upper bound strictly before D | require `validity upper < D` |
| Claim (refund) after deadline D | lower bound at or after D | require `validity lower ≥ D` |

Timing advice:

- Blocks arrive about every 20 seconds, and mempools add delay — never design windows measured in single seconds; leave at least several blocks of margin.
- If a deadline passes while a transaction waits, it expires harmlessly; build a retry path with a widened range.
- Verify timing assumptions on a testnet first; testnet epoch lengths and upgrade schedules differ from mainnet.

### Common timing mistakes

- Assuming a block lands every slot — only about 1 in 20 slots carries one.
- Treating wall-clock seconds as exact chain time; propagation and slot conversion add slack.
- Shipping validity windows narrower than a few blocks and then debugging "transaction expired".
- Forgetting that an expired transaction costs nothing but must be rebuilt with a fresh upper bound.
- Copying mainnet epoch math to preview, which has used 1-day epochs (as of writing — verify).
- Hard-coding slot numbers for deadlines, then breaking when a testnet is reset or an era changes slot handling.

## See also

- [What Is Cardano](what-is-cardano.md)
- [The UTxO Model](utxo-model.md)
- [Transactions & Addresses](transactions-and-addresses.md)
- [Staking & Delegation](staking-and-delegation.md)
- [cardano-cli Quickstart](../cli/cli-quickstart.md)
