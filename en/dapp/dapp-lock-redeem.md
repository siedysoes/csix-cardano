# Lock & Redeem Script Funds

This is the end-to-end test of a Cardano dApp: an Aiken validator compiled to Plutus, driven from TypeScript with Mesh. You will lock ADA behind a datum that names its owner, then spend it back with a redeemer the validator accepts — datum, redeemer, required signers and collateral in a single flow.

## Before you start

- Aiken installed and a validator built with `aiken build`, producing `plutus.json` — see [Aiken Quickstart](../aiken/aiken-quickstart.md).
- A Node project with `@meshsdk/core` and `tsx` installed, plus `type=module` — see [Connect a Wallet & Send ADA](dapp-connect-wallet.md).
- `me.sk` from the credential script, a funded testnet address, and `BLOCKFROST_PROJECT_ID` exported in the shell you run from.
- Preview testnet throughout — nothing here touches mainnet.

## Shared setup: common.ts

`common.ts` loads the blueprint, wires the provider and wallet, and exports the helpers both scripts use.

```ts
import fs from "node:fs";
import { BlockfrostProvider, MeshTxBuilder, MeshWallet, serializePlutusScript, UTxO } from "@meshsdk/core";
import { applyParamsToScript } from "@meshsdk/core-csl";
import blueprint from "./plutus.json";

const projectId = process.env.BLOCKFROST_PROJECT_ID;
if (!projectId) throw new Error("Missing BLOCKFROST_PROJECT_ID");
const provider = new BlockfrostProvider(projectId);

export const wallet = new MeshWallet({
  networkId: 0,
  fetcher: provider,
  submitter: provider,
  key: { type: "root", bech32: fs.readFileSync("me.sk").toString() },
});

export function getScript() {
  const scriptCbor = applyParamsToScript(blueprint.validators[0].compiledCode, []);
  const scriptAddr = serializePlutusScript({ code: scriptCbor, version: "V3" }).address;
  return { scriptCbor, scriptAddr };
}

export function getTxBuilder() {
  return new MeshTxBuilder({ fetcher: provider, submitter: provider });
}

export async function getUtxoByTxHash(txHash: string): Promise<UTxO> {
  const utxos = await provider.fetchUTxOs(txHash);
  if (utxos.length === 0) throw new Error("UTxO not found");
  return utxos[0];
}
```

### Reading the blueprint

`aiken build` writes `plutus.json`, a CIP-57 blueprint. `validators[0].compiledCode` is the script in CBOR hex; `applyParamsToScript(..., [])` applies an empty parameter list and returns the ready-to-use script. `serializePlutusScript({ code, version: "V3" })` hashes it into an `addr_test1...` script address. If your blueprint holds several validators, index the one you intend to spend.

## Locking funds: lock.ts

The datum must match what the validator expects: a constructor with one field holding the public key hash of the wallet allowed to unlock.

```ts
import { Asset, deserializeAddress, mConStr0 } from "@meshsdk/core";
import { getScript, getTxBuilder, wallet } from "./common";

const assets: Asset[] = [{ unit: "lovelace", quantity: "1000000" }];
const utxos = await wallet.getUtxos();
const walletAddress = (await wallet.getUsedAddresses())[0];
const { scriptAddr } = getScript();

// the datum names who may unlock: the payment key hash of this wallet
const signerHash = deserializeAddress(walletAddress).pubKeyHash;

const txBuilder = getTxBuilder();
await txBuilder
  .txOut(scriptAddr, assets)                      // park 1 tADA at the script
  .txOutDatumHashValue(mConStr0([signerHash]))    // constructor 0, one byte field
  .changeAddress(walletAddress)
  .selectUtxosFrom(utxos)
  .complete();

const signed = await wallet.signTx(txBuilder.txHex);
const txHash = await wallet.submitTx(signed);
console.log(`1 tADA locked at Tx ID: ${txHash}`);
```

### Inspect the locked output

Open the printed hash on preview.cardanoscan.io. The output addressed to `addr_test1...` carries a small datum icon: clicking it shows `{"constructor": 0, "fields": [{"bytes": "..."}]}` — your signer hash. Only the hash is stored on chain; the full datum travels with the spender.

## Redeeming funds: unlock.ts

Take the transaction hash printed by `lock.ts` and pass it on the command line. The spend must provide the script, the datum, an accepted redeemer, a real signature from the required signer, and collateral.

