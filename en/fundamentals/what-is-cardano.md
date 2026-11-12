# What Is Cardano

Cardano is a decentralized proof-of-stake blockchain platform and the native home of the ada (ADA) cryptocurrency. It is best known for a research-first process: its consensus protocol, Ouroboros, was formalized and peer-reviewed before it ran on a public network. This page gives you the vocabulary the rest of this learning base assumes — consensus, the organizations behind Cardano, ADA and its units, the era timeline, and where smart contracts and governance fit.

## Proof of Stake, Not Proof of Work

Proof-of-work chains secure the ledger by making miners burn electricity to compete for the right to produce blocks. Cardano uses proof of stake (PoS): the protocol selects block producers according to the stake they control, so security comes from economic weight rather than hardware.

What that means in practice:

- Blocks are produced by stake pools running ordinary server hardware — no mining rigs, no specialized chips.
- Energy consumption per transaction is a small fraction of proof-of-work systems.
- Security rests on an honest-majority-of-stake assumption: the published proofs assume an adversary controls less than half of the staked weight (exact assumptions differ between protocol variants).
- ADA holders delegate their stake to pools instead of running the infrastructure themselves.

## Ouroboros: The Protocol Family

Ouroboros is Cardano's proof-of-stake consensus protocol. The original paper, "Ouroboros: A Provably Secure Proof-of-Stake Blockchain Protocol", was published in 2017, and official documentation describes Ouroboros as the first blockchain protocol based on peer-reviewed research. Rather than asserting security, the design ships with mathematical arguments about safety, leader-selection randomness, and incentive compatibility.

Published variants include:

| Variant | Contribution |
|---|---|
| Ouroboros Classic | The original provably secure PoS protocol and its incentive mechanism |
| Ouroboros BFT | Simplified federated consensus used during the Byron transition |
| Ouroboros Praos | Semi-synchronous security with private leader selection and key-evolving signatures |
| Ouroboros Genesis | A chain-selection rule that lets a node bootstrap from genesis without trusted checkpoints |
| Ouroboros Chronos | Blockchain-based clock synchronization (research) |
| Ouroboros Leios | A throughput-oriented overlay design (in research and development as of writing) |

Byron ran federated Ouroboros BFT; from Shelley onward, block production moved to the stake pool community using Praos-family consensus (the Babbage era replaced the transitional protocol with Praos). The exact production configuration changes with upgrades — verify the current consensus setup on docs.cardano.org.

### What "peer reviewed" does and does not buy you

| Peer review supports | Peer review does not cover |
|---|---|
| Proofs of safety and liveness under stated assumptions | Bugs in the node implementation |
| Published, citable analysis of incentives and randomness | Attacks outside the model's assumptions |
| Independent scrutiny before deployment | Operational, economic, or governance failures |

## The Three Founding Organizations

| Organization | Type | Role |
|---|---|---|
| Input Output (often written IOHK / Input Output Global) | Research and engineering company, founded 2015 | Protocol research and core software: cardano-node, Plutus, developer tooling |
| Cardano Foundation | Non-profit foundation based in Switzerland | Ecosystem stewardship: standards, education, regulatory engagement, governance participation |
| EMURGO | Commercial venture arm | Adoption: products, investments, and partnerships |

These are the three founding entities. Their exact responsibilities have shifted over time, and day-to-day coordination increasingly runs through community organizations such as Intersect MBO and through on-chain governance — verify the current division of roles on cardano.org.

## ADA and Lovelace

- **ADA** is the native token, named after Ada Lovelace.
- The **lovelace** is the smallest unit: **1 ADA = 1,000,000 lovelace**.
- Protocol-level values — fees, UTxO balances, treasury amounts — are denominated in lovelace, while wallets display ADA.
- The **maximum supply is fixed at 45,000,000,000 (45 billion) ADA**. New ADA enters circulation only through staking rewards and treasury funding, epoch by epoch, and never exceeds that cap.

