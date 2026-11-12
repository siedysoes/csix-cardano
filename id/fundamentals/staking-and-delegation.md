# Staking & Delegasi

Di Cardano, memegang ADA memungkinkan Anda ikut serta dalam konsensus tanpa menjalankan infrastruktur apa pun: Anda mendelegasikan hak stake ke sebuah pool yang memproduksi blok, dan reward mengalir mengikutinya. Delegasi bersifat non-kustodial — dana Anda tidak pernah meninggalkan dompet Anda — yang membuatnya secara fundamental berbeda dari menyetor ke dalam produk staking.

## Cara Proof of Stake Bekerja di Cardano

- **Stake** adalah ADA yang tersimpan di alamat yang stake credential-nya telah didelegasikan. Protokol membuat snapshot stake pada batas epoch dan memakainya untuk memberi bobot pada pemilihan pemimpin (lihat [Epoch, Slot & Waktu](epochs-and-time.md)).
- Setiap slot, sebuah pool dipilih melalui VRF dengan probabilitas sebanding dengan stake relatifnya; pool yang terpilih memproduksi blok dan memperoleh reward.
- **Stake pool** mengumpulkan bobot banyak delegator sehingga pemegang kecil menerima bagian yang stabil dan proporsional, alih-alih peluang bergaya lotre.

## Stake Pool

| Konsep | Arti |
|---|---|
| Operator | Menjalankan dan memelihara node produsen blok serta node relay; harus daring untuk bisa mint |
| Pool ID | Hash dari pool verification key operator; inilah yang Anda delegasikan |
| Pledge | ADA milik operator sendiri yang di-commit ke pool; memengaruhi reward melalui parameter pengaruh pledge (`a0`) dan menandakan keselarasan dengan delegator |
| Saturation | Ukuran pool ideal kira-kira *total active stake ÷ k*; di atasnya, reward per delegator menyusut |
| Parameter `k` | Jumlah target pool (`stakePoolTargetNum`, juga disebut `nOpt`), yang menetapkan ambang saturation itu; `k = 2160` saat tulisan ini dibuat — verifikasi nilai terkini |

Reward dirancang untuk menyeimbangkan kira-kira `k` pool yang sepenuhnya jenuh (saturated): susunan yang paling sehat adalah stake yang tersebar di banyak pool, bukan menumpuk di sedikit pool saja.

## Delegasi Bersifat Non-Kustodial

Mendelegasikan adalah sebuah pernyataan yang dicatat di on-chain, bukan sebuah transfer. Tiga fakta mengikutinya:

- **ADA Anda tetap di alamat Anda.** Anda dapat membelanjakannya, menerima lebih banyak, atau memindahkannya kapan saja; hanya hak stake yang melekat pada stake credential Anda yang berubah.
- **Operator pool tidak pernah bisa menyentuh dana Anda.** Mereka hanya menerima bobot delegation; pengeluaran tetap memerlukan kunci Anda.
- **Anda mendelegasikan satu kali per perubahan.** Beralih pool berbiaya satu transaksi sertifikat kecil.

Apa yang sebenarnya diposting delegation ke rantai:

1. Sebuah **registrasi stake address** (kredensial `stake1...` Anda), yang memerlukan deposit yang dapat dikembalikan — dompet menanganinya secara otomatis.
2. Sebuah **delegation certificate** yang menunjuk stake credential itu ke sebuah pool ID, yang berbiaya fee transaksi normal.

Karena registrasi dan delegation membutuhkan fee, dompet memulai dengan mengirim dana pertama Anda ke sebuah base address yang sudah membawa stake credential (yang belum terdaftar) itu.

## Reward di Batas Epoch

Reward mengalir dari protokol ke pool lalu ke Anda:

```text
epoch pot (tx fees + monetary expansion, minus treasury cut)
        └─▶ pool takes fixed cost, then margin %
                └─▶ remainder shared pro-rata by delegated stake
                        └─▶ credited to each delegator's reward address
```

| Langkah (angka ilustratif saja) | Nilai |
|---|---|
| Bagian pool dari reward epoch | 1,000 ADA |
| dikurangi fixed cost per epoch | 100 ADA |
| dikurangi margin: 2% dari sisa | 18 ADA |
| **Bagian delegator, dibagi pro-rata** | **882 ADA** |

Mekanisme kunci:

