# Validator Pertama Anda

Validator adalah padanan Cardano dari sebuah program yang disimpan di sebuah address: ia berjalan setiap kali seseorang mencoba membelanjakan UTxO yang dikunci oleh script tersebut, dan ia mengizinkan atau menolak spend itu. Halaman ini membangun validator `hello_world` yang minimal, menjelaskan setiap bagian sintaks Aiken terkini, dan menunjukkan bagaimana script yang dikompilasi menjadi sebuah address yang bisa Anda kunci dananya di situ.

## Datum, redeemer dan konteks

Validasi terjadi selama pengiriman transaction, didorong oleh tiga masukan:

| Masukan | Diatur oleh | Peran |
| --- | --- | --- |
| Datum | siapa pun yang mengunci dana | konfigurasi yang disimpan bersama UTxO (misalnya key hash owner) |
| Redeemer | siapa pun yang membelanjakan | "argumen" dari upaya ini (misalnya pesan yang harus diberikan) |
| Script context / `Transaction` | ledger | transaction secara utuh: input, rentang validity, tanda tangan, field mint |

## Validator

Buat `validators/hello_world.ak`:

```aiken
use aiken/collection/list
use cardano/transaction.{OutputReference, Transaction}

pub type Datum {
  Owner(ByteArray),
}

pub type Redeemer {
  Message(ByteArray),
}

validator hello_world {
  spend(
    datum_opt: Option<Datum>,
    redeemer: Redeemer,
    _utxo: OutputReference,
    self: Transaction,
  ) {
    expect Some(Owner(owner)) = datum_opt
    expect Message(message) = redeemer
    message == #"48656c6c6f2c20576f726c6421" &&
      list.any(self.extra_signatories, fn(s) { s == owner })
  }
}
```

Byte string `#"48656c6c6f2c20576f726c6421"` adalah encoding heksadesimal dari `Hello, World!`. Validator hanya berhasil jika redeemer membawa tepat pesan tersebut dan transaction ditandatangani oleh owner yang tercatat di datum.

## Bagian demi bagian

### Import

`use aiken/collection/list` mengimpor `list.any`; `use cardano/transaction.{OutputReference, Transaction}` mengimpor tipe-tipe yang dipakai dalam tanda tangan handler-nya. Import bersifat per file, sehingga validator yang memakai fungsi list membutuhkan baris pertama itu meskipun terlihat redundan.

### Tipe Datum dan Redeemer

Keduanya adalah tipe yang didefinisikan pengguna. `Owner(ByteArray)` dan `Message(ByteArray)` adalah varian ber satu field: membungkus byte dalam sebuah constructor membuat pattern matching menjadi eksplisit dan menyisakan ruang untuk varian-varian di masa depan (misalnya redeemer `Close`).

### Handler

Sebuah blok `validator` berisi satu atau lebih handler yang namanya cocok dengan script purpose di Cardano:

| Handler | Argumen target tambahan (selain redeemer dan `Transaction`) | Tujuan |
| --- | --- | --- |
| `spend` | `Option<Datum>` lebih dulu, lalu `OutputReference` | membelanjakan sebuah UTxO script |
| `mint` | `PolicyId` | melakukan mint atau burn asset |
| `withdraw` | `Credential` | menarik reward staking |
| `publish` | `Certificate` | menerbitkan sertifikat delegasi |
| `vote` | `Voter` | memberikan suara pada proposal tata kelola |
| `propose` | `ProposalProcedure` | pagar pengaman proposal tata kelola |

Sebuah validator boleh hanya mengimplementasikan handler yang ia perlukan; sebuah fallback `else(_ctx: ScriptContext)` menangkap sisanya, dan tanpa fallback eksplisit Aiken default-nya adalah menolak.

### Mengapa datum berupa `Option<T>` — dan apa yang dilakukan `expect`

