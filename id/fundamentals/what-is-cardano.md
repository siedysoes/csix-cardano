# Apa Itu Cardano

Cardano adalah platform blockchain proof-of-stake terdesentralisasi dan rumah asli bagi kripto ada (ADA). Cardano paling dikenal karena prosesnya yang menempatkan riset di depan: protokol konsensusnya, Ouroboros, diformalkan dan ditelaah oleh sesama peneliti sebelum berjalan di jaringan publik. Halaman ini memberi Anda kosakata yang diasumsikan oleh seluruh basis belajar ini — konsensus, organisasi di balik Cardano, ADA dan satuannya, linimasa era, serta posisi smart contract dan governance di dalamnya.

## Proof of Stake, Bukan Proof of Work

Rantai proof-of-work mengamankan ledger dengan memaksa penambang membakar listrik untuk memperebutkan hak memproduksi blok. Cardano memakai proof of stake (PoS): protokol memilih produsen blok berdasarkan stake yang mereka kendalikan, sehingga keamanan berasal dari bobot ekonomi, bukan perangkat keras.

Apa artinya dalam praktik:

- Blok diproduksi oleh stake pool yang menjalankan perangkat keras server biasa — tanpa rig tambang, tanpa chip khusus.
- Konsumsi energi per transaksi hanya sebagian kecil dari sistem proof-of-work.
- Keamanan bertumpu pada asumsi mayoritas stake yang jujur: bukti yang diterbitkan mengasumsikan penguasa mengendalikan kurang dari setengah bobot yang di-stake (asumsi persisnya berbeda antar varian protokol).
- Pemegang ADA mendelegasikan stake mereka ke pool alih-alih menjalankan infrastruktur sendiri.

## Ouroboros: Keluarga Protokol

Ouroboros adalah protokol konsensus proof-of-stake Cardano. Paper aslinya, "Ouroboros: A Provably Secure Proof-of-Stake Blockchain Protocol", diterbitkan pada 2017, dan dokumentasi resmi menyebut Ouroboros sebagai protokol blockchain pertama yang berbasis riset yang ditelaah sesama peneliti (peer-reviewed). Alih-alih sekadar mengklaim keamanan, desainnya datang bersama argumen matematis tentang safety, keacakan pemilihan pemimpin, dan kompatibilitas insentif.

Varian yang telah diterbitkan meliputi:

| Varian | Kontribusi |
|---|---|
| Ouroboros Classic | Protokol PoS asli yang terbukti aman beserta mekanisme insentifnya |
| Ouroboros BFT | Konsensus federasi yang disederhanakan, dipakai selama transisi Byron |
| Ouroboros Praos | Keamanan semi-sinkron dengan pemilihan pemimpin privat dan tanda tangan key-evolving |
| Ouroboros Genesis | Aturan pemilihan rantai yang memungkinkan node melakukan bootstrap dari genesis tanpa checkpoint tepercaya |
| Ouroboros Chronos | Sinkronisasi jam berbasis blockchain (riset) |
| Ouroboros Leios | Desain overlay yang berorientasi throughput (masih dalam riset dan pengembangan saat tulisan ini dibuat) |

Byron menjalankan Ouroboros BFT federatif; mulai Shelley, produksi blok berpindah ke komunitas stake pool dengan konsensus keluarga Praos (era Babbage menggantikan protokol transisional dengan Praos). Konfigurasi produksi persisnya berubah mengikuti upgrade — verifikasi pengaturan konsensus terkini di docs.cardano.org.

### Apa yang didapat dan tidak didapat dari "peer review"

| Peer review mendukung | Peer review tidak mencakup |
|---|---|
| Bukti safety dan liveness di bawah asumsi yang dinyatakan | Bug pada implementasi node |
| Analisis insentif dan keacakan yang diterbitkan dan dapat dikutip | Serangan di luar asumsi model |
| Pengawasan independen sebelum deployment | Kegagalan operasional, ekonomi, atau governance |

## Tiga Organisasi Pendiri

| Organisasi | Jenis | Peran |
|---|---|---|
| Input Output (sering ditulis IOHK / Input Output Global) | Perusahaan riset dan rekayasa, didirikan 2015 | Riset protokol dan perangkat lunak inti: cardano-node, Plutus, tooling pengembang |
| Cardano Foundation | Yayasan nirlaba yang berbasis di Swiss | Pengelolaan ekosistem: standar, edukasi, keterlibatan regulator, partisipasi governance |
| EMURGO | Lengan usaha komersial | Adopsi: produk, investasi, dan kemitraan |

Ketiganya adalah entitas pendiri. Tanggung jawab persisnya telah bergeser seiring waktu, dan koordinasi sehari-hari semakin berjalan melalui organisasi komunitas seperti Intersect MBO serta melalui governance on-chain — verifikasi pembagian peran terkini di cardano.org.

## ADA dan Lovelace

- **ADA** adalah token asli, dinamai dari Ada Lovelace.
- **lovelace** adalah unit terkecil: **1 ADA = 1,000,000 lovelace**.
- Nilai di tingkat protokol — fee, saldo UTxO, jumlah treasury — dinyatakan dalam lovelace, sementara dompet menampilkannya dalam ADA.
- **Pasokan maksimum tetap di 45,000,000,000 (45 miliar) ADA**. ADA baru hanya masuk ke peredaran melalui reward staking dan pendanaan treasury, epoch demi epoch, dan tidak pernah melebihi batas itu.

