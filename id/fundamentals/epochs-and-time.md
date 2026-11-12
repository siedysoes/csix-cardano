# Epoch, Slot & Waktu

Cardano mengukur waktu protokol dalam satuan slot dan epoch, alih-alih sekadar mempercayai timestamp blok. Konsensus, reward staking, validitas transaksi, dan tenggat smart contract semuanya bertumpu pada satuan-satuan ini, jadi model mental yang tepat penting baik bagi delegator maupun pengembang dApp.

## Slot dan Epoch

- **Slot** — detak waktu dasar. Slot length adalah parameter protokol, diatur ke **1 detik** di mainnet sejak era Shelley.
- **Epoch** — jendela tetap sepanjang **432,000 slot = tepat 5 hari** (432,000 s ÷ 86,400 s per hari).
- Node menerjemahkan waktu wall-clock ke slot saat ini dan terus berdetak maju bahkan ketika tidak ada blok yang datang; nomor slot adalah posisi di linimasa protokol itu sendiri, bukan timestamp mentah.

### Menghitung slot ke dalam epoch

Nomor slot bersifat global, sehingga aritmetika epoch hanyalah pembagian:

```text
epoch               = floor(slot / 432000)
position in epoch   = slot % 432000
next epoch boundary = (floor(slot / 432000) + 1) * 432000

example: slot 288,576,092
  epoch              = floor(288,576,092 / 432,000) = 668
  position           = 92 slots (92 seconds) past that epoch's start
  next boundary slot = 289,008,000  (431,908 seconds later, i.e. ~5 days)
```

Inilah cara alat-alat menurunkan "epoch saat ini" dan "waktu menuju reward" dari ujung rantai (chain tip).

## Blok Bersifat Probabilistik, Tidak Dijamin

Tidak setiap slot memuat sebuah blok. **Active slot coefficient `f`** adalah probabilitas suatu slot ditugaskan seorang produsen blok; di mainnet `f = 0.05` (saat tulisan ini dibuat — verifikasi).

```text
expected interval between blocks = slot length / f = 1 s / 0.05 = 20 seconds
```

Jadi slot kosong adalah hal yang wajar: sekitar 19 dari setiap 20 slot tidak membawa blok, dan dompet atau indexer hanya menunggu.

### Pemilihan pemimpin dengan VRF (ringkas)

Di bawah gaya konsensus Praos, keacakan setiap epoch (sebuah seed yang diturunkan dari output epoch sebelumnya) digabungkan dengan material kunci operasional sebuah pool dalam sebuah **verifiable random function (VRF)**. Sebuah pool hanya boleh memproduksi blok slot jika hasil VRF-nya berada di bawah ambang yang sebanding dengan stake relatifnya — jadi stake membeli probabilitas, bukan jaminan. Karena keluaran VRF tidak bisa diketahui sebelum seed ditetapkan, para pemimpin tidak dapat diprediksi sebelumnya, yang melemahkan penargetan denial-of-service; blok membawa keluaran VRF sehingga siapa pun dapat memverifikasinya.

## Parameter Keamanan k dan Finality

Parameter keamanan **`k`** adalah jumlah blok setelahnya rantai dianggap tidak berubah (immutable). Dokumentasi resmi menyebut **stability window** — periode di mana tidak ada hard fork yang dapat terjadi dan finalitas transaksi dijamin — memakan waktu hingga **3k/f slot**, yang berarti **36 jam dengan parameter saat ini** (sekitar satu setengah hari), dan menyatakan bahwa finalitas transaksi membutuhkan waktu kira-kira satu hari dan tidak dapat terjadi dalam waktu kurang dari satu hari.

```text
3k/f = 129,600 slots = 36 hours   with f = 0.05 and k = 2160
```

Panduan praktis:

- Dalam hitungan menit atau jam, keyakinan sudah tinggi; probabilitas sebuah blok dibuang menurun secara eksponensial seiring kedalaman.
- Anggap sebuah pembayaran **praktis tidak dapat dibatalkan setelah sekitar hari atau lebih** konfirmasi untuk skenario bernilai tinggi.
- Baik `k` maupun `f` adalah parameter protokol yang dapat disesuaikan lewat governance — saat tulisan ini dibuat nilai di atas mencerminkan mainnet, jadi verifikasi parameter terkini di docs.cardano.org.

## Satuan Waktu Sekilas

