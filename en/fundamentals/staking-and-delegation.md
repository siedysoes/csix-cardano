# Staking & Delegation

On Cardano, holding ADA lets you take part in consensus without running any infrastructure: you delegate staking rights to a pool that produces blocks, and rewards follow. Delegation is non-custodial — your funds never leave your wallet — which makes it fundamentally different from depositing into a staking product.

## How Proof of Stake Works on Cardano

- **Stake** is the ADA held in addresses whose stake credential has been delegated. The protocol snapshots stake at epoch boundaries and uses it to weight leader selection (see [Epochs, Slots & Time](epochs-and-time.md)).
- Each slot, a pool is elected via VRF with probability proportional to its relative stake; elected pools produce blocks and earn rewards.
- **Stake pools** aggregate many delegators' weight so that small holders receive a steady, proportional share instead of lottery-style odds.

## Stake Pools

| Concept | Meaning |
|---|---|
| Operator | Runs and maintains the block-producing node and relay nodes; must be online to mint |
| Pool ID | Hash of the operator's pool verification key; this is what you delegate to |
| Pledge | The operator's own ADA committed to the pool; influences rewards via the pledge influence parameter (`a0`) and signals alignment with delegators |
| Saturation | The ideal pool size is roughly *total active stake ÷ k*; above it, rewards per delegator shrink |
| Parameter `k` | The target number of pools (`stakePoolTargetNum`, also called `nOpt`), which sets that saturation threshold; `k = 2160` as of writing — verify current values |

Rewards are designed to balance roughly `k` fully saturated pools: the healthiest arrangement is stake spread across many pools rather than piled onto a few.

## Delegation Is Non-Custodial

Delegating is a statement recorded on chain, not a transfer. Three facts follow:

- **Your ADA stays in your addresses.** You can spend it, receive more, or move it at any time; only the staking rights attached to your stake credential change.
- **A pool operator can never touch your funds.** They only receive delegation weight; spending still requires your keys.
- **You delegate once per change.** Switching pools costs one small certificate transaction.

What delegation actually posts to the chain:

1. A **stake address** registration (your `stake1...` credential), which requires a refundable deposit — wallets handle this automatically.
2. A **delegation certificate** pointing that stake credential at a pool ID, which costs a normal transaction fee.

Because registration and delegation need fees, wallets bootstrap by sending your first funds to a base address that already carries the (not yet registered) stake credential.

## Rewards at the Epoch Boundary

Rewards flow from the protocol to pools to you:

```text
epoch pot (tx fees + monetary expansion, minus treasury cut)
        └─▶ pool takes fixed cost, then margin %
                └─▶ remainder shared pro-rata by delegated stake
                        └─▶ credited to each delegator's reward address
```

| Step (illustrative numbers only) | Value |
|---|---|
| Pool's share of epoch rewards | 1,000 ADA |
| minus fixed cost per epoch | 100 ADA |
| minus margin: 2% of the remainder | 18 ADA |
| **Delegator share, split pro-rata** | **882 ADA** |

Key mechanics:

- Rewards are calculated and paid **at epoch boundaries**, after a snapshot delay — expect one to two epochs between delegating and earning, and verify the exact schedule on docs.cardano.org.
- Rewards accumulate on your **stake (reward) address** and are automatically counted as stake in later snapshots — compounding requires no extra transaction.
- To spend rewards you submit a withdrawal transaction; until then they keep earning.
- Payouts are **not guaranteed**: they depend on the pool actually being elected and minting its assigned blocks.

## When Something Goes Wrong

| Situation | What happens to you |
|---|---|
| Pool becomes oversaturated | You earn less per ADA — delegate to a pool below saturation |
| Pool is offline and misses leader slots | Those rewards are simply lost; there is **no slashing**, your principal is untouched |
| Pool raises its margin or cost | Your net rewards drop; you can switch pools any time |
| You spend delegated ADA | Your stake moves with your UTxOs at the next snapshot |
| Pool retires | Your delegation lapses safely; pick a new pool (wallets may warn you) |

## Pool Fees: Cost and Margin

| Fee | Who sets it | Effect |
|---|---|---|
| Fixed cost per epoch | Operator (bounded below by the `minPoolCost` protocol parameter) | Taken before rewards are shared |
| Margin (%) | Operator | Operator's percentage of the remaining rewards |
| Pledge | Operator's own ADA | Modulates rewards via the pledge influence factor |

Always compare saturation, margin, cost, pledge, and recent block performance — a low fee means little if the pool misses its blocks.

## Delegation vs "Staking" on Other Chains

| Aspect | Cardano delegation | Some other systems |
|---|---|---|
| Custody | Funds never leave your wallet | Often a contract, custodian, or exchange holds them |
| Lockup | None — spend any time | Unbonding periods, fixed terms, or withdrawal queues |
| Slashing | None; poor pool performance only loses rewards | Some chains slash delegated stake |
| Minimum | No protocol minimum (only the usual min-UTxO sizes) | Solo validation often requires large minimums |
| Re-delegating | One certificate transaction, effective next snapshot | Can require waiting out a lockup |

## How to Delegate With a Wallet

1. Install a Cardano wallet and create or restore a wallet (as of writing, options include Lace, Eternl, Typhon, and Flint — verify current availability). Guard your seed phrase.
2. Fund your base address (`addr1...`) with ADA.
3. Open the staking or delegation view and compare pools: saturation, margin, fixed cost, pledge, and block-production history.
4. Select a pool and sign the transaction the wallet builds — it contains your stake registration (if needed) and the delegation certificate, plus a small fee.
5. Wait for epoch boundaries: snapshot first, then active stake, then rewards; watch them arrive on your stake address.

## Running Your Own Pool

Running a pool means operating a hardened block producer plus relay nodes, firewall and key management (cold keys offline, KES rotation and operational certificates), monitoring and alerting, sustained uptime, and committed pledge capital. It is infrastructure work with real operational risk to other people's rewards — not a beginner project. See the stake pool operator section of docs.cardano.org if you want the full path.

## See also

- [What Is Cardano](what-is-cardano.md)
- [Epochs, Slots & Time](epochs-and-time.md)
- [Transactions & Addresses](transactions-and-addresses.md)
- [Cardano Testnets](cardano-testnets.md)
