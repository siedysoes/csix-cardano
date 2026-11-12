# Stack dApp Cardano

Sebuah dApp Cardano terbagi menjadi dua bagian: sisi on-chain (validator) dan sisi off-chain (pembangunan transaksi, query chain, sign, UI). Mengetahui lapisan mana yang memegang tugas tertentu menjaga logika bisnis tetap berada di tempat yang tepat dan mencegah Anda membangun ulang infrastruktur yang sudah disediakan oleh provider.

## Lima lapisan

| # | Lapisan | Berjalan di | Tool biasa | Tanggung jawab |
|---|---------|-------------|------------|----------------|
| 1 | On-chain validator | Setiap node, pada saat spend | Aiken, Plutus | Menerima atau menolak sebuah spend |
| 2 | Off-chain transaction builder | Proses Node atau browser Anda | Mesh `MeshTxBuilder` | Membangun, menyeimbangkan, dan menserialisasi tx |
| 3 | Data provider | API remote | Blockfrost, Koios, Maestro | Membaca UTxO, parameter protokol, datum |
| 4 | Wallet | Ekstensi browser atau key headless | CIP-30 API, `MeshWallet` | Menyimpan key, sign, submit |
| 5 | Frontend | Browser | React, `@meshsdk/react` | Mengumpulkan input, menampilkan status |

### Lapisan 1: validator on-chain

Validator ditulis dalam Aiken dan dikompilasi ke Untyped Plutus Core. Validator hanya berjalan ketika sebuah transaksi membelanjakan salah satu UTxO miliknya, dan hanya bisa mengembalikan terima atau tolak — validator tidak dapat memulai aksi maupun menulis ke penyimpanan. Semua yang dibutuhkan script harus tiba dalam transaksi: datum pada UTxO yang dibelanjakan, redeemer dari pihak yang membelanjakan, dan setiap required signer (penandatangan yang wajib ada).

### Lapisan 2: off-chain transaction builder

Tidak ada yang membangun dirinya sendiri di sisi on-chain. Kode Anda memilih input, menambah output, menyertakan datum atau redeemer, menetapkan alamat change, menyeimbangkan fee, dan submit hasilnya. `MeshTxBuilder` dari Mesh menyajikannya sebagai API yang bisa di-chain (chainable), dan provider yang tertancap di dalamnya otomatis me-resolve parameter protokol dan UTxO.

### Lapisan 3: data provider

Node Cardano tidak menyediakan query API yang nyaman, sehingga dApp bertanya kepada provider hal-hal seperti "UTxO mana yang dikendalikan alamat ini?" dan "berapa parameter protokol saat ini?". Provider juga merupakan jalur biasa untuk mengirim transaksi mentah ke jaringan.

### Lapisan 4: wallet

Wallet memegang key pengguna. Di browser, wallet mengekspos objek CIP-30; di script, Anda memakai wallet headless seperti `MeshWallet`. Dalam kedua kasus, wallet menandatangani transaksi yang dihasilkan builder Anda dan mengembalikan CBOR yang sudah di-sign.

### Lapisan 5: frontend

Frontend mengumpulkan intent pengguna (penerima, jumlah, validator mana yang dipanggil), memanggil lapisan off-chain, dan merender prompt wallet, status pending, serta link explorer. Frontend sebaiknya tidak memuat logika pembangunan transaksi apa pun.

### Menyambungkan lapisan-lapisan itu

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

## Perbandingan SDK off-chain

| SDK | Bahasa | Gaya | Paling cocok untuk |
|-----|--------|------|--------------------|
| **Mesh** (`@meshsdk/core`) | TypeScript | Ramah React; wallet, tx builder, dan provider dalam satu paket | dApp web dan script Node — dipakai di repo ini |
| **Lucid** | TypeScript | Ringan, berbasis provider | Script kecil dan aplikasi browser minimal |
| **PyCardano** | Python | Library berfitur lengkap | Layanan backend dan pipeline data |
| **cardano-cli** | Shell | Plumbing JSON dan CBOR manual | Belajar, debugging, operasi sekali jalan |

