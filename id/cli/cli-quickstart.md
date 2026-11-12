# Quickstart cardano-cli

`cardano-cli` adalah perintah baris perintah (command-line tool) resmi untuk Cardano: alat ini membuat key, menurunkan address, mem-query chain, serta membangun, menandatangani, dan mengirim transaction. Alat ini adalah klien dari `cardano-node` yang sedang berjalan, jadi langkah praktis pertama adalah menyiapkan koneksi ke node. Semua yang ada di panduan ini hanya berjalan di testnet.

## Apa itu cardano-cli

CLI mengekspos ledger sebagai sekumpulan subcommand. Dalam penggunaan sehari-hari Anda akan menyentuh empat kelompok:

| Kelompok perintah | Tujuan | Contoh |
| --- | --- | --- |
| `address` | pembuatan key, penurunan address | `cardano-cli address key-gen` |
| `conway query` | membaca status chain dari node | `cardano-cli conway query utxo ...` |
| `conway transaction` | membangun, menandatangani, dan mengirim transaction | `cardano-cli conway transaction build ...` |
| `debug` | memeriksa file antara dengan aman | `cardano-cli debug transaction view ...` |

Tidak ada framework maupun software wallet di tengahnya: apa yang dilaporkan CLI adalah apa yang dilaporkan node, sehingga alat ini bagus untuk mempelajari bagaimana Cardano bekerja sebenarnya.

## Mengapa membutuhkan cardano-node yang berjalan

Perintah yang membaca atau mengubah status chain (`query utxo`, `query protocol-parameters`, `transaction build`, `transaction submit`) harus meminta node tentang tampilan ledger saat ini: kumpulan UTxO, protocol parameter, era saat ini, dan ujung chain (chain tip). CLI menjangkau node melalui socket lokal, yang path-nya Anda berikan lewat `--socket-path`:

```bash
export CARDANO_NODE_SOCKET_PATH="$PWD/node.socket"
# or pass --socket-path node.socket on every query/submit command
```

Jika path socket salah atau node tidak berjalan, perintah-perintah ini langsung gagal dengan error koneksi. Perintah yang sepenuhnya lokal — `address key-gen`, `address build`, `transaction sign`, `transaction txid` — tetap berjalan tanpa node.

## Jalankan node testnet, bukan mainnet

Menyinkronkan mainnet dari nol berarti mengunduh dan memvalidasi seluruh chain: ratusan gigabyte penyimpanan dan proses sinkronisasi awal yang panjang. Node testnet memberi Anda perilaku CLI yang sama persis, tetapi dengan:

- penyimpanan jauh lebih kecil dan sinkronisasi awal lebih cepat,
- test ADA gratis dari faucet, sehingga kesalahan tidak berbiaya apa pun,
- margin keselamatan: typo tidak akan pernah menyentuh dana nyata.

Dua testnet publik dipelihara untuk tujuan ini: **preprod** (stabil, se-epoch dengan mainnet) dan **preview** (menghadirkan perubahan mendatang lebih dulu). Lihat [Testnet Cardano](../fundamentals/cardano-testnets.md) untuk perbedaan di antara keduanya.

## Instal

Saat artikel ini ditulis, opsi yang umum digunakan adalah:

| Jalur | Tempat | Catatan |
| --- | --- | --- |
| Binary pra-kompilasi | GitHub releases `IntersectMBO/cardano-node` | arsip berisi `cardano-cli` dan `cardano-node` untuk beberapa platform |
| Package manager | repositori distro/pihak ketiga | ketersediaan dan kebaruan bervariasi per platform |
| Build dari sumber / Nix | dokumentasi resmi | opsi paling berat, hanya diperlukan untuk pengembangan |

Periksa dokumentasi resmi cardano-node untuk petunjuk terkini, lalu verifikasi binary yang benar-benar Anda instal:

```bash
cardano-cli --version
cardano-cli --help
```

`--help` adalah otoritasnya: nama subcommand dan flag berubah antar rilis.

## Membuat pasangan key

```bash
cardano-cli address key-gen \
  --verification-key-file me.vk \
  --signing-key-file me.sk
```

Kedua file adalah objek JSON dengan field `type` dan `cborHex`. Perlakukan `me.sk` seperti kata sandi: jangan pernah meng-commit-nya, jangan pernah membagikannya, dan buat cadangannya. Verification key bersifat publik; hash-nya adalah yang akan disimpan sebuah validator sebagai "owner".

## Membuat address

```bash
cardano-cli conway address build \
  --testnet-magic 2 \
  --payment-verification-key-file me.vk \
  --out-file me.addr

cat me.addr
# addr_test1... (a bech32 address for the preview testnet)
```

`--testnet-magic 2` menunjuk ke preview. Ganti dengan `1` untuk menunjuk ke preprod, atau ganti dengan `--mainnet` ketika Anda sengaja bekerja terhadap mainnet.

## Query UTxO Anda

```bash
cardano-cli conway query utxo \
  --address "$(cat me.addr)" \
  --socket-path node.socket \
  --testnet-magic 2
```

Bentuk output yang dipersingkat:

```text
                           TxHash                                 TxIx      Amount
--------------------------------------------------------------------------------------
9f0a...c1                              0        100000000 lovelace
```

Setiap baris adalah satu UTxO: hash transaction, indeks output, dan nilainya. `#<TxHash>#<TxIx>` bersama-sama membentuk input reference yang akan Anda gunakan saat membangun transaction. Dua query lagi yang layak diketahui sejak awal:

```bash
cardano-cli conway query tip --socket-path node.socket --testnet-magic 2
cardano-cli conway query protocol-parameters --socket-path node.socket --testnet-magic 2 --out-file pparams.json
```

## Testnet magic

| Jaringan | `--testnet-magic` | Penggunaan umum |
| --- | --- | --- |
| Mainnet | `764824073` (gunakan `--mainnet` sebagai gantinya) | dana nyata — bukan untuk belajar |
| Preprod | `1` | testnet stabil, timing seperti mainnet |
| Preview | `2` | pratinjau fitur mendatang |

Angka magic tertanam dalam handshake jaringan: menunjuk sebuah perintah ke jaringan yang salah akan membuatnya gagal, bukan diam-diam mencampur chain.

## Awalan era

Perintah yang ditampilkan di sini memakai awalan era `conway`, misalnya `cardano-cli conway transaction build`. Awalan tersebut memilih kumpulan aturan dan format dari sebuah era ledger. Rilis CLI yang lebih baru dapat memperkenalkan awalan era lain atau memindahkan perintah antar awalan, jadi periksa `cardano-cli --help` sebelum menyalin perintah dari tutorial mana pun — termasuk tutorial ini.

## Lihat juga

- [Membangun Transaksi dengan cardano-cli](cli-transactions.md)
- [Native Token & Minting](cli-native-tokens.md)
- [Testnet Cardano](../fundamentals/cardano-testnets.md)
- [Model UTxO](../fundamentals/utxo-model.md)
