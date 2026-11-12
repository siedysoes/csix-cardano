# Native Token & Minting

Ledger Cardano bersifat multi-asset: ADA dan token yang didefinisikan pengguna hidup di UTxO yang sama dan berpindah dalam transaction yang sama. Membuat token semacam itu berarti menambahkan field `--mint` ke sebuah transaction, yang diatur oleh minting policy yang menentukan siapa yang boleh membuat atau menghancurkan unit. Halaman ini membahas pengenal asset, policy berbasis tanda tangan yang minimal, serta cara melakukan mint dan burn di testnet.

## Ledger multi-asset

Sebuah UTxO memegang nilai berbentuk `lovelace + daftar (policy id, asset name, quantity)`. Tidak ada "token chain" terpisah: token bepergian bersama ADA, dibelanjakan di input yang sama, dan setiap output yang membawa token juga harus membawa cukup ADA (lihat bagian berikutnya).

## Pengenal asset

Sebuah token pengguna diidentifikasi oleh tepat dua hal:

| Komponen | Bentuk | Contoh |
| --- | --- | --- |
| Policy id | hash 28 byte, ditampilkan sebagai 56 karakter heksadesimal | `1a2b...9f` |
| Asset name | hingga 32 byte, ditampilkan dalam heksadesimal | `544f4b454e` (`TOKEN`) |

Pasangan `<policyid>.<asset_name_hex>` adalah asset id yang digunakan cardano-cli. Karena string heks panjang sulit dibaca, CIP-14 mendefinisikan sebuah **fingerprint**: pengenal pendek berchecksum yang diturunkan dari hash blake2b atas policy id dan asset name, ditampilkan dengan awalan `asset1...`. Wallet menampilkan fingerprint atau nama, tetapi ledger hanya pernah membandingkan policy id beserta byte nama.

## Minting policy

Sebuah minting policy adalah script yang terpasang pada policy id. Ketika sebuah transaction melakukan mint atau burn unit, ledger menjalankan script tersebut; jika script mengembalikan `True`, mint diizinkan. Ada dua varian:

- **Native script** — bahasa kombinator kecil (`sig`, `all`, `any`, `nOfK`, time lock), dievaluasi sebagai bagian dari validasi dasar transaction.
- **Plutus script** — program lengkap (biasanya ditulis dalam Aiken) yang dieksekusi dengan anggaran memori/komputasi.

Field mint sendiri adalah daftar `(policy id, asset name, quantity)`. Quantity positif membuat token, quantity negatif menghancurkannya; dalam satu transaction, perubahan bersih per asset harus diizinkan oleh policy-nya.

### Policy berbasis tanda tangan

Policy paling sederhana: hanya pemegang sebuah key yang boleh mint. Hitung dulu key hash-nya:

```bash
cardano-cli address key-hash --payment-verification-key-file me.vk
```

Lalu tulis `policy.script` (native script JSON):

```json
{
  "type": "sig",
  "keyHash": "REPLACE_WITH_YOUR_KEY_HASH"
}
```

Transaction apa pun yang mint di bawah policy ini harus membawa tanda tangan dari key tersebut.

### Hitung policy id

```bash
cardano-cli conway transaction policyid --script-file policy.script
```

Hash yang dicetak **adalah** policy id; setiap unit token Anda dialamatkan sebagai `<policyid>.TOKEN`. Perintah ini berjalan secara lokal — tidak perlu koneksi ke node.

## Mint dan burn

```bash
POLICY_ID=$(cardano-cli conway transaction policyid --script-file policy.script)

cardano-cli conway transaction build \
  --tx-in <txhash>#<ix> \
  --tx-out "$(cat me.addr)+2000000+1000000 ${POLICY_ID}.TOKEN" \
  --mint "1000000+${POLICY_ID}.TOKEN" \
  --change-address "$(cat me.addr)" \
  --socket-path node.socket \
  --testnet-magic 2 \
  --out-file mint.raw

cardano-cli conway transaction sign \
  --tx-file mint.raw \
  --out-file mint.signed \
  --signing-key-file me.sk

cardano-cli conway transaction submit \
  --tx-file mint.signed \
  --socket-path node.socket \
  --testnet-magic 2
```

Catatan:

- baris `--tx-out` adalah yang sebenarnya menampung token baru: 1.000.000 unit `TOKEN` plus 2 ADA min-ADA;
- menandatangani dengan `me.sk` memenuhi policy `sig`, karena policy menuntut tepat key tersebut;
- burn memakai quantity negatif — `--mint "-1000000+${POLICY_ID}.TOKEN"` — dan token harus dikonsumsi dari output Anda dalam transaction yang sama;
- jika versi CLI Anda menolak nama `TOKEN` yang polos, coba bentuk heksadesimalnya `544f4b454e`; asset name adalah byte string dan detail flag CLI berubah antar rilis.

## Minimum ADA per output token

Output yang memuat token berukuran lebih besar daripada output yang hanya berisi ADA, sehingga ia harus membawa minimum yang ditetapkan protocol (berdasarkan protocol parameter `coinsPerUTxOByte`). Dalam praktiknya, sebuah output token kecil membutuhkan sekitar 1–2 ADA. Jika ia membawa kurang dari itu, node akan menolak transaction dan mencetak minimum yang diperlukan untuk output tersebut — tingkatkan angka lovelace di `--tx-out` sampai lolos.

## Native asset versus Plutus token

| Aspek | Policy native script | Policy Plutus script |
| --- | --- | --- |
| Diperiksa di mana | validasi transaction (fase 1) | eksekusi script (fase 2) |
| Biaya tambahan | tidak ada selain ukuran | execution unit (mem/cpu) yang dibayar lewat fee |
| Logika yang bisa diekspresikan | aturan key/waktu/kombinator saja | logika apa pun dalam Aiken |
| Penggunaan umum | supply tetap, mint dengan batas waktu | aturan yang memeriksa transaction-nya |
| Mode kegagalan | script mengevaluasi ke false → tx invalid | budget terlampaui atau error → tx ditolak |

## Keamanan: nama tidak melindungi Anda

Dua policy yang berbeda dapat melakukan mint atas asset dengan nama yang sama; pasangan `(policy id, name)` adalah pembedanya, sehingga pengguna harus memverifikasi policy id — bukan ticker-nya. Dalam satu policy, **siapa pun yang memenuhi policy dapat melakukan mint lebih banyak unit**:

| Jenis policy | Siapa yang bisa mint | Hasil |
| --- | --- | --- |
| `sig` (key Anda) | hanya Anda | supply di bawah kendali Anda |
| terkunci waktu (time-locked) | siapa pun selama jendela terbuka | setelah kedaluwarsa tidak ada yang bisa mint atau burn — supply membeku |
| one-shot (diparameterisasi oleh sebuah UTxO reference) | tepat satu kali eksekusi, selama UTxO itu dibelanjakan | supply tetap secara konstruksi |
| tanpa pembatasan berarti | siapa pun, selamanya | token yang tidak berharga |

Rancang policy-nya sebelum ticker-nya: putuskan aturan supply terlebih dahulu, lalu turunkan policy id-nya, dan baru setelah itu distribusikan token-nya.

## Lihat juga

- [Quickstart cardano-cli](cli-quickstart.md)
- [Membangun Transaksi dengan cardano-cli](cli-transactions.md)
- [Validator Pertama Anda](../aiken/aiken-first-validator.md)
- [Tes & Pola Umum](../aiken/aiken-tests-patterns.md)
