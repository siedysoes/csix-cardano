# Tes & Pola Umum

Aiken dibekali tes berbasis unit dan property yang berjalan di mesin virtual yang sama dengan kode on-chain Anda, sehingga tes yang lulus benar-benar mengeksekusi tepat kode yang akan dieksekusi ledger. `aiken check` berfungsi ganda sebagai benchmark: ia mencetak unit memori dan CPU execution dari setiap tes — unit yang Anda bayar lewat fee. Halaman ini membahas sintaks tes, cara membaca laporan, serta pola-pola validator yang berulang.

## Kata kunci `test`

Sebuah tes adalah fungsi bernama tanpa argumen yang mengembalikan `Bool`; tes lulus ketika ia mengembalikan `True`:

```aiken
test addition() {
  1 + 1 == 2
}
```

Tes hidup di dalam module mana pun — bersisian dengan kode yang diuji adalah pilihan yang lazim — dan dikumpulkan serta dijalankan oleh `aiken check`. Tulislah sebagai asersi dengan `==`, `>=`, `!=` agar test runner dapat mencetak kedua operand saat salah satunya gagal.

### Kegagalan yang diharapkan

Untuk menyatakan bahwa sebuah jalur eksekusi ditolak, tandai tes dengan `fail`:

```aiken
test must_fail() fail {
  expect Some(result) = option_of_nothing()
  result == 0
}
```

Sebuah tes `fail` hanya lulus ketika tubuhnya gagal. Inilah alat yang tepat untuk kasus "redeemer ini harus ditolak".

## Property-based tests dengan `aiken/fuzz`

Alih-alih memakai contoh, sebuah property menyatakan apa yang harus berlaku untuk semua masukan. Fuzzer menghasilkan nilai pseudo-acak dan mengecilkan counterexample secara otomatis:

```aiken
use aiken/collection/list
use aiken/fuzz

test prop_reverse_twice(xs: List<Int> via fuzz.list(fuzz.int())) {
  list.reverse(list.reverse(xs)) == xs
}

test prop_sum_is_commutative(
  pair: (Int, Int) via fuzz.both(fuzz.int(), fuzz.int()),
) {
  let (a, b) = pair
  a + b == b + a
}
```

`fuzz.both(a, b)` menggabungkan dua fuzzer menjadi sebuah tuple fuzzer; `via` mengikat nilai yang dihasilkan ke argumennya. Library fuzz adalah sebuah package — tambahkan dengan `aiken add aiken-lang/fuzz --version v3` dan periksa tabel versi package itu terhadap versi compiler Anda di repository package.

## Memanggil validator dari sebuah tes

Handler dapat dipanggil sebagai fungsi dengan sintaks `{validator}.{handler}`, dengan parameter validator apa pun di depannya:

```aiken
test spend_succeeds() {
  hello_world.spend(
    Some(Owner(owner)),
    Message(#"48656c6c6f2c20576f726c6421"),
    OutputReference { transaction_id: "", output_index: 0 },
    Transaction { ..transaction.placeholder, extra_signatories: [owner] },
  )
}
```

Dua detail membuat ini bekerja: `transaction.placeholder` adalah sebuah `Transaction` jadi dari module `cardano/transaction` yang Anda timpa dengan sintaks record update, dan tes-tes di atas berada di file yang sama dengan validator-nya. Validator juga dapat diimpor oleh module tes (module yang tidak mengekspor apa pun), tetapi hanya sebagai import berkualifikasi.

## Membaca output `aiken check`

```text
┍━ hello_world ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│ PASS [mem: 32451, cpu: 11921833] spend_succeeds
│ · with traces
│ | redeemer checked
┕━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 1 tests | 1 passed | 0 failed
```

| Bagian laporan | Arti |
| --- | --- |
| `PASS` / `FAIL` | hasil tes; kegagalan menampilkan diff atau trace-nya |
| `mem: ...` | unit memori execution yang dikonsumsi tes |
| `cpu: ...` | unit CPU execution yang dikonsumsi tes |
| `tests / passed / failed` | total untuk module tersebut |

Execution unit penting karena ledger menghargainya ke dalam fee transaction dan membatasinya per transaction (`maxTxExUnits`). Tes yang memori/cpu-nya terus tumbuh adalah peringatan tentang biaya on-chain yang sesungguhnya — itulah sebabnya tes berfungsi ganda sebagai benchmark. Flag yang berguna (periksa `aiken check --help` untuk versi Anda): `-m` untuk menjalankan sebagian tes, `--max-success` untuk menjalankan lebih banyak sampel property, `--trace-level silent` untuk membuang trace saat melakukan benchmark.

## Trace untuk debugging

