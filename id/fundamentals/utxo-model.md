# Model UTxO

Cardano melacak kepemilikan lewat unspent transaction outputs (UTxO) alih-alih saldo akun. Pilihan ini bukan sekadar kosmetik: ia membentuk struktur transaksi, fee, paralelisme, dan cara smart contract ditulis, jadi memahaminya sejak awal mencegah sebagian besar kejutan "kenapa perilakunya tidak seperti Solidity".

## Model UTxO vs Model Akun

| Aspek | UTxO (Cardano, Bitcoin) | Model akun (Ethereum, ledger perbankan) |
|---|---|---|
| Di mana saldo berada | Jumlah total output tak terbelanja yang dimiliki sebuah alamat | Satu saldo per akun |
| Apa yang dilakukan transaksi | Mengonsumsi output utuh, membuat output baru | Mendebet dan mengkredit saldo |
| Membelanjakan dana yang sama dua kali | Tidak mungkin secara konstruksi: satu output hanya dibelanjakan sekali | Memerlukan logika nonce urutan per akun |
| Konkurensi | Output independen divalidasi secara paralel | Semua transaksi yang menyentuh satu akun diserialkan |
| State kontrak | Dibawa di datum output; script membaca transaksi | Penyimpanan global mutable bersama |
| Kembalian (change) | Harus dibuat secara eksplisit | Tidak diperlukan |
| Kepastian fee | Deterministik sejak awal (ukuran dan anggaran script) | Bergantung pada state dan pasar gas saat eksekusi |

## Anatomi Sebuah UTxO

Sebuah UTxO ditujukan oleh pasangan **(transaction hash, output index)**, ditulis `txhash#index`, misalnya `8c9a...e41b#0`. Setiap UTxO membawa:

- **value** — jumlah lovelace plus, opsional, native asset.
- **address** — "kunci ganda"-nya: siapa pun yang dapat memenuhinya (tanda tangan payment key atau sebuah script) boleh membelanjakan output tersebut.
- **datum** — data opsional yang dilampirkan untuk script: di-commit sebagai hash, atau, sejak era Babbage, disimpan inline di dalam output.

```text
UTxO reference: 8c9a...e41b#0
  address : addr1...x9k2      (payment credential, optionally + stake credential)
  value   : 120,000,000 lovelace + 5 mytoken (policy abc..., name 4d79...)
  datum   : inline {"owner": "addr1...x9k2", "deadline": 145600000}   (optional)
```

Kumpulan seluruh output yang saat ini tak terbelanja adalah **UTxO set** — state rantai yang disalin oleh setiap node.

## Input, Output, dan Kembalian

Sebuah transaksi:

1. **Mengonsumsi input** — referensi ke UTxO yang sudah ada. Setiap input harus masih tak terbelanja, dan transaksi harus memenuhi kunci ganda itu: tanda tangan dengan kunci yang diperlukan, atau jalankan dan loloskan script-nya.
2. **Membuat output** — UTxO baru yang dapat dibelanjakan transaksi berikutnya.
3. **Membayar fee** — lihat [Transaksi & Alamat](transactions-and-addresses.md) untuk rumus fee linear.

Nilai dipertahankan secara persis:

```text
sum(inputs) = sum(outputs) + fee
```

### Mengapa ada kembalian

Output dikonsumsi utuh, jadi pembayaran jarang sekali memakai input dengan pas. Jika Anda ingin mengirim 20 ADA dari sebuah UTxO 100 ADA, transaksi membuat 20 ADA untuk penerima, sebuah output kembalian kembali ke Anda, dan fee-nya:

```text
before                          transaction                    after
UTxO A  100 ADA  ────────────▶  inputs : A                     UTxO X  20 ADA → recipient
                                outputs: X, Y                  UTxO Y  79.83 ADA → your change
                                fee    : 0.17 ADA
```

## Contoh Terperinci: Dua Input, Tiga Output

Alice membayar 300 ADA ke penerima, mengunci 250 ADA di alamat script, dan memakai dua UTxO-nya untuk membiayai itu.

| Bagian | Referensi | Nilai (lovelace) |
|---|---|---|
| Input 1 | `8c9a...e41b#0` | 500,000,000 |
| Input 2 | `2f10...7d3c#1` | 250,000,000 |
| **Total masuk** | | **750,000,000** |
| Output 1 (pembayaran) | baru `a1f3...#0` | 300,000,000 |
| Output 2 (script) | baru `a1f3...#1` | 250,000,000 |
| Fee | | 181,000 (ilustratif) |
| Output 3 (kembalian) | baru `a1f3...#2` | 199,819,000 |

