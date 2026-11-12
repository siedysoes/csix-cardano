# cardano-cli Quickstart

`cardano-cli` is the official command-line tool for Cardano: it generates keys, derives addresses, queries the chain, and builds, signs and submits transactions. It is a client of a running `cardano-node`, so the first practical step is setting up a node connection. Everything in this guide runs on a testnet only.

## What cardano-cli is

The CLI exposes the ledger as a set of subcommands. In daily use you will touch four groups:

| Command group | Purpose | Example |
| --- | --- | --- |
| `address` | key generation, address derivation | `cardano-cli address key-gen` |
| `conway query` | read chain state from the node | `cardano-cli conway query utxo ...` |
| `conway transaction` | build, sign and submit transactions | `cardano-cli conway transaction build ...` |
| `debug` | inspect intermediate files safely | `cardano-cli debug transaction view ...` |

There is no framework and no wallet software in between: what the CLI reports is what the node reports, which makes it a good tool for learning how Cardano actually behaves.

## Why it needs a running cardano-node

Commands that read or modify chain state (`query utxo`, `query protocol-parameters`, `transaction build`, `transaction submit`) must ask the node for its current view of the ledger: the UTxO set, protocol parameters, current era and chain tip. The CLI reaches the node over a local socket, whose path you pass with `--socket-path`:

```bash
export CARDANO_NODE_SOCKET_PATH="$PWD/node.socket"
# or pass --socket-path node.socket on every query/submit command
```

If the socket path is wrong or the node is not running, these commands fail immediately with a connection error. Purely local commands — `address key-gen`, `address build`, `transaction sign`, `transaction txid` — work without a node.

## Run a testnet node instead of mainnet

Syncing mainnet from scratch means downloading and validating the entire chain: hundreds of gigabytes of storage and a long initial sync. A testnet node gives you the exact same CLI behaviour, but with:

- far smaller storage and faster initial sync,
- free test ADA from a faucet, so mistakes cost nothing,
- the safety margin that a typo can never touch real funds.

Two public testnets are maintained for this purpose: **preprod** (stable, epoch-aligned with mainnet) and **preview** (features upcoming changes first). See [Cardano Testnets](../fundamentals/cardano-testnets.md) for how they differ.

## Install

As of writing, the usual options are:

| Route | Where | Notes |
| --- | --- | --- |
| Prebuilt binaries | GitHub releases of `IntersectMBO/cardano-node` | archives with `cardano-cli` and `cardano-node` for several platforms |
| Package managers | distro/third-party repositories | availability and freshness vary per platform |
| Build from source / Nix | official documentation | heaviest option, needed only for development |

Check the official cardano-node documentation for the current instructions, then verify the binary you actually installed:

```bash
cardano-cli --version
cardano-cli --help
```

`--help` is the authority: subcommand names and flags change between releases.

## Generate a key pair

```bash
cardano-cli address key-gen \
  --verification-key-file me.vk \
  --signing-key-file me.sk
```

Both files are JSON objects with a `type` and `cborHex` field. Treat `me.sk` like a password: never commit it, never share it, and back it up. The verification key is public; its hash is what a validator would store as an "owner".

## Build an address

```bash
cardano-cli conway address build \
  --testnet-magic 2 \
  --payment-verification-key-file me.vk \
  --out-file me.addr

cat me.addr
# addr_test1... (a bech32 address for the preview testnet)
```

`--testnet-magic 2` targets preview. Swap it for `1` to target preprod, or replace it with `--mainnet` when you deliberately work against mainnet.

## Query your UTxOs

```bash
cardano-cli conway query utxo \
  --address "$(cat me.addr)" \
  --socket-path node.socket \
  --testnet-magic 2
```

Abridged output shape:

```text
                           TxHash                                 TxIx      Amount
--------------------------------------------------------------------------------------
9f0a...c1                              0        100000000 lovelace
```

Each row is one UTxO: transaction hash, output index, and its value. `#<TxHash>#<TxIx>` together form the input reference you will use when building a transaction. Two more queries are worth knowing early:

```bash
cardano-cli conway query tip --socket-path node.socket --testnet-magic 2
cardano-cli conway query protocol-parameters --socket-path node.socket --testnet-magic 2 --out-file pparams.json
```

## Testnet magics

| Network | `--testnet-magic` | Typical use |
| --- | --- | --- |
| Mainnet | `764824073` (use `--mainnet` instead) | real funds — not for learning |
| Preprod | `1` | stable testnet, mainnet-like timing |
| Preview | `2` | preview of upcoming features |

The magic number is baked into the network handshake: pointing a command at the wrong network fails rather than silently mixing chains.

## Era prefixes

Commands shown here use the `conway` era prefix, for example `cardano-cli conway transaction build`. The prefix selects the set of rules and formats of a ledger era. Newer CLI releases may introduce another era prefix or move commands between them, so check `cardano-cli --help` before copying commands from any tutorial — including this one.

## See also

- [Building Transactions with cardano-cli](cli-transactions.md)
- [Native Tokens & Minting](cli-native-tokens.md)
- [Cardano Testnets](../fundamentals/cardano-testnets.md)
- [The UTxO Model](../fundamentals/utxo-model.md)
