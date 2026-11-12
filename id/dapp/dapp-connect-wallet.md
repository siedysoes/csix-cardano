# Hubungkan Wallet & Kirim ADA

Sebelum sebuah dApp bisa memanggil validator, dApp itu harus memegang key, membaca UTxO, dan mengirim transaksi. Tutorial ini membuat wallet testnet dari command line, mengisi dana-nya dari faucet, dan mengirim ADA kembali ke dirinya sendiri menggunakan Mesh — primitif yang sama yang akan dipakai ulang oleh tutorial script berikutnya.

## Penyiapan proyek

```bash
npm init -y
npm install @meshsdk/core tsx
npm pkg set type=module   # lets the scripts below use top-level await
```

`tsx` menjalankan TypeScript secara langsung, sehingga tidak ada tahap build: setiap file dijalankan dengan `npx tsx <file>`. Jika Anda melewatkan `npm pkg set type=module`, bungkus setiap badan script dengan `async function main() { ... }` dan panggil `main();` sebagai gantinya.

## Membuat wallet testnet

Buat `generate-credentials.ts`:

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

Jalankan dengan `npx tsx generate-credentials.ts`.

`MeshWallet.brew(true)` mengembalikan root key berformat bech32 (diawali `xprv1`), yang ditulis ke `me.sk`. Wallet menurunkan alamat testnet dari key tersebut dan menulisnya ke `me.addr` — nilai yang akan Anda tempel ke faucet.

### Nilai networkId

| Nilai | Jaringan | Awalan alamat |
|-------|----------|---------------|
| `0` | Testnet (Preview / Preprod) | `addr_test1...` |
| `1` | Mainnet | `addr1...` |

Gunakan `0` untuk semua hal di repository ini. `1` menurunkan alamat mainnet dari key yang sama — itulah cara sebuah script tes diam-diam mulai memindahkan dana sungguhan.

## Mengisi alamat dari faucet

Buka faucet Cardano (docs.cardano.org/cardano-testnet/tools/faucet), pilih **Preview Testnet**, tempel alamat dari `me.addr`, dan klaim. Transfer biasanya mendarat dalam hitungan detik; pantau kedatangannya dengan mencari alamat di [preview.cardanoscan.io](https://preview.cardanoscan.io). *URL faucet, jumlah drip, dan rate limit berubah — periksa dokumentasi testnet Cardano resmi jika halaman tersebut sudah berpindah.*

## Mengonfigurasi provider

Buat proyek Blockfrost untuk jaringan Preview, lalu export id proyek tersebut di shell yang sama tempat Anda menjalankan script:

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

Awalan id memberi tahu Anda jaringan mana yang dituju proyek tersebut, sehingga id `mainnet...` yang dipakai bersama `networkId: 0` adalah kesalahan yang layak dideteksi sejak awal. *Kuota free tier Blockfrost berlaku per proyek dan berubah seiring waktu — verifikasi batas terkini di halaman pricing mereka.*

## Mengirim ADA

Buat `send.ts` dan jalankan dengan `npx tsx send.ts`:

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

Apa fungsi tiap bagiannya:

- `getUtxos()` mengambil input yang bisa dibelanjakan wallet; `getUsedAddresses()[0]` adalah alamat bech32 untuk pembayaran.
- `.txOut(...)` membuat output senilai 2 tADA. Satu ADA sama dengan 1.000.000 lovelace, sehingga jumlah selalu berupa bilangan bulat dalam lovelace.
- `.changeAddress(...)` plus `.selectUtxosFrom(...)` memungkinkan builder memilih input dan mengembalikan sisa yang dikurangi fee.
- `.complete()` menyeimbangkan transaksi dan menghasilkan `txBuilder.txHex`, transaksi CBOR yang belum di-sign; `signTx` mengembalikan transaksi yang sudah di-sign lengkap, dan `submitTx` me-broadcast-nya sambil mengembalikan tx hash.

## Varian wallet browser (CIP-30)

Di browser, pengguna yang memegang key, sehingga alurnya berubah: temukan wallet, connect, lalu biarkan ekstensi yang menandatangani dan meng-submit. Di balik layar, Mesh memanggil API CIP-30 yang disuntikkan oleh setiap wallet yang patuh sebagai `window.cardano.<name>` — `enable()` mengembalikan objek yang memuat `getUsedAddresses()`, `signTx()`, dan `submitTx()`.

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

Di sini hanya fetcher yang diteruskan ke builder: sign dan broadcast keduanya terjadi di dalam wallet melalui CIP-30, memakai koneksi milik ekstensi itu sendiri. Aplikasi React biasanya melewatkan plumbing ini sama sekali dan memakai `CardanoWallet` plus `useWallet` dari `@meshsdk/react`.

*Mesh telah menata ulang kelas wallet-nya antar rilis — jika `BrowserWallet` tidak di-export oleh versi yang Anda pasang, periksa dokumentasi wallet Mesh terkini untuk nama penggantinya. Alur CIP-30 di atas tidak berubah.*

## Menelusuri transaksi

Tempel hash yang dicetak ke preview.cardanoscan.io. Halaman transaksi menampilkan input, output, fee, dan perubahan saldo; beberapa detik setelah submit, status berubah dari pending menjadi confirmed.

## Aturan keselamatan untuk contoh-contoh ini

- Testnet saja: pertahankan `networkId: 0` dan jangan pernah export id Blockfrost `mainnet...` bersama script-script ini.
- `me.sk` adalah key private plain text di disk. Ini key testnet sekali pakai — jangan pernah memakainya kembali di mainnet, dan jangan pernah meng-commit-nya.
- Simpan `BLOCKFROST_PROJECT_ID` di environment; project id yang tertulis di source pada akhirnya masuk ke version control.
- Konfirmasi alamat penerima sebelum eksperimen mainnet apa pun, dan jalankan ulang seluruh alur di testnet terlebih dahulu.

## Lihat juga

- [Testnet Cardano](../fundamentals/cardano-testnets.md)
- [Transaksi & Alamat](../fundamentals/transactions-and-addresses.md)
- [Membangun Transaksi dengan cardano-cli](../cli/cli-transactions.md)
- [Stack dApp Cardano](dapp-stack.md)
- [Kunci & Tebus Dana di Script](dapp-lock-redeem.md)
