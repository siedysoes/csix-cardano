# Quickstart Aiken

Aiken adalah bahasa modern bertipe statis untuk kontrak pintar Cardano yang dikompilasi ke Plutus Core — kode yang sebenarnya dieksekusi ledger selama validasi. Aiken penting karena satu toolchain mencakup seluruh loop on-chain: menulis validator, menguji mereka dengan laporan execution unit, dan menghasilkan blueprint (`plutus.json`) yang dikonsumsi oleh kode off-chain dan cardano-cli. Halaman ini menyiapkan loop tersebut di mesin Anda.

## Apa itu Aiken

File sumber Aiken (`.ak`) dikompilasi ke Untyped Plutus Core dan dijalankan di dalam validasi transaction di bawah anggaran memori dan CPU yang ketat. Bahasa ini memberi Anda pattern matching, tipe kustom, module, unit test dan property test bawaan, serta standard library — semuanya dirancang di sekitar batasan eksekusi on-chain.

## Instal

Jalur yang direkomendasikan adalah `aikup`, sebuah version manager kecil untuk toolchain Aiken. Saat artikel ini ditulis, petunjuk resmi (https://aiken-lang.org/installation-instructions) adalah:

| Jalur | Perintah |
| --- | --- |
| npm | `npm install -g @aiken-lang/aikup` |
| Homebrew | `brew install aiken-lang/tap/aikup` |
| curl (Linux/macOS) | `curl --proto '=https' --tlsv1.2 -LsSf https://install.aiken-lang.org \| sh` |
| PowerShell (Windows) | `powershell -c "irm https://windows.aiken-lang.org \| iex"` |

Setelah menginstal `aikup`, jalankan `aikup` untuk mengambil rilis Aiken terbaru. Verifikasi binary yang benar-benar Anda dapatkan:

```bash
aiken --version
aiken --help
```

Metode instalasi dan nomor versi berubah dengan cepat; halaman instalasi resmi dan `aiken --help` adalah otoritasnya.

## Membuat project

```bash
aiken new aiken-lang/hello-world
cd hello-world
```

Dokumentasi saat ini memakai `aiken new <owner>/<name>`; sebagian tutorial lama menampilkan `aiken new <project_name>`. Periksa `aiken --help` untuk sintaks yang diharapkan versi Anda. Perintah ini membuat kerangka project dan sudah menambahkan standard library ke `aiken.toml`.

## Tata letak project

| Path | Fungsi |
| --- | --- |
| `aiken.toml` | manifest: nama project, versi compiler, versi Plutus, dependensi |
| `validators/` | file `*.ak` yang berisi validator — kode on-chain |
| `lib/` | module bersama yang diimpor oleh validator dan tes |
| `tests/` | rumah opsional untuk module khusus tes; tes dideklarasikan dengan kata kunci `test` di module mana pun dan dikumpulkan oleh `aiken check` |
| `plutus.json` | blueprint CIP-57 yang dihasilkan oleh `aiken build` |
| `build/` | cache build dan package yang diunduh |
| `README.md` | deskripsi project yang dibuat oleh scaffold |

## Perintah sehari-hari

| Perintah | Fungsinya |
| --- | --- |
| `aiken check` | mengompilasi semuanya, menjalankan semua tes, mencetak mem/cpu per tes |
| `aiken build` | mengompilasi validator untuk deployment dan menulis `plutus.json` |
| `aiken blueprint convert > hello.script` | mengekspor script yang sudah dikompilasi untuk dipakai bersama cardano-cli |
| `aiken add <owner>/<pkg>` | menambahkan atau memperbarui sebuah dependensi package |

```bash
aiken check
aiken build
aiken blueprint convert > hello.script
```

`aiken check` adalah denyut nadi pengembangan: perintah ini gagal pada error kompilasi maupun pada tes yang gagal, dan laporannya sekaligus berfungsi sebagai benchmark karena setiap tes menampilkan execution unit memori dan CPU-nya. Flag seperti `-m` (menjalankan sebagian tes) dan `--trace-level` tersedia — jalankan `aiken check --help` untuk daftar terkini.

## Package

`aiken new` menginstal standard library secara otomatis (`aiken-lang/stdlib` di `aiken.toml`). Tambahkan package lain dengan `aiken add`, misalnya library fuzzing yang dipakai untuk property test:

```bash
aiken add aiken-lang/fuzz --version v3
```

Versi CLI yang lebih lama memakai `aiken packages add ...`; nama, versi, dan sumber dependensi dicatat di `aiken.toml` di bawah `[[dependencies]]`. Tabel kompatibilitas package berada di repository masing-masing package, jadi ikuti dokumentasi terkini daripada menyalin nomor versi dari tutorial.

## Playground (Playa)

https://play.aiken-lang.org adalah playground browser Aiken. Ini cara tercepat untuk mencoba sebuah konstruk bahasa atau fungsi kecil tanpa penyiapan lokal, dan berguna saat Anda membaca dokumentasi. Ini bukan pengganti project: dependensi, tata letak multi-file, dan suite tes Anda yang sebenarnya hidup secara lokal.

## Dari blueprint ke kode off-chain

`aiken build` menulis `plutus.json`, sebuah blueprint CIP-57. Dipersingkat, kira-kira tampak seperti ini:

```json
{
  "preamble": { "title": "hello-world", "compiler": { "version": "..." } },
  "validators": [
    {
      "title": "hello_world.spend",
      "description": "",
      "compiledCode": "5901...00",
      "hash": "9f3..."
    }
  ]
}
```

| Field | Arti | Dipakai untuk |
| --- | --- | --- |
| `compiledCode` | program Plutus Core yang diserialisasi | disematkan ke kode off-chain dan menurunkan script address |
| `hash` | hash dari script yang sudah dikompilasi | mengidentifikasi script tanpa mengirimkan kode lengkapnya |
| `arguments` | parameter sebuah validator terparameterisasi | di-hash ulang per instance untuk mendapatkan address instance tersebut |

Kode off-chain (Mesh, PyCardano, cardano-cli) mengambil `compiledCode`, menghitung script credential darinya, dan menurunkan script address untuk jaringan pilihan Anda. Karena hash mencakup program yang dikompilasi, mengubah kode validator mengubah address-nya — melakukan redeploy berarti membuat script baru, bukan menyunting script yang lama.

## Lihat juga

- [Validator Pertama Anda](aiken-first-validator.md)
- [Tes & Pola Umum](aiken-tests-patterns.md)
- [Stack dApp Cardano](../dapp/dapp-stack.md)
- [Kunci & Tebus Dana di Script](../dapp/dapp-lock-redeem.md)
