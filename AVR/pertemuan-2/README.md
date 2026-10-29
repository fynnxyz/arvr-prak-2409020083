# Praktikum AR/VR - Minggu 2

## Scene v1

Scene AR marker Hiro berisi empat objek berbeda:

- kubus biru
- bola oranye dengan metalness dan roughness
- silinder hijau dengan animasi rotasi
- kotak bertekstur dari `assets/tekstur.jpg`

Scene juga memakai alas, ambient light, directional light, point light merah, transform, entity grouping, ID bermakna, dan komentar kode.

## Eksperimen dan refleksi

- Mengubah position Y membuat objek naik atau turun.
- Rotation mengubah arah putar objek.
- Scale `1 2 1` membuat bola lebih tinggi.
- Ambient light rendah membuat scene gelap; directional light memberi bayangan dan arah cahaya.
- Point light merah memberi semburat warna merah.
- Urutan atribut HTML tidak mengubah hasil karena A-Frame membaca atribut sebagai properti komponen. Urutan transform dalam properti tetap memengaruhi hasil akhir.
- Satu unit pada marker kira-kira sebesar lebar marker, jadi ukuran objek perlu dijaga sekitar 0,2 sampai 0,7.

## Checklist

- [x] Minimal empat objek berbeda
- [x] Minimal satu tekstur
- [x] Ambient dan directional light
- [x] Point light berwarna
- [x] Satu objek bergerak
- [x] Objek memiliki ID bermakna
- [x] Objek dikelompokkan dalam entity induk
- [x] Tambahkan foto tekstur ke `assets/tekstur.jpg`
- [x] Uji scene memakai marker Hiro di HP
- [x] Commit dan tag `scene-v1`
