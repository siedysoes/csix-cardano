# Cardano Testnets

Cardano testnets are full copies of the network that run the same node software as mainnet but issue test ada, which has no value. Developing here first means bugs, bad transactions, and broken contracts cost nothing — every tool, contract, and integration should be proven on a testnet before it touches real funds.

## Why Develop on Testnets First

- **Test ada is worthless.** You can break things deliberately, iterate fast, and recover from mistakes for free.
- **Integration issues surface early:** address formats, fee and minimum-ADA math, validity timing, and script behavior all differ subtly from your local assumptions.
- **The same tooling works.** cardano-cli, wallets, explorers, and APIs all support testnets; only the network selection changes.
- **Testnets closely mirror mainnet**, especially pre-production, so behavior you verify there transfers.

## Pre-production vs Preview

| | Pre-production (preprod) | Preview |
|---|---|---|
| Testnet magic | `1` | `2` |
| Positioning | Late-stage, most mature test environment; resembles production | Early-stage; leads mainnet hard forks by at least four weeks (as of writing) |
| Upgrade schedule | Forks at approximately the same time as mainnet (within an epoch) | Receives upgrades first, for early testing of upcoming protocol versions |
| Epoch length | Mirrors mainnet (5 days) | 1 day (as of writing — verify) |
| Best for | Integration tests, CI pipelines, wallet/exchange/dApp checks before mainnet | Testing release candidates and upcoming hard forks early |

Both networks are long-lived but **are reset when an upgrade requires it**, so scripts, addresses, and balances can disappear after a reset. Check the current status of each environment on docs.cardano.org/cardano-testnets before relying on stored state.

## Getting Test Ada from the Faucet

The official faucet hands out test ada:

1. Find it from the documentation hub (docs.cardano.org → Testnets → Tools → faucet); the canonical URL is currently the [official testnets faucet page](https://docs.cardano.org/cardano-testnets/tools/faucet) — faucet URLs change, so verify rather than bookmarking blindly.
2. Choose the network, then submit your testnet address (`addr_test1...`) — or a pool ID if you are testing delegation.
3. The faucet may require verification or an issued **API key** to claim larger allocations, and quotas or rules change over time; confirm the current requirements on the page itself.
4. Return leftover test ada to the faucet when finished so others can use it.

Pre-production also exposes a documented REST endpoint for scripted top-ups (requires an API key):

```console
curl -X POST -s 'https://faucet.preprod.world.dev.cardano.org/send-money/YOURADDRESS?api_key=YOURAPIKEY'
```

## Explorers

| Network | Explorer |
|---|---|
| Pre-production | `preprod.cardanoscan.io` |
| Preview | `preview.cardanoscan.io` |

Explorers let you inspect a `txhash#index`, an address's UTxOs, certificates, and the current tip (slot, epoch, block). Explorer availability and domains change — verify current options through official docs or your provider's docs.

## Data Providers and APIs

| Provider | What it offers | Notes |
|---|---|---|
| Blockfrost | REST APIs per network, indexed data, submit endpoint | Free tier with rate limits (requests per day); verify current limits at blockfrost.io |
| Koios | Community-run REST API for queries and submissions | Free tier available; verify current limits and endpoints |

Pick endpoints that match your network (Blockfrost projects are created per network; Koios exposes separate preprod/preview hosts), and keep API keys out of client-side code.

## Network Magic in Commands

"Network magic" is the integer that identifies a testnet. It appears:

- On the command line: `--testnet-magic 1` (preprod), `--testnet-magic 2` (preview), while mainnet uses `--mainnet`.
- In node configuration and genesis files (testnet configs set `RequiresNetworkMagic: RequiresMagic`).
- In wallet network pickers and provider URLs, where you select preprod or preview explicitly.

```console
$ cardano-cli query tip --testnet-magic 1
$ cardano-cli query utxo --address $(cat payment.addr) --testnet-magic 1
$ cardano-cli address build --payment-verification-key-file payment.vkey \
    --stake-verification-key-file stake.vkey \
    --testnet-magic 1 --out-file payment.addr
```

The same commands on mainnet only swap the flag to `--mainnet` — mixing them up is the classic testnet mistake.

### Network selection cheat sheet

| Network | CLI flag | Address prefixes | Explorer | Funding |
|---|---|---|---|---|
| Mainnet | `--mainnet` | `addr1...`, `stake1...` | cardanoscan.io | Real ADA |
| Pre-production | `--testnet-magic 1` | `addr_test1...`, `stake_test1...` | preprod.cardanoscan.io | Faucet |
| Preview | `--testnet-magic 2` | `addr_test1...`, `stake_test1...` | preview.cardanoscan.io | Faucet |

## A Safe Testnet Workflow

1. Create keys and build an address for the intended network, passing the correct network flag.
2. Fund it from the faucet and confirm the balance with `cardano-cli query utxo` or an explorer.
3. Build, sign, and submit transactions; treat every error (fee, minimum ADA, missing witness) as a finding.
4. Exercise failure paths on purpose: expired validity range, wrong redeemer, insufficient collateral, script over budget.
5. Re-run the whole flow against pre-production in CI, and re-run it again after any network reset or upgrade.
6. Move to mainnet only by switching network selection — flags, endpoints, and keys — never by copying testnet state.

## Local and Private Testnets

When you need a deterministic environment with no faucet and no shared resets, the documentation covers running a local testnet on your own machine (docs.cardano.org → Testnets → Creating a local testnet). It is useful for integration tests that must run on demand and for experimenting with parameters before touching the public testnets.

## Safety Warnings

- **Never send real ADA to a testnet address.** Test and mainnet addresses are different strings (`addr_test1...` vs `addr1...`), but a mis-selected network or copied address loses the funds permanently.
- **Test ada has no value.** Do not build economics around it, and do not expect to convert it.
- **Faucet and tool links go stale.** Always start from docs.cardano.org (or cardano.org) rather than an old link from a tutorial.
- **Verify before you trust.** Network magic numbers, faucet rules, rate limits, and explorer domains are all fast-changing facts — confirm them on official docs as of writing.
- Use separate wallets or accounts per network to avoid mixing test and real funds by accident.

## See also

- [What Is Cardano](what-is-cardano.md)
- [cardano-cli Quickstart](../cli/cli-quickstart.md)
- [Building Transactions with cardano-cli](../cli/cli-transactions.md)
- [The Cardano dApp Stack](../dapp/dapp-stack.md)
- [Connect a Wallet & Send ADA](../dapp/dapp-connect-wallet.md)
