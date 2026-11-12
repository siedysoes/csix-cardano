# Testnet Cardano

Testnet Cardano adalah salinan penuh dari jaringan yang menjalankan perangkat lunak node yang sama dengan mainnet tetapi menerbitkan ada uji (test ada), yang tidak bernilai. Mengembangkan di sini terlebih dahulu berarti bug, transaksi buruk, dan kontrak yang rusak tidak berbiaya apa pun — setiap tool, kontrak, dan integrasi seharusnya diuji di testnet sebelum menyentuh dana sungguhan.

## Mengapa Mengembangkan di Testnet Dahulu

- **Test ada tidak bernilai.** Anda dapat merusak sesuatu secara sengaja, beriterasi cepat, dan pulih dari kesalahan secara gratis.
- **Masalah integrasi muncul lebih awal:** format alamat, perhitungan fee dan minimum-ADA, timing validity, dan perilaku script semuanya sedikit berbeda dari asumsi lokal Anda.
- **Tooling yang sama bekerja.** cardano-cli, dompet, explorer, dan API semuanya mendukung testnet; hanya pemilihan jaringan yang berubah.
- **Testnet sangat mirip dengan mainnet**, khususnya pre-production, jadi perilaku yang Anda verifikasi di sana dapat ditransfer.

## Pre-production vs Preview

| | Pre-production (preprod) | Preview |
|---|---|---|
| Testnet magic | `1` | `2` |
| Posisi | Lingkungan uji tahap akhir dan paling matang; menyerupai produksi | Tahap awal; mendahului hard fork mainnet setidaknya empat minggu (saat tulisan ini dibuat) |
| Jadwal upgrade | Fork pada waktu yang hampir sama dengan mainnet (dalam satu epoch) | Menerima upgrade lebih dulu, untuk pengujian awal versi protokol yang akan datang |
| Panjang epoch | Mencerminkan mainnet (5 hari) | 1 hari (saat tulisan ini dibuat — verifikasi) |
| Paling cocok untuk | Pengujian integrasi, pipeline CI, pemeriksaan dompet/bursa/dApp sebelum mainnet | Menguji kandidat rilis dan hard fork yang akan datang secara lebih awal |

Kedua jaringan berumur panjang tetapi **di-reset ketika sebuah upgrade menuntutnya**, sehingga script, alamat, dan saldo dapat hilang setelah reset. Periksa status terkini setiap lingkungan di docs.cardano.org/cardano-testnets sebelum mengandalkan state yang tersimpan.

## Mendapatkan Test Ada dari Faucet

Faucet resmi membagikan test ada:

