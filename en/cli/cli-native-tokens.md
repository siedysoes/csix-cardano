# Native Tokens & Minting

Cardano's ledger is multi-asset: ADA and user-defined tokens live in the same UTxO and move in the same transaction. Creating such a token means adding a `--mint` field to a transaction, governed by a minting policy that decides who may create or destroy units. This page covers asset identifiers, a minimal signature policy, and how to mint and burn on a testnet.

## The multi-asset ledger

A UTxO holds a value of the form `lovelace + list of (policy id, asset name, quantity)`. There is no separate "token chain": tokens travel with ADA, are spent in the same inputs, and every output that carries tokens must also carry enough ADA (see below).

## Asset identifiers

A user token is identified by exactly two things:

| Component | Form | Example |
| --- | --- | --- |
| Policy id | 28-byte hash, shown as 56 hex characters | `1a2b...9f` |
| Asset name | up to 32 bytes, shown as hex | `544f4b454e` (`TOKEN`) |

The pair `<policyid>.<asset_name_hex>` is the asset id used by cardano-cli. Because long hex strings are unreadable, CIP-14 defines a **fingerprint**: a short, checksummed identifier derived from a blake2b hash over policy id and asset name, shown with an `asset1...` prefix. Wallets display fingerprints or names, but the ledger only ever compares policy id plus name bytes.

## Minting policies

A minting policy is a script attached to the policy id. When a transaction mints or burns units, the ledger runs that script; if it returns `True`, the mint is allowed. Two flavours exist:

- **Native scripts** — small combinator language (`sig`, `all`, `any`, `nOfK`, time locks), evaluated as part of the transaction's basic validation.
- **Plutus scripts** — full programs (typically written in Aiken) executed with a memory/compute budget.

The mint field itself is a list of `(policy id, asset name, quantity)`. Positive quantities create tokens, negative quantities destroy them; within one transaction the net change per asset must be authorised by its policy.

### A signature-based policy

The simplest policy: only the holder of a key may mint. First compute the key hash:

```bash
cardano-cli address key-hash --payment-verification-key-file me.vk
```

Then write `policy.script` (native script JSON):

```json
{
  "type": "sig",
  "keyHash": "REPLACE_WITH_YOUR_KEY_HASH"
}
```

Any transaction minting under this policy must carry a signature from that key.

### Compute the policy id

```bash
cardano-cli conway transaction policyid --script-file policy.script
```

The printed hash **is** the policy id; every unit of your token is addressed as `<policyid>.TOKEN`. This command runs locally — no node connection needed.

## Minting and burning

```bash
POLICY_ID=$(cardano-cli conway transaction policyid --script-file policy.script)

cardano-cli conway transaction build \
  --tx-in <txhash>#<ix> \
  --tx-out "$(cat me.addr)+2000000+1000000 ${POLICY_ID}.TOKEN" \
  --mint "1000000+${POLICY_ID}.TOKEN" \
  --change-address "$(cat me.addr)" \
  --socket-path node.socket \
  --testnet-magic 2 \
  --out-file mint.raw

cardano-cli conway transaction sign \
  --tx-file mint.raw \
  --out-file mint.signed \
  --signing-key-file me.sk

cardano-cli conway transaction submit \
  --tx-file mint.signed \
  --socket-path node.socket \
  --testnet-magic 2
```

Notes:

- the `--tx-out` line is what actually holds the new tokens: 1,000,000 units of `TOKEN` plus 2 ADA of min-ADA;
- signing with `me.sk` satisfies the `sig` policy, because the policy demands exactly that key;
- burning uses a negative quantity — `--mint "-1000000+${POLICY_ID}.TOKEN"` — and the tokens must be consumed from your outputs in the same transaction;
- if your CLI version rejects the plain `TOKEN` name, try the hex form `544f4b454e`; asset names are byte strings and CLI flag details change between releases.

## Minimum ADA per token output

An output containing tokens is larger than an ADA-only output, so it must carry a protocol-defined minimum (based on the `coinsPerUTxOByte` protocol parameter). In practice a small token output needs on the order of 1–2 ADA. If it carries less, the node rejects the transaction and prints the required minimum for that output — increase the lovelace figure in the `--tx-out` until it passes.

## Native asset versus Plutus token

| Aspect | Native script policy | Plutus script policy |
| --- | --- | --- |
| Where it is checked | transaction validation (phase 1) | script execution (phase 2) |
| Extra cost | none beyond size | execution units (mem/cpu) paid in the fee |
| Expressible logic | key/time/combinator rules only | arbitrary logic in Aiken |
| Typical use | fixed supply, deadline mints | rules that inspect the transaction |
| Failure mode | script evaluates to false → tx invalid | budget exceeded or error → tx rejected |

## Safety: names do not protect you

Two different policies can mint an asset with the same name; the pair `(policy id, name)` is what distinguishes them, so users must verify the policy id — never the ticker. Within one policy, **anyone who satisfies the policy can mint more units**:

| Policy type | Who can mint | Result |
| --- | --- | --- |
| `sig` (your key) | only you | supply under your control |
| time-locked | anyone while the window is open | after expiry nobody can mint or burn — supply frozen |
| one-shot (parameterised by a UTxO reference) | exactly one execution, while that UTxO is spent | fixed supply by construction |
| no real restriction | anyone, forever | worthless token |

Design the policy before the ticker: decide the supply rule first, then derive the policy id, and only then distribute the token.

## See also

- [cardano-cli Quickstart](cli-quickstart.md)
- [Building Transactions with cardano-cli](cli-transactions.md)
- [Your First Validator](../aiken/aiken-first-validator.md)
- [Tests & Common Patterns](../aiken/aiken-tests-patterns.md)