- Reward dihitung dan dibayarkan **pada batas epoch**, setelah jeda snapshot — harapkan jeda satu sampai dua epoch antara mendelegasikan dan mulai menghasilkan, dan verifikasi jadwal pastinya di docs.cardano.org.
- Reward menumpuk di **stake (reward) address** Anda dan otomatis dihitung sebagai stake di snapshot-snapshot berikutnya — compounding tidak memerlukan transaksi tambahan.
- Untuk membelanjakan reward, Anda mengajukan transaksi withdrawal; sampai saat itu, mereka terus menghasilkan.
- Pembayaran **tidak dijamin**: bergantung pada pool yang benar-benar terpilih dan berhasil mint blok yang ditugaskan kepadanya.

## Ketika Sesuatu Berjalan Salah

| Situasi | Apa yang terjadi pada Anda |
|---|---|
| Pool menjadi oversaturated | Anda memperoleh lebih sedikit per ADA — delegasikan ke pool yang berada di bawah saturation |
| Pool offline dan melewatkan slot kepemimpinan | Reward itu hilang begitu saja; **tidak ada slashing**, pokok Anda tidak tersentuh |
| Pool menaikkan margin atau biayanya | Reward bersih Anda turun; Anda dapat berpindah pool kapan saja |
| Anda membelanjakan ADA yang didelegasikan | Stake Anda berpindah bersama UTxO Anda di snapshot berikutnya |
| Pool pensiun | Delegasi Anda berakhir dengan aman; pilih pool baru (dompet mungkin memperingatkan Anda) |

## Fee Pool: Cost dan Margin

| Fee | Siapa yang menetapkannya | Efek |
|---|---|---|
| Fixed cost per epoch | Operator (dibatasi bawah oleh parameter protokol `minPoolCost`) | Diambil sebelum reward dibagikan |
| Margin (%) | Operator | Persentase operator atas reward yang tersisa |
| Pledge | ADA milik operator sendiri | Mengubah-ubah reward melalui faktor pengaruh pledge |

Selalu bandingkan saturation, margin, cost, pledge, dan performa blok terbaru — fee yang rendah berarti sedikit jika pool melewatkan blok-bloknya.

## Delegasi vs "Staking" di Rantai Lain

| Aspek | Delegasi Cardano | Sebagian sistem lain |
|---|---|---|
| Kustodi | Dana tidak pernah meninggalkan dompet Anda | Sering sebuah kontrak, kustodian, atau bursa yang menyimpannya |
| Lockup | Tidak ada — belanjakan kapan saja | Periode unbonding, jangka waktu tetap, atau antrean withdrawal |
| Slashing | Tidak ada; performa pool yang buruk hanya kehilangan reward | Beberapa rantai melakukan slashing pada stake yang didelegasikan |
| Minimum | Tidak ada minimum protokol (hanya ukuran min-UTxO biasa) | Validasi solo sering memerlukan minimum besar |
| Delegasi ulang | Satu transaksi sertifikat, efektif di snapshot berikutnya | Dapat mengharuskan menunggu selama lockup |

## Cara Mendelegasikan dengan Dompet

1. Instal dompet Cardano dan buat atau pulihkan sebuah dompet (saat tulisan ini dibuat, pilihan antara lain Lace, Eternl, Typhon, dan Flint — verifikasi ketersediaan terkini). Jaga seed phrase Anda.
2. Danai base address (`addr1...`) Anda dengan ADA.
3. Buka tampilan staking atau delegation dan bandingkan pool: saturation, margin, fixed cost, pledge, dan riwayat produksi blok.
4. Pilih sebuah pool dan tanda tangani transaksi yang dibangun dompet — transaksi itu berisi registrasi stake Anda (jika diperlukan) dan delegation certificate, plus sebuah fee kecil.
5. Tunggu batas epoch: snapshot dulu, lalu active stake, lalu reward; amati mereka tiba di stake address Anda.

## Menjalankan Pool Sendiri

Menjalankan pool berarti mengoperasikan sebuah produsen blok yang dikeraskan plus node relay, firewall dan manajemen kunci (kunci cold offline, rotasi KES dan sertifikat operasional), monitoring dan alerting, uptime yang berkelanjutan, serta modal pledge yang di-commit. Ini adalah pekerjaan infrastruktur dengan risiko operasional nyata terhadap reward orang lain — bukan proyek untuk pemula. Lihat bagian stake pool operator di docs.cardano.org jika Anda ingin jalur lengkapnya.

## Lihat juga

- [Apa Itu Cardano](what-is-cardano.md)
- [Epoch, Slot & Waktu](epochs-and-time.md)
- [Transaksi & Alamat](transactions-and-addresses.md)
- [Testnet Cardano](cardano-testnets.md)