### Mengapa Mesh di sini

Mesh menghadirkan lapisan wallet, transaction builder, dan provider dalam satu dependency `@meshsdk/core`, sehingga contoh yang sudah berjalan hanya butuh setup sangat sedikit. Helper React-nya (`@meshsdk/react`) menyediakan tombol connect dan hooks, sementara `MeshTxBuilder` yang sama berjalan headless di bawah `npx tsx`.

*Saat artikel ini ditulis, Mesh merilis versi sangat sering — periksa `npm view @meshsdk/core version` dan dokumentasi resmi sebelum mengunci (pin) sebuah versi.*

## Data provider

| Provider | Autentikasi | Catatan |
|----------|-------------|---------|
| Blockfrost | API key, dibaca dari `BLOCKFROST_PROJECT_ID` | REST plus indexer, free tier per proyek; project id meng-encode jaringannya (`preview...`, `preprod...`, `mainnet...`) |
| Koios | Tidak ada | REST API terdistribusi open-source, tidak butuh key untuk mulai |
| Maestro | API key | Indexer terkelola dengan tambahan seperti webhook dan data mempool |

*Harga, rate limit, dan kuota free tier sering berubah — verifikasi paket terkini masing-masing provider di situsnya masing-masing sebelum bergantung pada mereka.*

## Wallet dan CIP-30

CIP-30 mendefinisikan jembatan antara halaman dApp dan ekstensi wallet. Wallet menyuntikkan `window.cardano.<name>`; dApp memanggil `enable()`, dan API yang dikembalikan mengekspos metode yang dipakai di seluruh repo ini:

| Metode CIP-30 | Fungsi |
|---------------|--------|
| `enable()` | Meminta pengguna untuk connect; mengembalikan objek API |
| `getNetworkId()` | `0` testnet, `1` mainnet — jangan pernah mengasumsikannya |
| `getUsedAddresses()`, `getChangeAddress()` | Di mana dana berada dan ke mana change mengalir |
| `getUtxos()`, `getCollateral()` | Input untuk membangun transaksi; collateral wajib untuk spend Plutus |
| `signTx(tx, partialSign)` | Pengguna menyetujui; witness atau tx lengkap dikembalikan |
| `submitTx(tx)` | Broadcast transaksi yang sudah di-sign, mengembalikan tx hash |

Mesh membungkusnya dalam `BrowserWallet` untuk browser, sementara `MeshWallet` mengimplementasikan set metode yang sama secara headless untuk script.

## Alur kerja testnet-dulu

1. Bekerja di testnet publik (Preview atau Preprod) dan konfirmasi jaringan dengan `getNetworkId()`.
2. Kirim transaksi kecil terlebih dulu; hanya setelah itu hubungkan validator-nya.
3. Inspeksi setiap hasil di explorer testnet sebelum mempercayai kode.
4. Simpan key dan project id di variabel lingkungan (environment), jangan pernah di repository.
5. Arahkan script yang sama ke mainnet hanya setelah alurnya teruji di testnet.

## Di mana contoh-contoh repo ini berada

Sisi on-chain-nya datang dari Aiken: [Quickstart Aiken](../aiken/aiken-quickstart.md) menghasilkan blueprint `plutus.json` yang dipakai bagian ini. Sisi off-chain-nya seluruhnya Mesh — [Hubungkan Wallet & Kirim ADA](dapp-connect-wallet.md) membahas provider, wallet, dan transfer ADA biasa, sedangkan [Kunci & Tebus Dana di Script](dapp-lock-redeem.md) membelanjakan script Plutus sungguhan dengan datum, redeemer, dan collateral.

## Lihat juga

- [Model UTxO](../fundamentals/utxo-model.md)
- [Transaksi & Alamat](../fundamentals/transactions-and-addresses.md)
- [Testnet Cardano](../fundamentals/cardano-testnets.md)
- [Quickstart Aiken](../aiken/aiken-quickstart.md)
- [Hubungkan Wallet & Kirim ADA](dapp-connect-wallet.md)
