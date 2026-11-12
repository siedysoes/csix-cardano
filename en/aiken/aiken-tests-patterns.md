# Tests & Common Patterns

Aiken ships with unit and property-based tests that run on the same virtual machine as your on-chain code, so a passing test exercises the exact code the ledger will execute. `aiken check` doubles as a benchmark: it prints the memory and CPU execution units of every test, which are the units you pay for in fees. This page covers the test syntax, how to read the report, and the recurring validator patterns.

## The `test` keyword

A test is a named function with no arguments that returns a `Bool`; it passes when it returns `True`:

```aiken
test addition() {
  1 + 1 == 2
}
```

Tests live inside any module — next to the code they exercise is the usual choice — and are collected and run by `aiken check`. Write them as assertions with `==`, `>=`, `!=` so the test runner can print both operands when one fails.

### Expected failures

To assert that an execution path is rejected, mark the test with `fail`:

```aiken
test must_fail() fail {
  expect Some(result) = option_of_nothing()
  result == 0
}
```

A `fail` test passes only when its body fails. It is the right tool for "this redeemer must be refused" cases.

## Property-based tests with `aiken/fuzz`

Instead of examples, a property states what must hold for all inputs. Fuzzers generate pseudo-random values and shrink counterexamples automatically:

```aiken
use aiken/collection/list
use aiken/fuzz

test prop_reverse_twice(xs: List<Int> via fuzz.list(fuzz.int())) {
  list.reverse(list.reverse(xs)) == xs
}

test prop_sum_is_commutative(
  pair: (Int, Int) via fuzz.both(fuzz.int(), fuzz.int()),
) {
  let (a, b) = pair
  a + b == b + a
}
```

`fuzz.both(a, b)` combines two fuzzers into a tuple fuzzer; `via` binds the generated value to the argument. The fuzz library is a package — add it with `aiken add aiken-lang/fuzz --version v3` and check that version table against your compiler version in the package's repository.

## Calling a validator from a test

Handlers can be invoked as functions using `{validator}.{handler}`, with any validator parameters first:

```aiken
test spend_succeeds() {
  hello_world.spend(
    Some(Owner(owner)),
    Message(#"48656c6c6f2c20576f726c6421"),
    OutputReference { transaction_id: "", output_index: 0 },
    Transaction { ..transaction.placeholder, extra_signatories: [owner] },
  )
}
```

Two details make this work: `transaction.placeholder` is a ready-made `Transaction` from the `cardano/transaction` module that you override with record update syntax, and the tests above sit in the same file as the validator. Validators can also be imported by test modules (modules that export nothing), but only as qualified imports.

## Reading `aiken check` output

```text
┍━ hello_world ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│ PASS [mem: 32451, cpu: 11921833] spend_succeeds
│ · with traces
│ | redeemer checked
┕━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 1 tests | 1 passed | 0 failed
```

| Part of the report | Meaning |
| --- | --- |
| `PASS` / `FAIL` | test result; failures show the diff or the traces |
| `mem: ...` | memory execution units consumed by the test |
| `cpu: ...` | CPU execution units consumed by the test |
| `tests / passed / failed` | totals for the module |

Execution units matter because the ledger prices them into the transaction fee and caps them per transaction (`maxTxExUnits`). A test whose mem/cpu keeps growing is a warning about real on-chain cost, which is why tests double as benchmarks. Useful flags (check `aiken check --help` for your version): `-m` to run a subset of tests, `--max-success` to run more property samples, `--trace-level silent` to drop traces when benchmarking.

## Traces for debugging

Validators normally report only yes/no, so Aiken gives you traces:

```aiken
trace @"checking redeemer"

message == #"48656c6c6f2c20576f726c6421" &&?
  list.any(self.extra_signatories, fn(s) { s == owner })
```

- `trace @"msg"` emits a message unconditionally when reached.
- the `?` suffix (`trace-if-false`) traces only when the expression evaluates to `False`, which suits validators written as a chain of requirements.
- `aiken check` keeps traces by default; `aiken build` erases them unless you pass `--trace-level verbose`, so they cost nothing in production.

## Common patterns

| Pattern | Shape of the code |
| --- | --- |
| Owner check | datum holds a key hash; require it in `self.extra_signatories`, and the spender must list it as a required signer |
| Deadline / vesting | read the transaction's `validity` interval (lower/upper slot bounds) and require the spend to happen after (or before) a given slot |
| Parameterised validator | `validator my_script(param: Type)` — the parameter is baked into the compiled code, giving each instance its own script hash and address |
| One-shot minting | parameterise the validator with an `OutputReference` and assert in `mint` that this UTxO is spent by the transaction; a UTxO can be spent once, so minting happens once |
| Multi-purpose script | define `spend`, `mint`, ... handlers as needed plus an `else(_ctx: ScriptContext)` fallback that fails |

## Design tips

- Keep on-chain logic small: every line is execution units. Validate what only the ledger can validate.
- Do the rest off-chain — sorting, lookups, formatting, sanity checks — before a transaction is ever built.
- Split validators into pure helper functions and unit-test them individually; test the handler wiring with a couple of end-to-end cases.
- Use `expect` for required shapes and traces (`trace`, `?`) for diagnosing rejections; remember traces are erased from built validators by default.
- Run `aiken check` after every change and watch mem/cpu; run `aiken build` before handing the blueprint to off-chain code.

## Worked example: tests for `hello_world`

Add these tests to `validators/hello_world.ak` (same file as the validator shown in [Your First Validator](aiken-first-validator.md)):

```aiken
use cardano/transaction.{OutputReference, Transaction}

const owner: ByteArray = #"00000000000000000000000000000000000000000000000000000000"

test hello_world_succeeds() {
  hello_world.spend(
    Some(Owner(owner)),
    Message(#"48656c6c6f2c20576f726c6421"),
    OutputReference { transaction_id: "", output_index: 0 },
    Transaction { ..transaction.placeholder, extra_signatories: [owner] },
  )
}

test hello_world_rejects_wrong_message() fail {
  hello_world.spend(
    Some(Owner(owner)),
    Message(#"00"),
    OutputReference { transaction_id: "", output_index: 0 },
    Transaction { ..transaction.placeholder, extra_signatories: [owner] },
  )
}

test hello_world_requires_owner_signature() fail {
  hello_world.spend(
    Some(Owner(owner)),
    Message(#"48656c6c6f2c20576f726c6421"),
    OutputReference { transaction_id: "", output_index: 0 },
    transaction.placeholder,
  )
}
```

The first test proves the happy path: right message, owner among the extra signatories, and it reports the mem/cpu cost of that path. The next two prove the guards — a wrong message must fail, and a transaction without the owner's required signature must fail even when the message is correct. Together they cover both halves of the `&&` in the validator.

## See also

- [Your First Validator](aiken-first-validator.md)
- [Aiken Quickstart](aiken-quickstart.md)
- [Building Transactions with cardano-cli](../cli/cli-transactions.md)
- [Lock & Redeem Script Funds](../dapp/dapp-lock-redeem.md)
