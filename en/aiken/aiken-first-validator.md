# Your First Validator

A validator is the Cardano equivalent of a program stored at an address: it runs whenever someone tries to spend a UTxO locked by that script, and it either authorises or rejects the spend. This page builds a minimal `hello_world` validator, explains every piece of the current Aiken syntax, and shows how the compiled script becomes an address you can lock funds to.

## Datum, redeemer and context

Validation happens during transaction submission, driven by three inputs:

| Input | Set by | Role |
| --- | --- | --- |
| Datum | whoever locked the funds | configuration stored with the UTxO (e.g. the owner's key hash) |
| Redeemer | whoever is spending | the "argument" of this attempt (e.g. the message to supply) |
| Script context / `Transaction` | the ledger | the whole transaction: inputs, validity range, signatures, mint field |

## The validator

Create `validators/hello_world.ak`:

```aiken
use aiken/collection/list
use cardano/transaction.{OutputReference, Transaction}

pub type Datum {
  Owner(ByteArray),
}

pub type Redeemer {
  Message(ByteArray),
}

validator hello_world {
  spend(
    datum_opt: Option<Datum>,
    redeemer: Redeemer,
    _utxo: OutputReference,
    self: Transaction,
  ) {
    expect Some(Owner(owner)) = datum_opt
    expect Message(message) = redeemer
    message == #"48656c6c6f2c20576f726c6421" &&
      list.any(self.extra_signatories, fn(s) { s == owner })
  }
}
```

The byte string `#"48656c6c6f2c20576f726c6421"` is the hex encoding of `Hello, World!`. The validator succeeds only if the redeemer carries exactly that message and the transaction is signed by the owner recorded in the datum.

## Piece by piece

### Imports

`use aiken/collection/list` brings in `list.any`; `use cardano/transaction.{OutputReference, Transaction}` brings in the types used in the handler's signature. Imports are per-file, so a validator using list functions needs the first line even if it looks redundant.

### Datum and Redeemer types

Both are user-defined types. `Owner(ByteArray)` and `Message(ByteArray)` are single-field variants: wrapping the bytes in a constructor makes pattern matching explicit and leaves room for future variants (e.g. a `Close` redeemer).

### Handlers

A `validator` block contains one or more handlers whose names match Cardano's script purposes:

| Handler | Extra target argument (besides redeemer and `Transaction`) | Purpose |
| --- | --- | --- |
| `spend` | `Option<Datum>` first, then `OutputReference` | spending a script UTxO |
| `mint` | `PolicyId` | minting or burning assets |
| `withdraw` | `Credential` | withdrawing staking rewards |
| `publish` | `Certificate` | publishing delegation certificates |
| `vote` | `Voter` | voting on governance proposals |
| `propose` | `ProposalProcedure` | governance proposal guardrails |

A validator may implement only the handlers it needs; an `else(_ctx: ScriptContext)` fallback catches everything else, and with no explicit fallback Aiken defaults to rejecting.

### Why the datum is `Option<T>` — and what `expect` does

Nothing stops anyone from sending funds to your script address without attaching a datum, so the ledger hands the `spend` handler an `Option<Datum>`. The line `expect Some(Owner(owner)) = datum_opt` matches the value; if it is `None` (or a different shape), the `expect` fails and execution halts immediately, which rejects the transaction. It is the idiomatic way to state "this case is required".

### Returning `True` versus failing

The handler body is an expression that evaluates to a `Bool`. `True` authorises the spend; `False` rejects it. Halting early with a failed `expect` or with `fail @"reason"` also rejects, and is how you give a precise reason. `message == ... && list.any(...)` is the whole authorisation logic here: both conditions must hold.

### The last argument: the transaction context

Every handler ends with `self: Transaction`. That value is your view of the spending transaction: its `inputs`, the UTxO being consumed, the validity interval (`validity` — the slot range in which the transaction may be included), `extra_signatories` (the required signers the transaction must be signed by), the mint field, and more. Anything the ledger can check about the transaction is reachable from here, which is what makes validators powerful and what makes their size matter: execution is paid for in memory and CPU units.

## Where the script address comes from

`aiken build` compiles the validator to Plutus Core and writes it, together with its hash, to `plutus.json`. That hash is the script's credential: encoded with the network prefix it becomes a payment address (the same script always hashes to the same address).

```bash
aiken build
aiken blueprint convert > hello.script

cardano-cli conway address build \
  --payment-script-file hello.script \
  --testnet-magic 2 \
  --out-file hello.addr
```

Flag names for script files differ between cardano-cli versions, so confirm with `cardano-cli conway address build --help`. Changing any line of validator code changes the compiled code, the hash, and therefore the address.

## End-to-end flow

| Step | Action | Result |
| --- | --- | --- |
| 1 | Write `validators/hello_world.ak` | source in place |
| 2 | `aiken check` | compiles and runs tests, reports mem/cpu |
| 3 | `aiken build` | `plutus.json` with `compiledCode` and `hash` |
| 4 | Derive the script address | `addr_test1...` for preview/preprod |
| 5 | Lock (off-chain) | transaction paying ADA to the script address with an **inline datum** `Owner(<owner key hash>)` |
| 6 | Redeem (off-chain) | spend that UTxO with redeemer `Message(#"48656c6c6f2c20576f726c6421")`, marking the owner key hash as a required signer |

Step 6 works because `list.any(self.extra_signatories, ...)` reads exactly that required-signer list. If the owner hash is not among the signers — or the message differs by one byte — phase-2 validation fails and the transaction is rejected (you still pay the collateral/fee consequences of a failed script phase).

Off-chain code can be cardano-cli itself, Mesh, or PyCardano; the blueprint's `compiledCode` is what it embeds to reproduce this address and to attach the right datum and redeemer. See [Lock & Redeem Script Funds](../dapp/dapp-lock-redeem.md) for the transaction side.

## See also

- [Aiken Quickstart](aiken-quickstart.md)
- [Tests & Common Patterns](aiken-tests-patterns.md)
- [The UTxO Model](../fundamentals/utxo-model.md)
- [Lock & Redeem Script Funds](../dapp/dapp-lock-redeem.md)