```text
1 ADA          =       1,000,000 lovelace
2.5 ADA        =       2,500,000 lovelace
0.17 ADA fee   =         170,000 lovelace
45 billion ADA = 45,000,000,000,000,000 lovelace
```

## Linimasa Era

Cardano di-upgrade melalui era yang di-hard-fork; setiap era mengubah aturan ledger — transaksi mana yang valid dan data apa yang boleh dibawanya. Dokumentasi resmi membedakan fase pengembangan (Byron, Shelley, Goguen, Basho, Voltaire) dari era ledger (Byron, Shelley, Allegra, Mary, Alonzo, Babbage, Conway); tabel di bawah memakai linimasa gaya-fase yang paling sering dikutip tutorial.

| Era | Yang diperkenalkan |
|---|---|
| **Byron** (awal mainnet hingga pertengahan 2020) | Era fondasi: produksi blok federatif oleh entitas pendiri, transfer dasar ada, dompet Daedalus dan Yoroi |
| **Shelley** (mulai Juli 2020) | Desentralisasi: proof of stake, stake pool yang dikelola komunitas, dan delegation |
| **Goguen** (2020-2021) | Smart contract dan token kustom, dirilis bertahap lintas era ledger Allegra, Mary, dan Alonzo — Alonzo mengaktifkan script Plutus pada September 2021 |
| **Vasil** (2022, era ledger Babbage) | Peningkatan performa dan pengembang: datum inline, reference input dan reference script, diffusion pipelining; dinamai dari Vasil Dabov |
| **Conway** (mulai 2024) | Governance on-chain (CIP-1694): DRep, komite konstitusional, dan voting SPO, dijalankan melalui hard fork Chang dan Plomin |

Saat tulisan ini dibuat, Conway adalah era ledger yang aktif dan upgrade berikutnya (Dijkstra, lalu Euler) telah diumumkan tetapi belum dirilis — verifikasi era dan status upgrade terkini di docs.cardano.org sebelum mengandalkan linimasa apa pun.

## Smart Contract dan Native Asset

### Plutus dan bahasa scripting lain

Smart contract di Cardano adalah validator yang ditulis untuk model eUTxO (extended UTxO). Plutus adalah platform aslinya; dokumen resmi juga mencantumkan Aiken, Scalus, dan Marlowe sebagai pilihan. Validator adalah program yang memutuskan apakah suatu UTxO tertentu boleh dibelanjakan oleh transaksi tertentu, dan ia berjalan di dalam anggaran eksekusi tetap (execution units) yang harganya masuk ke fee transaksi.

### Native asset

Mendukung token secara native: setiap aset diidentifikasi oleh pasangan `(policy id, asset name)`, dan minting atau burning dikontrol oleh script minting policy. Memindahkan token native sama sekali tidak memerlukan smart contract — berbeda dengan rantai model akun, di mana kontrak biasanya menyimpan saldo.

## Governance On-Chain (Era Conway)

Sejak CIP-1694, Cardano dapat mengubah dirinya sendiri melalui voting on-chain. Governance dibagi di antara tiga lembaga:

- **DRep** — siapa pun dapat mendaftar sebagai delegated representative, dan pemegang ADA mendelegasikan kekuatan voting kepada mereka (dihitung satu lovelace, satu suara).
- **Komite konstitusional (constitutional committee)** — memeriksa apakah aksi governance sesuai dengan konstitusi Cardano (satu anggota, satu suara).
- **Operator stake pool** — memberi suara pada sebagian aksi yang telah ditetapkan, seperti inisiasi hard fork dan perubahan parameter yang sensitif terhadap keamanan.

Siapa pun dapat mengajukan aksi governance, dan sebagian besar aksi harus diratifikasi oleh setidaknya dua dari tiga lembaga. Penarikan treasury dan pembaruan parameter protokol kini melalui proses ini, bukan lagi melalui entitas pendiri. Governance masih muda dan ambang, tooling, serta prosedurnya berubah setiap upgrade — saat tulisan ini dibuat, verifikasi aturan terkini di docs.cardano.org dan dokumen tooling governance resmi (docs.gov.tools) sebelum bertindak.

## Fakta yang Berubah: Verifikasi Sebelum Mengandalkan

Butir yang bergerak cepat, layak dicek di sumber resmi (docs.cardano.org, cardano.org, cips.cardano.org):

- Era saat ini dan upgrade yang tertunda (Conway beserta penerus yang diumumkan saat tulisan ini dibuat).
- Parameter protokol: fee, parameter keamanan k, active slot coefficient, deposit, dan aturan minimum-ADA.
- Aturan governance: ambang kuorum, pendaftaran DRep, dan proses komite.
- Tanggung jawab terkini Input Output, Cardano Foundation, dan EMURGO.

## Lihat juga

- [Model UTxO](utxo-model.md)
- [Epoch, Slot & Waktu](epochs-and-time.md)
- [Staking & Delegasi](staking-and-delegation.md)
- [Testnet Cardano](cardano-testnets.md)
- [Stack dApp Cardano](../dapp/dapp-stack.md)