```ts
import { deserializeAddress, mConStr0, stringToHex } from "@meshsdk/core";
import { getScript, getTxBuilder, getUtxoByTxHash, wallet } from "./common";

const utxos = await wallet.getUtxos();
const walletAddress = (await wallet.getUsedAddresses())[0];
const collateral = (await wallet.getCollateral())[0];

const { scriptCbor } = getScript();
const signerHash = deserializeAddress(walletAddress).pubKeyHash;
const message = "Hello, World!";                 // must match what the validator checks

const txHashFromDeposit = process.argv[2];
if (!txHashFromDeposit) throw new Error("usage: npx tsx unlock.ts <txhash>");
const scriptUtxo = await getUtxoByTxHash(txHashFromDeposit);

const txBuilder = getTxBuilder();
await txBuilder
  .spendingPlutusScript("V3")                    // the validator was compiled as Plutus V3
  .txIn(scriptUtxo.input.txHash, scriptUtxo.input.outputIndex, scriptUtxo.output.amount, scriptUtxo.output.address)
  .txInScript(scriptCbor)
  .txInRedeemerValue(mConStr0([stringToHex(message)]))
  .txInDatumValue(mConStr0([signerHash]))
  .requiredSignerHash(signerHash)
  .txInCollateral(collateral.input.txHash, collateral.input.outputIndex, collateral.output.amount, collateral.output.address)
  .changeAddress(walletAddress)
  .selectUtxosFrom(utxos)
  .complete();

const signed = await wallet.signTx(txBuilder.txHex);
const txHash = await wallet.submitTx(signed);
console.log(`1 tADA unlocked at Tx ID: ${txHash}`);
```

## What each piece does

| Piece | Value here | Why the transaction needs it |
|-------|------------|------------------------------|
| Datum | `mConStr0([signerHash])` | Stored with the locked UTxO; the validator reads it to learn **who** may unlock |
| Redeemer | `mConStr0([stringToHex(message)])` | Supplied by the spender; the validator checks **what** is being claimed |
| `txInDatumValue` | Same constructor as the lock | Only the datum hash is on chain, so the full datum must ride along with the spend |
| `requiredSignerHash` | Wallet payment key hash | Declares the signer and forces a genuine signature |
| `txInCollateral` | A pure-ADA UTxO from the wallet | Taken if script validation fails; ordinary payments never need it |
| min-UTxO | 1 tADA locked | A datum-carrying output must satisfy the protocol's minimum value |

### Datum and redeemer

The datum is fixed when funds are locked and travels with the UTxO until it is spent; the redeemer is chosen at spend time. Your Aiken validator compares them, so both sides of the conversation must use the same encoding — `mConStr0` builds a constructor with tag 0, and `stringToHex` converts the message to the byte array the validator pattern-matches on.

### requiredSignerHash vs extra_signatories

`.requiredSignerHash(signerHash)` adds the key hash to the transaction's required signers, which is exactly what Plutus exposes as `tx_info_extra_signatories`. Declaring it alone is not enough: the ledger also rejects the transaction unless that key actually signed, so `tx_info_signed_by` in the validator returns true only for a real owner signature.

### Why collateral is needed

Plutus scripts run inside a fixed budget of CPU and memory. If validation fails, the fee is still charged and the declared collateral UTxO is collected instead of the rest of the transaction being valid — this makes deliberately failing scripts expensive rather than free, which protects the network from cheap denial-of-service spam. Collateral must be a pure-ADA UTxO (no native assets) and is only required for transactions that execute a script.

### min-UTxO when locking

An output carrying a datum must hold at least the protocol's minimum UTxO value, which grows with the size of the datum and its address. One tADA comfortably covers a small datum like this one; locking a bare handful of lovelace will be rejected before your validator ever runs.

## Running it

1. `npx tsx lock.ts` — prints the deposit transaction hash.
2. `npx tsx unlock.ts <txhash>` — spends that exact UTxO back to the wallet.
3. Open both hashes on preview.cardanoscan.io: the first shows the datum on the contract output, the second shows the contract tab with the redeemer and the executed script.

If the redeem fails, check the order of operations first: the datum you provide must equal the datum you locked, the redeemer must match the validator, and the required signer must be the key recorded in the datum.

## See also

- [Aiken Quickstart](../aiken/aiken-quickstart.md)
- [Your First Validator](../aiken/aiken-first-validator.md)
- [The UTxO Model](../fundamentals/utxo-model.md)
- [Connect a Wallet & Send ADA](dapp-connect-wallet.md)
- [The Cardano dApp Stack](dapp-stack.md)
