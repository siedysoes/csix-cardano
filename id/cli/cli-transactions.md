# Membangun Transaksi dengan cardano-cli

Setiap transfer Cardano mengikuti pipeline yang sama: pilih input, build, sign, periksa, submit, konfirmasi. Halaman ini menampilkan alur kerja lengkap dengan kumpulan perintah yang sudah diverifikasi terhadap node testnet, ditambah cara fee dan aturan min-UTxO muncul sebagai error. Semua perintah mengasumsikan `--testnet-magic 2` (preview) dan node yang berjalan serta terjangkau di `node.socket`.

## Ringkasan alur kerja

| Langkah | Tindakan | Kelompok perintah | Butuh node |
| --- | --- | --- | --- |
| 1 | Danai address dari faucet | browser | tidak |
| 2 | Cari UTxO yang bisa dibelanjakan | `conway query utxo` | ya |
| 3 | Bangun transaction-nya | `conway transaction build` | ya |
| 4 | Tandatangani | `conway transaction sign` | tidak |
| 5 | Periksa | `debug transaction view` | tidak |
| 6 | Kirim | `conway transaction submit` | ya |
| 7 | Konfirmasi dengan tx id | `conway transaction txid` | tidak |

## 1. Dapatkan test ADA dari faucet

Buka faucet testnet Cardano resmi (tautannya ada di dokumentasi testnet Cardano), tempel address dari `cat me.addr`, lalu minta test ADA. Dana akan tiba dalam waktu singkat dan bisa dilihat dengan `conway query utxo`. Test ADA tidak memiliki nilai; jangan pernah memakai mainnet untuk langkah-langkah ini.

## 2. Query UTxO yang akan dibelanjakan

```bash
cardano-cli conway query utxo \
  --address "$(cat me.addr)" \
  --socket-path node.socket \
  --testnet-magic 2
```

Pilih satu baris dan catat hash serta indeksnya — itu menjadi `<txhash>#<ix>`. Query ulang di kemudian hari juga merupakan cara Anda memastikan transaction sebelumnya sudah masuk.

## 3. Build

```bash
cardano-cli conway transaction build \
  --tx-in <txhash>#<ix> \
  --tx-out <addr>+<lovelace> \
  --change-address <addr> \
  --socket-path node.socket \
  --testnet-magic 2 \
  --out-file tx.raw
```

`build` membaca protocol parameter dan protocol state terkini dari node, menghitung fee, dan otomatis mengirim sisa input ke `--change-address`. `<addr>` adalah address Anda, misalnya `$(cat me.addr)`.

## 4. Sign

```bash
cardano-cli conway transaction sign \
  --tx-file tx.raw \
  --out-file tx.signed \
  --signing-key-file me.sk
```

Proses signing berjalan secara lokal; node tidak terlibat. Output-nya berisi transaction body beserta witness set-nya.

## 5. Periksa sebelum submit

```bash
cardano-cli debug transaction view --tx-file tx.signed
```

Perintah ini mencetak transaction dalam bentuk JSON yang mudah dibaca: input, output, fee, dan witness. Biasakan membacanya — inilah titik terakhir di mana alamat atau jumlah yang salah masih murah untuk diperbaiki.

## 6. Submit

```bash
cardano-cli conway transaction submit \
  --tx-file tx.signed \
  --socket-path node.socket \
  --testnet-magic 2
```

## 7. Konfirmasi dengan tx id

```bash
cardano-cli conway transaction txid --tx-file tx.signed
```

Cari hash tersebut di explorer untuk jaringan Anda — `preprod.cardanoscan.io` untuk magic 1, `preview.cardanoscan.io` untuk magic 2. Transaction menjadi final setelah block yang memuatnya diproduksi; meng-query ulang UTxO Anda akan menampilkan output-output baru.

## Fee

Fee ledger bersifat linear terhadap ukuran transaction yang diserialisasi:

```text
fee = a + b × size(tx)
```

