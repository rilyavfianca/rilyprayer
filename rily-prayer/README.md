# Rily Prayer 🌿

Website alarm sholat bernuansa hijau sage dan krem. Dibuat menggunakan HTML, CSS, dan JavaScript biasa agar mudah dipelajari dan dipublikasikan lewat GitHub Pages.

## Fitur
- Jadwal sholat harian dari API AlAdhan berdasarkan kota/negara atau koordinat perangkat.
- Hitung mundur ke waktu sholat berikutnya.
- Pengingat browser dan nada alarm sederhana saat halaman terbuka.
- Pengaturan kota dan metode perhitungan.
- Tanggal Hijriah melalui `Intl.DateTimeFormat` jika didukung browser.
- Kalkulasi arah kiblat berdasarkan koordinat.
- Kumpulan doa dan dzikir singkat.
- Checklist dan statistik konsistensi tersimpan di `localStorage`.
- Layout responsif untuk desktop dan ponsel.

## Cara menjalankan
1. Ekstrak ZIP.
2. Buka folder di VS Code.
3. Untuk mencoba, jalankan `index.html` melalui Live Server atau buka di browser. Koneksi internet diperlukan untuk mengambil jadwal sholat dan Google Fonts.
4. Di GitHub, buat repository baru dan unggah isi folder ini (file `index.html` harus berada di root repository).
5. Buka **Settings → Pages**, pilih deploy dari branch `main` dan folder `/ (root)`, lalu simpan.

## Catatan penting tentang alarm browser
Browser tidak menjamin alarm berbunyi tepat waktu saat tab ditutup, browser dihentikan, perangkat tidur, atau sistem membatasi proses latar belakang. Notifikasi juga memerlukan izin dan biasanya HTTPS (GitHub Pages menggunakan HTTPS). Untuk hasil paling baik:
- Buka website dan izinkan notifikasi.
- Biarkan tab tetap terbuka, dan cegah perangkat masuk mode tidur saat mengandalkan pengingat.
- Tes pengingat di browser/perangkat yang akan dipakai.
- Nada pada versi ini adalah bunyi sederhana buatan Web Audio, **bukan rekaman adzan**. Audio mungkin memerlukan interaksi pengguna lebih dulu.
- Jika membutuhkan alarm yang benar-benar andal saat aplikasi tertutup, pertimbangkan aplikasi native atau PWA dengan kemampuan platform yang sesuai; web biasa tidak dapat menjamin hal tersebut.

## Sumber dan akurasi
- Jadwal sholat: AlAdhan API (`https://aladhan.com/prayer-times-api`).
- Kalkulasi kiblat: rumus bearing lingkaran besar menuju Ka'bah menggunakan koordinat Ka'bah.
- Periksa hasil terhadap jadwal resmi masjid/otoritas setempat karena metode, zona waktu, dan penyesuaian lokal bisa menimbulkan perbedaan.

## Privasi
Kota, negara, metode perhitungan, dan checklist disimpan di `localStorage` browser. Data checklist tidak dikirim ke server. Jika menggunakan tombol lokasi, browser akan meminta izin lokasi; koordinat dipakai untuk menghitung kiblat dan meminta jadwal dari layanan API.