```text
1 ADA          =       1,000,000 lovelace
2.5 ADA        =       2,500,000 lovelace
0.17 ADA fee   =         170,000 lovelace
45 billion ADA = 45,000,000,000,000,000 lovelace
```

## The Era Timeline

Cardano upgrades through hard-forked eras; each era changes the ledger rules — which transactions are valid and what data they may carry. The official documentation distinguishes development phases (Byron, Shelley, Goguen, Basho, Voltaire) from ledger eras (Byron, Shelley, Allegra, Mary, Alonzo, Babbage, Conway); the table below uses the phase-style timeline most tutorials quote.

| Era | What it introduced |
|---|---|
| **Byron** (mainnet start to mid-2020) | Foundation era: federated block production by the founding entities, basic ada transfers, Daedalus and Yoroi wallets |
| **Shelley** (from July 2020) | Decentralization: proof of stake, community-run stake pools, and delegation |
| **Goguen** (2020-2021) | Smart contracts and custom tokens, delivered in steps across the Allegra, Mary, and Alonzo ledger eras — Alonzo activated Plutus scripts in September 2021 |
| **Vasil** (2022, the Babbage ledger era) | Performance and developer upgrade: inline datums, reference inputs and reference scripts, diffusion pipelining; named after Vasil Dabov |
| **Conway** (from 2024) | On-chain governance (CIP-1694): DReps, a constitutional committee, and SPO voting, rolled out via the Chang and Plomin hard forks |

As of writing, Conway is the active ledger era and the next upgrades (Dijkstra, then Euler) are announced but not yet delivered — verify the current era and upgrade status on docs.cardano.org before relying on any timeline.

## Smart Contracts and Native Assets

### Plutus and other scripting languages

Smart contracts on Cardano are validators written for the extended UTxO model. Plutus is the original platform; the official docs also list Aiken, Scalus, and Marlowe as options. A validator is a program that decides whether a specific UTxO may be spent by a specific transaction, and it runs inside a fixed execution budget (execution units) that is priced into the transaction fee.

### Native assets

The ledger supports tokens natively: each asset is identified by a `(policy id, asset name)` pair, and minting or burning is controlled by a minting policy script. Transferring native tokens needs no smart contract at all — unlike account-model chains, where a contract usually keeps the balances.

## On-Chain Governance (Conway Era)

Since CIP-1694, Cardano can change itself by on-chain vote. Governance is shared among three bodies:

- **DReps** — anyone can register as a delegated representative, and ADA holders delegate voting power to them (counted as one lovelace, one vote).
- **Constitutional committee** — checks that governance actions comply with the Cardano constitution (one member, one vote).
- **Stake pool operators** — vote on a defined subset of actions, such as hard-fork initiation and security-sensitive parameter changes.

Anyone can submit a governance action, and most actions must be ratified by at least two of the three bodies. Treasury withdrawals and protocol parameter updates now go through this process rather than through the founding entities. Governance is young and its thresholds, tooling, and procedures change with each upgrade — as of writing, verify current rules on docs.cardano.org and the official governance tool docs (docs.gov.tools) before acting.

## Facts That Change: Verify Before Relying

Items that move fast, worth checking on official sources (docs.cardano.org, cardano.org, cips.cardano.org):

- The current era and pending upgrades (Conway plus announced successors as of writing).
- Protocol parameters: fees, security parameter k, the active slot coefficient, deposits, and minimum-ADA rules.
- Governance rules: quorum thresholds, DRep registration, and committee processes.
- The current responsibilities of Input Output, the Cardano Foundation, and EMURGO.

## See also

- [The UTxO Model](utxo-model.md)
- [Epochs, Slots & Time](epochs-and-time.md)
- [Staking & Delegation](staking-and-delegation.md)
- [Cardano Testnets](cardano-testnets.md)
- [The Cardano dApp Stack](../dapp/dapp-stack.md)
