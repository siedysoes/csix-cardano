# Connect a Wallet & Send ADA

Before a dApp can call a validator it must hold keys, read UTxOs and submit a transaction. This walkthrough creates a testnet wallet from the command line, funds it from the faucet, and sends ADA back to itself using Mesh — the same primitives the later script tutorials reuse.

## Project setup

```bash
npm init -y
npm install @meshsdk/core tsx
npm pkg set type=module   # lets the scripts below use top-level await
```

`tsx` runs TypeScript directly, so there is no build step: every file is launched with `npx tsx <file>`. If you skip `npm pkg set type=module`, wrap each script body in `async function main() { ... }` and call `main();` instead.

## Generate a testnet wallet

Create `generate-credentials.ts`:

```ts
import { MeshWallet } from "@meshsdk/core";
import fs from "node:fs";

const secret_key = MeshWallet.brew(true) as string;
fs.writeFileSync("me.sk", secret_key);

const wallet = new MeshWallet({
  networkId: 0,
  key: { type: "root", bech32: secret_key },
});
fs.writeFileSync("me.addr", (await wallet.getUnusedAddresses())[0]);
```

Run it with `npx tsx generate-credentials.ts`.

`MeshWallet.brew(true)` returns a bech32 root key (it starts with `xprv1`), which is written to `me.sk`. The wallet derives a testnet address from it and writes that to `me.addr` — the value you will paste into the faucet.

### networkId values

| Value | Network | Address prefix |
|-------|---------|----------------|
| `0` | Testnet (Preview / Preprod) | `addr_test1...` |
| `1` | Mainnet | `addr1...` |

Use `0` for everything in this repository. `1` derives mainnet addresses from the same key, which is how a test script silently starts moving real funds.

## Fund the address from the faucet

Open the Cardano faucet (docs.cardano.org/cardano-testnet/tools/faucet), choose **Preview Testnet**, paste the address from `me.addr`, and claim. The transfer usually lands within seconds; watch it arrive by searching the address on [preview.cardanoscan.io](https://preview.cardanoscan.io). *Faucet URLs, drip amounts and rate limits change — check the official Cardano testnet docs if the page has moved.*

## Configure the provider

Create a Blockfrost project for the Preview network, then export its id in the same shell you run the scripts in:

```bash
export BLOCKFROST_PROJECT_ID=preview...   # bash / zsh
$env:BLOCKFROST_PROJECT_ID = "preview..." # PowerShell
```

```ts
import { BlockfrostProvider } from "@meshsdk/core";

const projectId = process.env.BLOCKFROST_PROJECT_ID;
if (!projectId) throw new Error("Missing BLOCKFROST_PROJECT_ID");

const provider = new BlockfrostProvider(projectId);
```

The id prefix tells you which network the project points at, so a `mainnet...` id used with `networkId: 0` is a mistake worth catching early. *Blockfrost free-tier quotas are per project and change over time — verify current limits on their pricing page.*

## Send ADA

Create `send.ts` and run it with `npx tsx send.ts`:

```ts
import { BlockfrostProvider, MeshTxBuilder, MeshWallet } from "@meshsdk/core";
import fs from "node:fs";

const projectId = process.env.BLOCKFROST_PROJECT_ID;
if (!projectId) throw new Error("Missing BLOCKFROST_PROJECT_ID");
const provider = new BlockfrostProvider(projectId);

const wallet = new MeshWallet({
  networkId: 0,
  fetcher: provider,
  submitter: provider,
  key: { type: "root", bech32: fs.readFileSync("me.sk").toString() },
});

const utxos = await wallet.getUtxos();
const addr = (await wallet.getUsedAddresses())[0];

const txBuilder = new MeshTxBuilder({ fetcher: provider, submitter: provider });
await txBuilder
  .txOut(addr, [{ unit: "lovelace", quantity: "2000000" }])
  .changeAddress(addr)
  .selectUtxosFrom(utxos)
  .complete();

const signed = await wallet.signTx(txBuilder.txHex);
const txHash = await wallet.submitTx(signed);
console.log(`https://preview.cardanoscan.io/transaction/${txHash}`);
```

What each part does:

- `getUtxos()` fetches the wallet's spendable inputs; `getUsedAddresses()[0]` is a bech32 address to pay.
- `.txOut(...)` creates a 2 tADA output. One ADA is 1,000,000 lovelace, so amounts are always integers in lovelace.
- `.changeAddress(...)` plus `.selectUtxosFrom(...)` let the builder pick inputs and return the remainder minus fees.
- `.complete()` balances the transaction and produces `txBuilder.txHex`, an unsigned CBOR transaction; `signTx` returns the full signed transaction and `submitTx` broadcasts it, returning the tx hash.

## Browser wallet variant (CIP-30)

In a browser the user holds the keys, so the flow changes: discover wallets, connect, then let the extension sign and submit. Underneath, Mesh is calling the CIP-30 API that every compliant wallet injects as `window.cardano.<name>` — `enable()` returns an object with `getUsedAddresses()`, `signTx()` and `submitTx()`.

```ts
import { BlockfrostProvider, BrowserWallet, MeshTxBuilder } from "@meshsdk/core";

const provider = new BlockfrostProvider(projectId);

// 1. discover installed extensions
const installed = BrowserWallet.getInstalledWallets(); // [{ id, name, icon, version }]

// 2. connect — the extension shows an approval prompt
const wallet = await BrowserWallet.enable("eternl");

// 3. never assume the network the user is on
const networkId = await wallet.getNetworkId();
if (networkId !== 0) throw new Error("Switch the wallet to a testnet before continuing");

const address = (await wallet.getUsedAddresses())[0];
const utxos = await wallet.getUtxos();

// 5. build exactly as in the headless example
const txBuilder = new MeshTxBuilder({ fetcher: provider });
await txBuilder
  .txOut(address, [{ unit: "lovelace", quantity: "2000000" }])
  .changeAddress(address)
  .selectUtxosFrom(utxos)
  .complete();

// 6. the user approves the signature, then the wallet submits
const signed = await wallet.signTx(txBuilder.txHex);
const txHash = await wallet.submitTx(signed);
```

Only the fetcher is passed to the builder here: signing and broadcast both happen inside the wallet through CIP-30, using the extension's own connection. React apps usually skip this plumbing entirely and use `CardanoWallet` plus `useWallet` from `@meshsdk/react`.

*Mesh has been reorganizing its wallet classes across releases — if `BrowserWallet` is not exported by your installed version, check the current Mesh wallet docs for the replacement name. The CIP-30 flow above is unchanged.*

## Follow the transaction

Paste the printed hash into preview.cardanoscan.io. The transaction page shows inputs, outputs, the fee, and the balance change; a few seconds after submission the status moves from pending to confirmed.

## Safety rules for these examples

- Testnet only: keep `networkId: 0` and never export a `mainnet...` Blockfrost id alongside these scripts.
- `me.sk` is a plaintext private key on disk. It is a throwaway testnet key — never reuse it on mainnet, and never commit it.
- Keep `BLOCKFROST_PROJECT_ID` in the environment; project ids in source end up in version control.
- Confirm the recipient address before any mainnet experiment, and re-run the whole flow on testnet first.

## See also

- [Cardano Testnets](../fundamentals/cardano-testnets.md)
- [Transactions & Addresses](../fundamentals/transactions-and-addresses.md)
- [Building Transactions with cardano-cli](../cli/cli-transactions.md)
- [The Cardano dApp Stack](dapp-stack.md)
- [Lock & Redeem Script Funds](dapp-lock-redeem.md)
