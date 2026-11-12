# Transaksi & Alamat

Sebuah transaksi Cardano adalah bundel deterministik: ia mengonsumsi UTxO tertentu, membuat UTxO baru, membayar fee, dan bisa saja mem-mint token atau menuntut tanda tangan tambahan. Memahami setiap field — dan bagaimana alamat mengodekan siapa yang boleh membelanjakan versus siapa yang boleh stake — mengubah error build yang kriptik menjadi pemeriksaan yang dapat diprediksi.

## Anatomi Sebuah Transaksi

| Field | Peran |
|---|---|
| **inputs** | UTxO yang dikonsumsi; masing-masing memerlukan tanda tangan payment key atau witness script yang lolos |
| **outputs** | UTxO baru yang dibuat: alamat, nilai, datum atau datum hash opsional |
| **fee** | Lovelace yang dibayar untuk pemrosesan dan penyimpanan (dipool dan dibagikan di antara produsen blok) |
| **validity interval** | Jendela slot (`invalid_before` / `invalid_hereafter`); transaksi hanya valid di dalamnya |
| **required signers** | Hash verification-key tambahan yang harus menandatangani, meski mereka tidak membelanjakan apa pun |
| **collateral** | Input ADA yang disingkirkan jika script gagal setelah pemeriksaan phase-1; hanya ada ketika script terlibat |
| **mint** | Native asset yang dibuat (+) atau dibakar (-), diizinkan oleh script minting policy |
| **metadata** | Data opsional buatan pengguna, di-commit lewat hash di dalam witness set |

Transaksi yang ditandatangani adalah badan di atas ditambah **witnesses**: tanda tangan, script yang diperlukan, datum, dan redeemer.

## Fee: Model Linear

Fee bersifat linear terhadap ukuran transaksi:

```text
fee = a + b * size(tx)
```

- `a` — fee dasar tetap per transaksi: **155,381 lovelace** di mainnet (parameter protokol `minFeeB`, alias txFeeFixed).
- `b` — tarif per byte: **44 lovelace/byte** di mainnet (parameter protokol `minFeeA`, alias txFeePerByte).
- `size(tx)` — ukuran transaksi terserialisasi dalam byte.

Perhatikan keanehan penamaannya: di parameter protokol, `minFeeA` adalah istilah per byte dan `minFeeB` adalah istilah tetap — huruf-hurufnya berkebalikan dari rumus di atas. Keduanya adalah parameter protokol (saat tulisan ini dibuat; verifikasi nilai terkini). Contoh untuk transaksi 300 byte:

```text
fee = 155,381 + 44 * 300 = 168,581 lovelace  (~0.1686 ADA)
```

Transaksi script menambahkan biaya eksekusi berdasarkan execution unit memori dan CPU yang dideklarasikan, dengan harga yang ditetapkan parameter `executionUnitPrices`. Apa pun yang membesarkan transaksi — metadata lebih besar, inline datum besar, banyak aset — membesarkan fee secara proporsional.

## Minimum ADA per Output

Setiap output harus membawa jumlah minimum ADA yang diturunkan dari ukuran output yang terserialisasi: sebuah parameter protokol **coins-per-byte** dikalikan dengan ukuran tersebut (era Babbage memakai `coinsPerUTxOByte`; era sebelumnya memakai varian per-word). Di mainnet, angka ini adalah **4,310 lovelace per byte** (saat tulisan ini dibuat — verifikasi parameter protokol terkini).

Akibat yang perlu diingat:

- Output dengan inline datum besar, metadata tebal, atau banyak token berbeda membutuhkan lebih banyak ADA agar tetap valid.
- Aturannya mencegah output sampah mem-bloat UTxO set tanpa biaya — penyimpanan harus selalu dibayar.

## Alamat di Cardano

Sebuah alamat dikodekan bech32 dan memadatkan dua kredensial independen plus sebuah network tag:

- **Payment credential** — hash verification-key pembayaran (atau hash script): siapa yang boleh mengizinkan pengeluaran.
- **Stake credential** — hash verification-key stake (atau hash script): siapa yang menerima hak stake dan reward.
- **Network tag** — mainnet atau testnet, itulah alasan alamat dari jaringan berbeda tidak pernah cocok.

### Jenis alamat

| Jenis | Prefiks mainnet | Prefiks testnet | Kredensial | Penggunaan umum |
|---|---|---|---|---|
| Base | `addr1...` | `addr_test1...` | payment + stake | Alamat dompet standar: membelanjakan dan mendelegasikan |
| Enterprise | `addr1...` | `addr_test1...` | hanya payment | Script, bursa, layanan yang tidak melakukan staking |
| Stake (reward) | `stake1...` | `stake_test1...` | stake | Sertifikat delegation dan akun reward |

Prefiks mengikuti CIP-5. Karena alamat base dan enterprise berbagi prefiks yang sama, Anda tidak bisa membedakannya hanya dari prefiks — dekode alamatnya (dompet atau explorer mana pun bisa) untuk melihat apakah ada stake credential yang tertanam.

### Alamat script

Sebuah alamat script memakai **script hash** sebagai payment credential-nya, sehingga tidak ada kunci privat untuknya. Pengeluaran memerlukan penyediaan script itu sendiri (atau referensinya di on-chain), datum yang tersimpan bersama UTxO, sebuah redeemer yang menjelaskan aksinya, dan script context; transaksi juga harus menutup fee dan, untuk script Plutus, collateral. Inilah yang membuat "dana terkunci" menjadi mungkin: hanya logika, bukan pemegang kunci, yang menyetujui pengeluaran.

## Membaca txhash#index

Sebuah referensi UTxO ditulis `transaction_hash#index`:

```text
2f10c1...7d3c#1
└──── 64 hex chars ────┘ └ index of the output, in creation order
   (blake2b-256 of the transaction body)
```

`#0` adalah output pertama yang dibuat transaksi, `#1` output kedua, dan seterusnya. Salin string persis ini ke explorer, `cardano-cli query utxo`, atau panggilan API untuk memeriksa satu output tertentu.

## Transaksi dalam Bentuk Mirip JSON

Gambaran ilustratif yang mudah dibaca untuk pembayaran ADA polos (format wire sebenarnya adalah CBOR; cardano-cli dapat merender transaksi sebagai JSON):

```jsonc
{
  "inputs":  [ { "tx_hash": "8c9a...e41b", "index": 0 } ],
  "outputs": [
    { "address": "addr1qx9...recipient", "value": { "lovelace": 40000000 } },
    { "address": "addr1qw8...change",    "value": { "lovelace": 59831419 } }
  ],
  "fee": 168581,
  "validity": { "invalid_before": null, "invalid_hereafter": 145678300 },
  "required_signers": null,
  "collateral": null,
  "mint": null,
  "metadata": null
}
```

Cek saldo: input yang direferensikan bernilai `100,000,000` lovelace, yang sama dengan output `40,000,000 + 59,831,419` ditambah fee `168,581`. (Input hanyalah referensi; nilai dicari dari UTxO set.) Field `required_signers`, `collateral`, dan `mint` akan terisi untuk transaksi yang melibatkan signer tambahan, script Plutus, atau token native — lihat [Model UTxO](utxo-model.md) untuk apa yang diharapkan script, dan [Token Native & Minting](../cli/cli-native-tokens.md) untuk field mint dalam praktiknya.

## Lihat juga

- [Model UTxO](utxo-model.md)
- [Quickstart cardano-cli](../cli/cli-quickstart.md)
- [Membangun Transaksi dengan cardano-cli](../cli/cli-transactions.md)
- [Token Native & Minting](../cli/cli-native-tokens.md)