| Parameter | Arti | Nilai umum |
| --- | --- | --- |
| `a` (`minFeeA`) | biaya per byte | 44 lovelace |
| `b` (`minFeeB`) | biaya tetap | 155381 lovelace |
| `size` | ukuran transaction dalam byte | bertambah seiring input, output, script |

Transaction sebesar 300 byte karena itu berbiaya `155381 + 44 × 300 = 168581` lovelace (sekitar 0,169 ADA). Protocol parameter bisa berubah, jadi baca nilai terkininya dengan `conway query protocol-parameters` alih-alih mempercayai konstanta. Untuk memperkirakan fee sebuah transaction yang Anda susun sendiri, gunakan `conway transaction calculate-min-fee`; flag-nya berbeda antar versi CLI, jadi periksa `cardano-cli conway transaction calculate-min-fee --help`.

## Membaca error min-UTxO

Setiap output transaction harus membawa jumlah minimum ADA, sebanding dengan banyaknya data (asset name, policy id, quantity) yang dikandungnya. Jika sebuah output terlalu sedikit, node akan menolak seluruh transaction dan melaporkan minimum yang diperlukan untuk output tersebut — formulasi persisnya bervariasi antar versi node, jadi baca angka yang dicetaknya daripada menghafal pesannya. Cara memperbaikinya:

- kirim lebih banyak ADA ke output yang memuat token,
- jangan memecah terlalu banyak asset ke dalam satu output,
- buang output kosong/dust yang sebenarnya tidak Anda perlukan.

Penolakan bergaya `FeeTooSmallUTxO` berbeda: itu berarti fee yang Anda hitung berada di bawah minimum yang diperlukan, biasanya karena Anda mengedit manual sebuah transaction `build-raw`.

## `build` versus `build-raw`

| | `transaction build` | `transaction build-raw` |
| --- | --- | --- |
| Menyeimbangkan input dan output | otomatis | Anda menghitung change sendiri |
| Fee | dihitung untuk Anda | Anda memberikannya secara eksplisit |
| Butuh node yang berjalan | ya | tidak (memakai `--protocol-params-file`) |
| Penggunaan umum | transaction sehari-hari | scripting, debugging, penyesuaian ukuran manual |

`build` adalah default yang tepat selama Anda belajar. `build-raw` ada untuk kasus yang membutuhkan kontrol setingkat byte, dan dipasangkan dengan `calculate-min-fee` untuk menentukan fee yang kemudian Anda hard-code.

## Contoh terperinci: mengirim 10 ADA

```bash
ADDR=$(cat me.addr)

# 1. find an input with at least ~10.2 ADA
cardano-cli conway query utxo --address "$ADDR" --socket-path node.socket --testnet-magic 2

# 2. build (send 10 ADA to yourself, change returns automatically)
cardano-cli conway transaction build \
  --tx-in 9f0a...c1#0 \
  --tx-out "$ADDR"+10000000 \
  --change-address "$ADDR" \
  --socket-path node.socket \
  --testnet-magic 2 \
  --out-file tx.raw

# 3. sign and inspect
cardano-cli conway transaction sign --tx-file tx.raw --out-file tx.signed --signing-key-file me.sk
cardano-cli debug transaction view --tx-file tx.signed

# 4. submit and confirm
cardano-cli conway transaction submit --tx-file tx.signed --socket-path node.socket --testnet-magic 2
cardano-cli conway transaction txid --tx-file tx.signed
```

`build` melaporkan perkiraan fee saat berhasil (sekitar 0,17 ADA untuk transaction sederhana). Setelah submit, txid dapat dibuka di `preview.cardanoscan.io`, dan `query utxo` berikutnya menunjukkan satu input terpakai serta dua output tercipta: pembayaran 10 ADA dan change Anda.

## Lihat juga

- [Quickstart cardano-cli](cli-quickstart.md)
- [Native Token & Minting](cli-native-tokens.md)
- [Transaksi & Alamat](../fundamentals/transactions-and-addresses.md)
- [Testnet Cardano](../fundamentals/cardano-testnets.md)
