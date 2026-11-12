# Kunci & Tebus Dana di Script

Ini adalah uji end-to-end dari sebuah dApp Cardano: validator Aiken yang dikompilasi ke Plutus, digerakkan dari TypeScript dengan Mesh. Anda akan mengunci ADA di balik datum yang menyebut pemiliknya, lalu membelanjakannya kembali dengan redeemer yang diterima validator — datum, redeemer, required signer, dan collateral dalam satu alur.

## Sebelum Anda memulai

- Aiken sudah terpasang dan validator sudah dibangun dengan `aiken build`, menghasilkan `plutus.json` — lihat [Quickstart Aiken](../aiken/aiken-quickstart.md).
- Proyek Node dengan `@meshsdk/core` dan `tsx` sudah terpasang, plus `type=module` — lihat [Hubungkan Wallet & Kirim ADA](dapp-connect-wallet.md).
- `me.sk` dari script kredensial, alamat testnet yang sudah terisi dana, dan `BLOCKFROST_PROJECT_ID` di-export di shell tempat Anda menjalankan script.
- Preview testnet di sepanjang artikel ini — tidak ada yang menyentuh mainnet di sini.

## Setup bersama: common.ts

`common.ts` memuat blueprint, menyambungkan provider dan wallet, dan mengekspor helper yang dipakai kedua script.

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

### Membaca blueprint

`aiken build` menulis `plutus.json`, sebuah blueprint CIP-57. `validators[0].compiledCode` adalah script dalam bentuk CBOR hex; `applyParamsToScript(..., [])` menerapkan daftar parameter kosong dan mengembalikan script yang siap dipakai. `serializePlutusScript({ code, version: "V3" })` meng-hash-nya menjadi alamat script `addr_test1...`. Jika blueprint Anda memuat beberapa validator, indeks-kan validator yang hendak Anda belanjakan.

## Mengunci dana: lock.ts

Datum harus cocok dengan yang diharapkan validator: sebuah constructor dengan satu field yang berisi public key hash dari wallet yang diizinkan membuka kunci.

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

### Memeriksa output yang terkunci

Buka hash yang dicetak di preview.cardanoscan.io. Output yang ditujukan ke `addr_test1...` membawa ikon datum kecil: mengkliknya menampilkan `{"constructor": 0, "fields": [{"bytes": "..."}]}` — signer hash Anda. Hanya hash yang disimpan di chain; datum lengkap ikut bersama pihak yang membelanjakannya.

## Menebus dana: unlock.ts

Ambil transaction hash yang dicetak oleh `lock.ts` dan berikan lewat command line. Spend harus menyertakan script, datum, redeemer yang diterima, tanda tangan asli dari required signer, dan collateral.

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

## Fungsi tiap bagian

| Bagian | Nilai di sini | Mengapa transaksi membutuhkannya |
|-------|---------------|----------------------------------|
| Datum | `mConStr0([signerHash])` | Disimpan bersama UTxO yang dikunci; validator membacanya untuk mengetahui **siapa** yang boleh membuka kunci |
| Redeemer | `mConStr0([stringToHex(message)])` | Disediakan oleh pihak yang membelanjakan; validator memeriksa **apa** yang sedang diklaim |
| `txInDatumValue` | Constructor yang sama seperti saat mengunci | Hanya hash datum yang ada di chain, jadi datum lengkap harus ikut dalam spend |
| `requiredSignerHash` | Payment key hash wallet | Menyatakan signer dan memaksa tanda tangan yang benar-benar asli |
| `txInCollateral` | UTxO murni-ADA dari wallet | Diambil jika validasi script gagal; pembayaran biasa tidak pernah membutuhkannya |
| min-UTxO | 1 tADA dikunci | Output yang membawa datum harus memenuhi nilai minimum protokol |

### Datum dan redeemer

Datum ditetapkan saat dana dikunci dan ikut bersama UTxO sampai UTxO itu dibelanjakan; redeemer dipilih pada saat spend. Validator Aiken Anda membandingkan keduanya, jadi kedua sisi percakapan harus memakai encoding yang sama — `mConStr0` membangun constructor dengan tag 0, dan `stringToHex` mengubah pesan menjadi array byte yang di-pattern-match oleh validator.

### requiredSignerHash vs extra_signatories

`.requiredSignerHash(signerHash)` menambahkan key hash ke daftar required signers transaksi — persis yang diekspos Plutus sebagai `tx_info_extra_signatories`. Mendeklarasikannya saja tidak cukup: ledger juga menolak transaksi kecuali key tersebut benar-benar menandatanganinya, sehingga `tx_info_signed_by` di validator hanya mengembalikan true untuk tanda tangan pemilik yang asli.

### Mengapa collateral diperlukan

Script Plutus berjalan di dalam anggaran CPU dan memori yang tetap. Jika validasi gagal, fee tetap dikenakan dan UTxO collateral yang dideklarasikan diambil, alih-alih sisa transaksi dianggap valid — hal ini membuat script yang sengaja dibuat gagal menjadi mahal, bukan gratis, yang melindungi jaringan dari spam denial-of-service murah. Collateral harus berupa UTxO murni-ADA (tanpa aset native) dan hanya wajib untuk transaksi yang mengeksekusi script.

### min-UTxO saat mengunci

Output yang membawa datum harus berisi setidaknya nilai UTxO minimum protokol, yang bertambah seiring ukuran datum dan alamatnya. Satu tADA dengan mudah menutupi datum kecil seperti ini; mengunci hanya segenggam lovelace akan ditolak bahkan sebelum validator Anda sempat berjalan.

## Menjalankannya

1. `npx tsx lock.ts` — mencetak hash transaksi deposit.
2. `npx tsx unlock.ts <txhash>` — membelanjakan UTxO tersebut kembali ke wallet.
3. Buka kedua hash di preview.cardanoscan.io: yang pertama menampilkan datum pada output kontrak, yang kedua menampilkan tab kontrak beserta redeemer dan script yang dieksekusi.

Jika penebusan gagal, periksa urutan operasi terlebih dahulu: datum yang Anda berikan harus sama dengan datum yang Anda kunci, redeemer harus cocok dengan validator, dan required signer harus berupa key yang tercatat dalam datum.

## Lihat juga

- [Quickstart Aiken](../aiken/aiken-quickstart.md)
- [Validator Pertama Anda](../aiken/aiken-first-validator.md)
- [Model UTxO](../fundamentals/utxo-model.md)
- [Hubungkan Wallet & Kirim ADA](dapp-connect-wallet.md)
- [Stack dApp Cardano](dapp-stack.md)