Cek: `300,000,000 + 250,000,000 + 181,000 + 199,819,000 = 750,000,000`. Output kembalian juga harus memenuhi aturan minimum-ADA untuk ukurannya, dan jika ada input yang dikunci script, transaksi harus membawa witness yang diminta script tersebut.

## Model Extended UTxO (eUTxO)

Scripting UTxO polos (seperti pada Bitcoin awal) hanya bisa memeriksa tanda tangan dan kondisi sederhana. Model **extended UTxO (eUTxO)**, diaktifkan bersama era Alonzo, menambahkan tiga komponen yang membuat kontrak serbaguna menjadi mungkin:

- **Datum** — data yang dilampirkan ke output yang dibelanjakan; di sinilah kontrak menyimpan state-nya (seorang pemilik, sebuah tenggat, saldo escrow).
- **Redeemer** — data yang diberikan oleh pembelanjakan di dalam transaksi untuk menyatakan aksi apa yang ia coba lakukan (redeem, cancel, bid).
- **Script context** — ledger menyerahkan kepada validator tampilan transaksi yang lengkap: validity range, signer yang diperlukan, fee, nilai yang di-mint, dan output yang dibelanjakan. Validator mengembalikan terima atau tolak.

```text
validator (spend) := fn (datum, redeemer, context) -> accept | reject

  require context.tx.signed_by(owner)             // who may spend
  require context.tx.validity.ends_before(deadline) // time constraint
  require redeemer.amount == datum.amount          // action-specific check
```

### Execution units

Penjalanan script diukur dalam **execution units** — anggaran terpisah untuk memori (`exUnitsMem`) dan langkah CPU (`exUnitsSteps`). Sebuah transaksi menyatakan jumlah maksimum yang akan ia belanjakan, harga ditetapkan oleh parameter protokol `executionUnitPrices`, dan biaya yang dihasilkan ditambahkan ke fee. Melebihi anggaran membuat script gagal.

### Determinisme dan validasi paralel

Karena validator adalah fungsi murni dari `(datum, redeemer, context)`, validasi bersifat **lokal dan deterministik**: Anda dapat mengevaluasi sebuah transaksi di luar rantai dan tahu sejak awal apakah ia akan berhasil, berapa biayanya, dan apa yang dilakukannya. Dua transaksi yang membelanjakan dua UTxO berbeda tidak pernah saling mengganggu, sehingga node dapat memvalidasinya secara paralel.

Sisi sebaliknya adalah kontensi: dua pengguna yang mencoba membelanjakan UTxO kontrak yang *sama* tidak bisa sama-sama berhasil, dan satu transaksi dapat membatalkan transaksi lainnya jika tiba lebih dulu. Desain yang baik menyebarkan pekerjaan ke banyak UTxO alih-alih menyalurkan semuanya melalui satu UTxO.

## Mengapa Ini Penting untuk Desain Smart Contract

- **Tidak ada state global bersama.** Segala yang dibutuhkan kontrak hidup di datum UTxO dan di dalam transaksi itu sendiri.
- **Kontinuitas nilai adalah tanggung jawab Anda.** Ledger menjamin input sama dengan output ditambah fee; validator juga harus memeriksa bahwa output-nya sendiri membayar nilai yang benar ke alamat yang benar.
- **Reentrancy sebagaimana dikenal pada model akun tidak punya padanan langsung** — sebuah script tidak bisa memanggil balik kontrak lain di tengah eksekusi; ia hanya memeriksa sebuah snapshot transaksi yang tetap.
- **Tenggat diperiksa terhadap validity range**, bukan terhadap panggilan jam nyata (wall-clock) — lihat [Epoch, Slot & Waktu](epochs-and-time.md).
- **Rancang untuk paralelisme.** Satu UTxO per pengguna atau per permintaan, atau pola batching, alih-alih satu output kontrak yang "panas".
- **Anggaran dan collateral.** Eksekusi script harus muat di dalam anggaran execution unit-nya, dan transaksi yang menyentuh script membawa collateral untuk berjaga jika script gagal setelah pemeriksaan phase-1.

## Lihat juga

- [Transaksi & Alamat](transactions-and-addresses.md)
- [Apa Itu Cardano](what-is-cardano.md)
- [Validator Pertama Anda](../aiken/aiken-first-validator.md)
- [Membangun Transaksi dengan cardano-cli](../cli/cli-transactions.md)