1. Temukan dari hub dokumentasi (docs.cardano.org → Testnets → Tools → faucet); URL kanonik saat ini adalah [halaman faucet testnet resmi](https://docs.cardano.org/cardano-testnets/tools/faucet) — URL faucet sering berubah, jadi verifikasi alih-alih mem-bookmark secara membabi buta.
2. Pilih jaringannya, lalu kirimkan alamat testnet Anda (`addr_test1...`) — atau sebuah pool ID jika Anda sedang menguji delegation.
3. Faucet mungkin memerlukan verifikasi atau sebuah **API key** yang diterbitkan untuk mengklaim alokasi lebih besar, dan kuota atau aturannya berubah seiring waktu; konfirmasi persyaratan terkini di halamannya sendiri.
4. Kembalikan test ada yang tersisa ke faucet setelah selesai agar orang lain dapat menggunakannya.

Pre-production juga menyediakan endpoint REST terdokumentasi untuk top-up berbasis skrip (memerlukan API key):

```console
curl -X POST -s 'https://faucet.preprod.world.dev.cardano.org/send-money/YOURADDRESS?api_key=YOURAPIKEY'
```

## Explorer

| Jaringan | Explorer |
|---|---|
| Pre-production | `preprod.cardanoscan.io` |
| Preview | `preview.cardanoscan.io` |

Explorer memungkinkan Anda memeriksa sebuah `txhash#index`, UTxO sebuah alamat, sertifikat, dan tip terkini (slot, epoch, blok). Ketersediaan dan domain explorer berubah — verifikasi pilihan terkini melalui dokumen resmi atau dokumentasi penyedia Anda.

## Penyedia Data dan API

| Penyedia | Apa yang ditawarkan | Catatan |
|---|---|---|
| Blockfrost | REST API per jaringan, data terindeks, endpoint submit | Tier gratis dengan batas rate (permintaan per hari); verifikasi batas terkini di blockfrost.io |
| Koios | REST API yang dikelola komunitas untuk kueri dan pengiriman | Tersedia tier gratis; verifikasi batas dan endpoint terkini |

Pilih endpoint yang cocok dengan jaringan Anda (proyek Blockfrost dibuat per jaringan; Koios menyediakan host terpisah preprod/preview), dan jauhkan API key dari kode sisi klien.

## Network Magic dalam Perintah

"Network magic" adalah bilangan bulat yang mengidentifikasi sebuah testnet. Ia muncul:

- Di command line: `--testnet-magic 1` (preprod), `--testnet-magic 2` (preview), sementara mainnet memakai `--mainnet`.
- Dalam konfigurasi node dan file genesis (konfigurasi testnet menyetel `RequiresNetworkMagic: RequiresMagic`).
- Dalam pemilih jaringan dompet dan URL penyedia, di mana Anda memilih preprod atau preview secara eksplisit.

```console
$ cardano-cli query tip --testnet-magic 1
$ cardano-cli query utxo --address $(cat payment.addr) --testnet-magic 1
$ cardano-cli address build --payment-verification-key-file payment.vkey \
    --stake-verification-key-file stake.vkey \
    --testnet-magic 1 --out-file payment.addr
```

Perintah yang sama di mainnet hanya menukar flag-nya ke `--mainnet` — mencampuradukannya adalah kesalahan testnet yang paling klasik.

### Lembar curang pemilihan jaringan

| Jaringan | Flag CLI | Prefiks alamat | Explorer | Pendanaan |
|---|---|---|---|---|
| Mainnet | `--mainnet` | `addr1...`, `stake1...` | cardanoscan.io | ADA sungguhan |
| Pre-production | `--testnet-magic 1` | `addr_test1...`, `stake_test1...` | preprod.cardanoscan.io | Faucet |
| Preview | `--testnet-magic 2` | `addr_test1...`, `stake_test1...` | preview.cardanoscan.io | Faucet |

## Alur Kerja Testnet yang Aman

1. Buat kunci dan bangun sebuah alamat untuk jaringan yang dituju, dengan meneruskan flag jaringan yang benar.
2. Danai dari faucet dan konfirmasikan saldo dengan `cardano-cli query utxo` atau sebuah explorer.
3. Bangun, tanda tangani, dan kirimkan transaksi; perlakukan setiap error (fee, minimum ADA, witness yang hilang) sebagai temuan.
4. Uji jalur kegagalan secara sengaja: validity range yang kedaluwarsa, redeemer yang salah, collateral tidak cukup, script melebihi anggaran.
5. Jalankan ulang seluruh alur terhadap pre-production di CI, dan jalankan ulang setelah setiap reset atau upgrade jaringan.
6. Beralih ke mainnet hanya dengan mengganti pemilihan jaringan — flag, endpoint, dan kunci — tidak pernah dengan menyalin state testnet.

## Testnet Lokal dan Pribadi

Ketika Anda memerlukan lingkungan deterministik tanpa faucet dan tanpa reset bersama, dokumentasi membahas cara menjalankan testnet lokal di mesin Anda sendiri (docs.cardano.org → Testnets → Creating a local testnet). Ini berguna untuk pengujian integrasi yang harus berjalan sesuai permintaan dan untuk bereksperimen dengan parameter sebelum menyentuh testnet publik.

## Peringatan Keamanan

- **Jangan pernah mengirim ADA sungguhan ke alamat testnet.** Alamat test dan mainnet adalah string yang berbeda (`addr_test1...` vs `addr1...`), tetapi jaringan yang salah pilih atau alamat yang salah salin akan menghilangkan dana selamanya.
- **Test ada tidak bernilai.** Jangan membangun ekonomi di sekitarnya, dan jangan berharap bisa mengonversinya.
- **Tautan faucet dan tooling bisa kedaluwarsa.** Selalu mulai dari docs.cardano.org (atau cardano.org), bukan dari tautan lama di sebuah tutorial.
- **Verifikasi sebelum percaya.** Angka network magic, aturan faucet, batas rate, dan domain explorer semuanya adalah fakta yang berubah cepat — konfirmasikan di dokumen resmi pada saat tulisan ini dibuat.
- Gunakan dompet atau akun terpisah per jaringan untuk menghindari mencampur dana test dan sungguhan secara tidak sengaja.

## Lihat juga

- [Apa Itu Cardano](what-is-cardano.md)
- [Quickstart cardano-cli](../cli/cli-quickstart.md)
- [Membangun Transaksi dengan cardano-cli](../cli/cli-transactions.md)
- [Stack dApp Cardano](../dapp/dapp-stack.md)
- [Menyambungkan Dompet & Mengirim ADA](../dapp/dapp-connect-wallet.md)