Validator biasanya hanya melaporkan ya/tidak, jadi Aiken memberi Anda trace:

```aiken
trace @"checking redeemer"

message == #"48656c6c6f2c20576f726c6421" &&?
  list.any(self.extra_signatories, fn(s) { s == owner })
```

- `trace @"msg"` mengirimkan pesan secara tanpa syarat ketika baris itu tercapai.
- akhiran `?` (`trace-if-false`) hanya men-trace ketika ekspresi mengevaluasi ke `False`, yang cocok untuk validator yang ditulis sebagai rantai persyaratan.
- `aiken check` menyimpan trace secara default; `aiken build` menghapusnya kecuali Anda memberikan `--trace-level verbose`, sehingga trace tidak berbiaya apa pun di produksi.

## Pola umum

| Pola | Bentuk kodenya |
| --- | --- |
| Pemeriksaan owner | datum menyimpan sebuah key hash; mintalah hash itu ada di `self.extra_signatories`, dan si pembelanjakan harus mencantumkannya sebagai required signer |
| Batas waktu / vesting | baca interval `validity` transaction (batas slot bawah/atas) dan mintalah spend terjadi setelah (atau sebelum) slot tertentu |
| Validator terparameterisasi | `validator my_script(param: Type)` — parameter dibakat ke dalam kode yang dikompilasi, sehingga setiap instance memiliki script hash dan address-nya sendiri |
| Minting one-shot | parameterisasi validator dengan sebuah `OutputReference` dan assert di `mint` bahwa UTxO ini dibelanjakan oleh transaction; sebuah UTxO hanya bisa dibelanjakan sekali, sehingga minting terjadi sekali |
| Script multi-purpose | definisikan handler `spend`, `mint`, ... sesuai kebutuhan ditambah sebuah fallback `else(_ctx: ScriptContext)` yang selalu gagal |

## Tips desain

- Jaga logika on-chain tetap kecil: setiap baris adalah execution unit. Validasilah hanya hal yang bisa divalidasi oleh ledger.
- Lakukan sisanya secara off-chain — pengurutan, pencarian, format, pemeriksaan kewarasan — sebelum transaction pernah dibangun.
- Pecah validator menjadi fungsi helper murni dan uji unit masing-masing; uji penghubung handler-nya dengan beberapa kasus end-to-end.
- Gunakan `expect` untuk bentuk yang wajib dan trace (`trace`, `?`) untuk mendiagnosis penolakan; ingat bahwa trace dihapus dari validator yang sudah dibangun secara default.
- Jalankan `aiken check` setelah setiap perubahan dan perhatikan mem/cpu; jalankan `aiken build` sebelum menyerahkan blueprint ke kode off-chain.

## Contoh terperinci: tes untuk `hello_world`

Tambahkan tes-tes berikut ke `validators/hello_world.ak` (file yang sama dengan validator pada [Validator Pertama Anda](aiken-first-validator.md)):

```aiken
use cardano/transaction.{OutputReference, Transaction}

const owner: ByteArray = #"00000000000000000000000000000000000000000000000000000000"

test hello_world_succeeds() {
  hello_world.spend(
    Some(Owner(owner)),
    Message(#"48656c6c6f2c20576f726c6421"),
    OutputReference { transaction_id: "", output_index: 0 },
    Transaction { ..transaction.placeholder, extra_signatories: [owner] },
  )
}

test hello_world_rejects_wrong_message() fail {
  hello_world.spend(
    Some(Owner(owner)),
    Message(#"00"),
    OutputReference { transaction_id: "", output_index: 0 },
    Transaction { ..transaction.placeholder, extra_signatories: [owner] },
  )
}

test hello_world_requires_owner_signature() fail {
  hello_world.spend(
    Some(Owner(owner)),
    Message(#"48656c6c6f2c20576f726c6421"),
    OutputReference { transaction_id: "", output_index: 0 },
    transaction.placeholder,
  )
}
```

Tes pertama membuktikan jalur bahagia: pesan yang benar, owner ada di antara extra signatories, dan ia melaporkan biaya mem/cpu untuk jalur tersebut. Dua tes berikutnya membuktikan guard-nya — pesan yang salah harus gagal, dan transaction tanpa tanda tangan wajib milik owner harus gagal meski pesannya benar. Bersama-sama, keduanya menutupi kedua sisi `&&` di validator.

## Lihat juga

- [Validator Pertama Anda](aiken-first-validator.md)
- [Quickstart Aiken](aiken-quickstart.md)
- [Membangun Transaksi dengan cardano-cli](../cli/cli-transactions.md)
- [Kunci & Tebus Dana di Script](../dapp/dapp-lock-redeem.md)
