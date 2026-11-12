# Building Transactions with cardano-cli

Every Cardano transfer follows the same pipeline: pick an input, build, sign, inspect, submit, confirm. This page shows the full workflow with a verified command set against a testnet node, plus how fees and min-UTxO rules show up as errors. All commands assume `--testnet-magic 2` (preview) and a running node reachable at `node.socket`.

## Workflow overview

| Step | Action | Command group | Needs node |
| --- | --- | --- | --- |
| 1 | Fund the address from a faucet | browser | no |
| 2 | Find a spendable UTxO | `conway query utxo` | yes |
| 3 | Build the transaction | `conway transaction build` | yes |
| 4 | Sign it | `conway transaction sign` | no |
| 5 | Inspect it | `debug transaction view` | no |
| 6 | Submit it | `conway transaction submit` | yes |
| 7 | Confirm with the tx id | `conway transaction txid` | no |

## 1. Get test ADA from a faucet

Open the official Cardano testnet faucet (linked from the Cardano testnet docs), paste the address from `cat me.addr`, and request test ADA. Funds arrive within a short while and are visible with `conway query utxo`. Test ADA has no value; never use mainnet for these steps.

## 2. Query the UTxO to spend

```bash
cardano-cli conway query utxo \
  --address "$(cat me.addr)" \
  --socket-path node.socket \
  --testnet-magic 2
```

Pick one row and note its hash and index — that becomes `<txhash>#<ix>`. Querying again later is also how you confirm a previous transaction landed.

## 3. Build

```bash
cardano-cli conway transaction build \
  --tx-in <txhash>#<ix> \
  --tx-out <addr>+<lovelace> \
  --change-address <addr> \
  --socket-path node.socket \
  --testnet-magic 2 \
  --out-file tx.raw
```

`build` reads protocol parameters and current protocol state from the node, calculates the fee, and sends the remainder of the input to `--change-address` automatically. `<addr>` is your address, e.g. `$(cat me.addr)`.

## 4. Sign

```bash
cardano-cli conway transaction sign \
  --tx-file tx.raw \
  --out-file tx.signed \
  --signing-key-file me.sk
```

Signing happens locally; the node is not involved. The output contains the transaction body plus its witness set.

## 5. Inspect before submitting

```bash
cardano-cli debug transaction view --tx-file tx.signed
```

This prints the transaction in a human-readable JSON form: inputs, outputs, fee, and witnesses. Get into the habit of reading it — it is the last point where a wrong address or amount is cheap to fix.

## 6. Submit

```bash
cardano-cli conway transaction submit \
  --tx-file tx.signed \
  --socket-path node.socket \
  --testnet-magic 2
```

## 7. Confirm with the tx id

```bash
cardano-cli conway transaction txid --tx-file tx.signed
```

Search that hash on the explorer for your network — `preprod.cardanoscan.io` for magic 1, `preview.cardanoscan.io` for magic 2. The transaction is final once the block containing it is produced; re-querying your UTxOs shows the new outputs.

## Fees

The ledger fee is linear in the serialized transaction size:

```text
fee = a + b × size(tx)
```

| Parameter | Meaning | Typical value |
| --- | --- | --- |
| `a` (`minFeeA`) | cost per byte | 44 lovelace |
| `b` (`minFeeB`) | fixed cost | 155381 lovelace |
| `size` | transaction size in bytes | grows with inputs, outputs, scripts |

A 300-byte transaction therefore costs `155381 + 44 × 300 = 168581` lovelace (about 0.169 ADA). Protocol parameters can change, so read the current values with `conway query protocol-parameters` instead of trusting constants. To estimate a fee for a transaction you assembled yourself, use `conway transaction calculate-min-fee`; its flags vary between CLI versions, so check `cardano-cli conway transaction calculate-min-fee --help`.

## Reading min-UTxO errors

Every transaction output must carry a minimum amount of ADA, proportional to how much data (asset names, policy ids, quantities) it holds. If an output holds too little, the node rejects the whole transaction and reports the required minimum for that output — the exact wording varies by node version, so read the number it prints rather than memorising the message. Fixes:

- send more ADA to the token-bearing output,
- split fewer assets into one output,
- drop the empty/dust output you did not really need.

A `FeeTooSmallUTxO`-style rejection is different: it means your computed fee is below the required one, usually because you hand-edited a `build-raw` transaction.

## `build` versus `build-raw`

| | `transaction build` | `transaction build-raw` |
| --- | --- | --- |
| Balances inputs and outputs | automatically | you compute change yourself |
| Fee | calculated for you | you pass it explicitly |
| Needs a running node | yes | no (uses `--protocol-params-file`) |
| Typical use | everyday transactions | scripting, debugging, custom sizing |

`build` is the right default while learning. `build-raw` exists for cases where you need byte-level control, and it pairs with `calculate-min-fee` to determine the fee you then hard-code.

## Worked example: send 10 ADA

```bash
ADDR=$(cat me.addr)

# 1. find an input with at least ~10.2 ADA
cardano-cli conway query utxo --address "$ADDR" --socket-path node.socket --testnet-magic 2

# 2. build (send 10 ADA to yourself, change returns automatically)
cardano-cli conway transaction build \
  --tx-in 9f0a...c1#0 \
  --tx-out "$ADDR"+10000000 \
  --change-address "$ADDR" \
  --socket-path node.socket \
  --testnet-magic 2 \
  --out-file tx.raw

# 3. sign and inspect
cardano-cli conway transaction sign --tx-file tx.raw --out-file tx.signed --signing-key-file me.sk
cardano-cli debug transaction view --tx-file tx.signed

# 4. submit and confirm
cardano-cli conway transaction submit --tx-file tx.signed --socket-path node.socket --testnet-magic 2
cardano-cli conway transaction txid --tx-file tx.signed
```

`build` reports the estimated fee on success (on the order of 0.17 ADA for a simple transaction). After submitting, the txid opens on `preview.cardanoscan.io`, and the next `query utxo` shows one input consumed and two outputs created: the 10 ADA payment and your change.

## See also

- [cardano-cli Quickstart](cli-quickstart.md)
- [Native Tokens & Minting](cli-native-tokens.md)
- [Transactions & Addresses](../fundamentals/transactions-and-addresses.md)
- [Cardano Testnets](../fundamentals/cardano-testnets.md)