Tidak ada yang menghalangi siapa pun mengirim dana ke script address Anda tanpa melampirkan datum, sehingga ledger menyerahkan `Option<Datum>` kepada handler `spend`. Baris `expect Some(Owner(owner)) = datum_opt` mencocokkan nilainya; jika nilainya `None` (atau bentuk yang berbeda), `expect` akan gagal dan eksekusi berhenti seketika, yang berarti menolak transaction. Itulah cara idiomatis untuk menyatakan "kasus ini wajib ada".

### Mengembalikan `True` versus gagal

Tubuh handler adalah sebuah ekspresi yang mengevaluasi ke `Bool`. `True` mengizinkan spend; `False` menolaknya. Berhenti lebih awal lewat `expect` yang gagal atau dengan `fail @"reason"` juga menolak, dan itulah cara Anda memberikan alasan yang tepat. `message == ... && list.any(...)` adalah seluruh logika otorisasi di sini: kedua kondisi harus terpenuhi.

### Argumen terakhir: konteks transaction

Setiap handler diakhiri dengan `self: Transaction`. Nilai tersebut adalah tampilan Anda atas transaction yang membelanjakan: `input`-nya, UTxO yang dikonsumsi, validity interval (`validity` — rentang slot di mana transaction boleh dimasukkan), `extra_signatories` (penandatangan wajib yang harus menandatangani transaction), field mint, dan lainnya. Apa pun yang dapat diperiksa ledger tentang transaction dapat diakses dari sini — itulah yang membuat validator menjadi kuat, dan yang membuat ukurannya menjadi penting: eksekusi dibayar dengan unit memori dan CPU.

## Dari mana script address berasal

`aiken build` mengompilasi validator ke Plutus Core dan menulisnya, beserta hash-nya, ke `plutus.json`. Hash tersebut adalah credential script: ketika dikodekan dengan awalan jaringan, ia menjadi sebuah payment address (script yang sama selalu menghasilkan hash ke address yang sama).

```bash
aiken build
aiken blueprint convert > hello.script

cardano-cli conway address build \
  --payment-script-file hello.script \
  --testnet-magic 2 \
  --out-file hello.addr
```

Nama flag untuk file script berbeda antar versi cardano-cli, jadi konfirmasikan dengan `cardano-cli conway address build --help`. Mengubah baris mana pun dari kode validator mengubah kode yang dikompilasi, hash-nya, dan karena itu address-nya.

## Alur end-to-end

| Langkah | Tindakan | Hasil |
| --- | --- | --- |
| 1 | Tulis `validators/hello_world.ak` | sumber sudah di tempatnya |
| 2 | `aiken check` | mengompilasi dan menjalankan tes, melaporkan mem/cpu |
| 3 | `aiken build` | `plutus.json` berisi `compiledCode` dan `hash` |
| 4 | Turunkan script address-nya | `addr_test1...` untuk preview/preprod |
| 5 | Kunci (off-chain) | transaction yang membayar ADA ke script address dengan **inline datum** `Owner(<owner key hash>)` |
| 6 | Tebus (off-chain) | belanjakan UTxO itu dengan redeemer `Message(#"48656c6c6f2c20576f726c6421")`, dengan menandai owner key hash sebagai required signer |

Langkah 6 berhasil karena `list.any(self.extra_signatories, ...)` membaca tepat daftar required-signer tersebut. Jika hash owner tidak ada di antara para penandatangan — atau pesannya berbeda satu byte pun — validasi fase 2 gagal dan transaction ditolak (Anda tetap menanggung konsekuensi collateral/fee dari fase script yang gagal).

Kode off-chain bisa berupa cardano-cli itu sendiri, Mesh, atau PyCardano; `compiledCode` dari blueprint adalah yang mereka sematkan untuk mereproduksi address ini dan melampirkan datum serta redeemer yang tepat. Lihat [Kunci & Tebus Dana di Script](../dapp/dapp-lock-redeem.md) untuk sisi transaction-nya.

## Lihat juga

- [Quickstart Aiken](aiken-quickstart.md)
- [Tes & Pola Umum](aiken-tests-patterns.md)
- [Model UTxO](../fundamentals/utxo-model.md)
- [Kunci & Tebus Dana di Script](../dapp/dapp-lock-redeem.md)