| Satuan | Panjang | Dipakai untuk |
|---|---|---|
| Slot | 1 detik | Langkah waktu dasar; sebuah blok dapat muncul di setiap slot |
| Blok (harapan) | ~20 detik rata-rata (1 s ÷ f, f = 0.05) | Mengukur kedalaman konfirmasi |
| Epoch | 432,000 slot = 5 hari | Snapshot stake, jadwal pemimpin, perhitungan reward, perubahan parameter |
| Stability window | hingga 3k/f ≈ 36 jam (k = 2160, f = 0.05) | Horizon imutabilitas / finality |
| Reward | Dibagikan pada batas epoch, setelah jeda snapshot | Pembayaran delegator dan operator pool |

Di testnet angka-angka ini bisa berbeda: preview pernah memakai epoch 1 hari sementara preprod mencerminkan mainnet (saat tulisan ini dibuat — verifikasi). Stake yang didelegasikan juga hanya menjadi aktif setelah snapshot batas epoch, jadi harapkan jeda satu sampai dua epoch sebelum mulai menghasilkan; cek jadwal snapshot-ke-pembayaran yang tepat di docs.cardano.org alih-alih menghafalnya.

## Melihat Chain Tip

Setiap node yang tersinkron dapat melaporkan tip-nya. Dengan cardano-cli:

```console
$ cardano-cli query tip --mainnet
{
    "era": "Conway",
    "epoch": 668,
    "slot": 288576092,
    "hash": "3f2c...abcd",
    "syncProgress": "100.00"
}
```

Hanya output ilustratif — nilai-nilainya bukan data live, nama field berversi antar versi node, dan testnet ditanyakan dengan `--testnet-magic N` alih-alih `--mainnet` (lihat [Testnet Cardano](cardano-testnets.md)). Explorer (misalnya cardanoscan.io) dan penyedia data (Blockfrost, Koios) mengekspos field tip yang sama: slot, epoch, nomor blok, dan hash.

## Artinya bagi Timing dApp

### Validity interval

Setiap transaksi membawa **validity interval**: batas bawah (`invalid_before`) dan batas atas (`invalid_hereafter`) dalam satuan slot. Rantai mengesampingkan transaksi di luar intervalnya, dan transaksi yang kedaluwarsa tidak pernah disertakan — sehingga tidak pernah mengonsumsi fee; dompet biasanya cukup mengirim ulang dengan batas atas yang baru.

### Tenggat di dalam validator

Script menerima validity range dalam bentuk **waktu POSIX** (diubah dari slot oleh konsensus), dan dapat menegaskan hal-hal seperti "transaksi ini hanya valid sebelum/setelah waktu D". Mereka tidak dapat mengamati momen validasi yang tepat — itu akan merusak determinisme.

Pola escrow dua jalur standar:

| Aksi kontrak | Di luar rantai: validity range yang diatur | On-chain: pemeriksaan validator |
|---|---|---|
| Klaim sebelum tenggat D | batas atas tepat sebelum D | require `validity upper < D` |
| Klaim (refund) setelah tenggat D | batas bawah pada atau setelah D | require `validity lower ≥ D` |

Saran terkait waktu:

- Blok datang kira-kira setiap 20 detik, dan mempool menambah keterlambatan — jangan pernah merancang jendela yang dihitung dalam satuan detik tunggal; sisakan margin setidaknya beberapa blok.
- Jika tenggat terlampaui selagi sebuah transaksi menunggu, ia kedaluwarsa tanpa efek samping; bangun jalur percobaan ulang (retry) dengan rentang yang diperluas.
- Verifikasi asumsi waktu di testnet terlebih dahulu; panjang epoch dan jadwal upgrade testnet berbeda dari mainnet.

### Kesalahan timing yang umum

- Mengasumsikan sebuah blok mendarat di setiap slot — hanya sekitar 1 dari 20 slot yang membawanya.
- Memperlakukan detik wall-clock sebagai waktu rantai yang persis; propagasi dan konversi slot menambahkan selisih.
- Merilis jendela validity yang lebih sempit dari beberapa blok lalu mendebug "transaction expired".
- Lupa bahwa transaksi yang kedaluwarsa tidak biaya apa pun tetapi harus dibangun ulang dengan batas atas yang baru.
- Menyalin aritmetika epoch mainnet ke preview, yang pernah memakai epoch 1 hari (saat tulisan ini dibuat — verifikasi).
- Hard-code nomor slot untuk tenggat, lalu rusak ketika sebuah testnet di-reset atau sebuah era mengubah penanganan slot.

## Lihat juga

- [Apa Itu Cardano](what-is-cardano.md)
- [Model UTxO](utxo-model.md)
- [Transaksi & Alamat](transactions-and-addresses.md)
- [Staking & Delegasi](staking-and-delegation.md)
- [Quickstart cardano-cli](../cli/cli-quickstart.md)
