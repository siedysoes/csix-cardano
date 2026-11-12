# The Cardano dApp Stack

A Cardano dApp is split into an on-chain half (validators) and an off-chain half (transaction building, chain queries, signing, UI). Knowing which layer owns which job keeps business logic in the right place and stops you from rebuilding infrastructure a provider already supplies.

## The five layers

| # | Layer | Where it runs | Typical tool | Responsibility |
|---|-------|---------------|--------------|----------------|
| 1 | On-chain validator | Every node, at spend time | Aiken, Plutus | Approve or reject a spend |
| 2 | Off-chain transaction builder | Your Node or browser process | Mesh `MeshTxBuilder` | Build, balance and serialize the tx |
| 3 | Data provider | Remote API | Blockfrost, Koios, Maestro | Read UTxOs, protocol parameters, datums |
| 4 | Wallet | Browser extension or headless key | CIP-30 API, `MeshWallet` | Hold keys, sign, submit |
| 5 | Frontend | Browser | React, `@meshsdk/react` | Collect input, show status |

### Layer 1: on-chain validators

Validators are written in Aiken and compile to Untyped Plutus Core. They run only when a transaction spends one of their UTxOs, and they can only return accept or reject — they cannot initiate actions or write to storage. Everything the script needs must arrive in the transaction: the datum on the spent UTxO, the redeemer from the spender, and any required signers.

### Layer 2: off-chain transaction builders

Nothing on-chain builds itself. Your code picks inputs, adds outputs, attaches datum or redeemer, sets the change address, balances fees and submits the result. Mesh's `MeshTxBuilder` exposes this as a chainable API, and the provider plugged into it resolves protocol parameters and UTxOs automatically.

### Layer 3: data providers

A Cardano node does not offer a convenient query API, so dApps ask a provider questions such as "which UTxOs does this address control?" and "what are the current protocol parameters?". Providers are also the usual route for submitting a raw transaction to the network.

### Layer 4: wallets

Wallets own the user's keys. In the browser they expose a CIP-30 object; in scripts you use a headless wallet such as `MeshWallet`. Either way, the wallet signs the transaction your builder produced and returns the signed CBOR.

### Layer 5: frontend

The frontend collects user intent (recipient, amount, which validator to call), calls the off-chain layer, and renders wallet prompts, pending states and explorer links. It should contain no transaction-building logic of its own.

### Wiring the layers together

```ts
import { BlockfrostProvider, MeshTxBuilder, MeshWallet } from "@meshsdk/core";

// Layer 3: provider reads chain state and submits transactions
const projectId = process.env.BLOCKFROST_PROJECT_ID;
if (!projectId) throw new Error("Missing BLOCKFROST_PROJECT_ID");
const provider = new BlockfrostProvider(projectId);

// Layer 4: headless wallet for scripts (throwaway testnet key)
const rootKeyBech32 = MeshWallet.brew(true) as string;
const wallet = new MeshWallet({
  networkId: 0, // 0 = testnet, 1 = mainnet
  fetcher: provider,
  submitter: provider,
  key: { type: "root", bech32: rootKeyBech32 },
});

// Layer 2: the builder assembles the transaction
const txBuilder = new MeshTxBuilder({ fetcher: provider, submitter: provider });
```

## Off-chain SDKs compared

| SDK | Language | Style | Best for |
|-----|----------|-------|----------|
| **Mesh** (`@meshsdk/core`) | TypeScript | React-friendly; wallet, tx builders and providers in one package | Web dApps and Node scripts — used in this repo |
| **Lucid** | TypeScript | Lightweight, provider-based | Small scripts and minimal browser apps |
| **PyCardano** | Python | Full-featured library | Backend services and data pipelines |
| **cardano-cli** | Shell | Manual JSON and CBOR plumbing | Learning, debugging, one-off operations |

### Why Mesh here

Mesh ships the wallet layer, the transaction builder and the providers in a single `@meshsdk/core` dependency, so a working example needs very little setup. Its React helpers (`@meshsdk/react`) provide connect buttons and hooks, while the same `MeshTxBuilder` runs headless under `npx tsx`.

*As of writing, Mesh publishes frequent releases — check `npm view @meshsdk/core version` and the official docs before pinning a version.*

## Data providers

| Provider | Authentication | Notes |
|----------|----------------|-------|
| Blockfrost | API key, read from `BLOCKFROST_PROJECT_ID` | REST plus indexer, free tier per project; the project id encodes the network (`preview...`, `preprod...`, `mainnet...`) |
| Koios | None | Open-source distributed REST API, no key needed to start |
| Maestro | API key | Managed indexer with extras such as webhooks and mempool data |

*Pricing, rate limits and free-tier quotas change often — verify each provider's current plans on its own site before depending on them.*

## Wallets and CIP-30

CIP-30 defines the bridge between a dApp page and a wallet extension. The wallet injects `window.cardano.<name>`; the dApp calls `enable()`, and the returned API exposes the methods used throughout this repo:

| CIP-30 method | Purpose |
|---------------|---------|
| `enable()` | Ask the user to connect; returns the API object |
| `getNetworkId()` | `0` testnet, `1` mainnet — never assume this |
| `getUsedAddresses()`, `getChangeAddress()` | Where funds live and where change goes |
| `getUtxos()`, `getCollateral()` | Inputs to build with; collateral is required for Plutus spends |
| `signTx(tx, partialSign)` | The user approves; witnesses or the full tx come back |
| `submitTx(tx)` | Broadcast a signed transaction, returns the tx hash |

Mesh wraps this in `BrowserWallet` for the browser, while `MeshWallet` implements the same method set headlessly for scripts.

## Testnet-first workflow

1. Work on a public testnet (Preview or Preprod) and confirm the network with `getNetworkId()`.
2. Send a trivial transaction first; only then connect the validator.
3. Inspect every result on a testnet explorer before trusting the code.
4. Keep keys and project ids in environment variables, never in the repository.
5. Point the same scripts at mainnet only after the flow is proven on testnet.

## Where this repo's examples fit

The on-chain half comes from Aiken: [Aiken Quickstart](../aiken/aiken-quickstart.md) produces the `plutus.json` blueprint that this section consumes. The off-chain half is Mesh throughout — [Connect a Wallet & Send ADA](dapp-connect-wallet.md) covers providers, wallets and a plain ADA transfer, while [Lock & Redeem Script Funds](dapp-lock-redeem.md) spends a real Plutus script with datum, redeemer and collateral.

## See also

- [The UTxO Model](../fundamentals/utxo-model.md)
- [Transactions & Addresses](../fundamentals/transactions-and-addresses.md)
- [Cardano Testnets](../fundamentals/cardano-testnets.md)
- [Aiken Quickstart](../aiken/aiken-quickstart.md)
- [Connect a Wallet & Send ADA](dapp-connect-wallet.md)
