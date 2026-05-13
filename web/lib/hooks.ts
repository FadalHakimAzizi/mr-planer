export type ContentType = 'Entertain' | 'Softselling' | 'Edukasi' | 'Hardselling' | 'Trend'

export type HookFormula = {
  pattern: string
  template: string
  example: string
}

export const HOOK_FORMULAS: Record<ContentType, HookFormula[]> = {
  Entertain: [
    {
      pattern: 'POV Relatable',
      template: 'POV: {situasi_relatable_dengan_produk}',
      example: 'POV: Akhirnya nemu earphone yang nggak bikin kuping sakit seharian',
    },
    {
      pattern: 'Curiosity Gap',
      template: 'Gue hampir nggak percaya {fakta_mengejutkan_tentang_produk}...',
      example: 'Gue hampir nggak percaya earphone 200rb bisa ngalahin yang 1 juta...',
    },
    {
      pattern: 'Storytime',
      template: 'Cerita {waktu} lalu yang akhirnya bikin gue switch ke {produk}',
      example: 'Cerita 3 bulan lalu yang akhirnya bikin gue switch ke speaker portable ini',
    },
    {
      pattern: 'Reaction',
      template: 'Ekspresi gue pertama kali nyoba {produk} — jujur banget',
      example: 'Ekspresi gue pertama kali nyoba speaker ini — jujur banget',
    },
  ],
  Softselling: [
    {
      pattern: 'Problem-Solution',
      template: 'Udah capek dengan {pain_point}? Ini yang akhirnya berhasil buat gue',
      example: 'Udah capek earphone putus terus? Ini yang akhirnya berhasil buat gue',
    },
    {
      pattern: 'Before-After',
      template: 'Sebelum pakai {produk}: {kondisi_buruk}. Setelah pakai: {kondisi_baik}',
      example: 'Sebelum pakai ini: meeting online selalu berisik. Setelah pakai: jernih banget',
    },
    {
      pattern: 'Social Proof Number',
      template: '{angka} pembeli nggak mungkin salah pilih {produk}',
      example: '37.000 pembeli nggak mungkin salah pilih earphone ini',
    },
    {
      pattern: 'Honest Review',
      template: 'Jujur review {produk} setelah {durasi} pemakaian — ada yang mengecewakan?',
      example: 'Jujur review speaker ini setelah 3 bulan pemakaian — ada yang mengecewakan?',
    },
  ],
  Edukasi: [
    {
      pattern: 'Misconception',
      template: 'Selama ini kita salah paham soal {topik_terkait_produk}',
      example: 'Selama ini kita salah paham soal cara pilih earphone yang benar',
    },
    {
      pattern: 'Number Tips',
      template: '{angka} hal yang {target_audience} wajib tau sebelum beli {kategori_produk}',
      example: '5 hal yang wajib kamu tau sebelum beli earphone gaming',
    },
    {
      pattern: 'Warning Hook',
      template: 'Stop dulu, jangan beli {kategori_produk} sebelum tau ini',
      example: 'Stop dulu, jangan beli earphone sebelum tau ini',
    },
    {
      pattern: 'Comparison',
      template: 'Bedanya {produk_mahal} vs {produk_kita} yang harganya {selisih_harga} lebih murah',
      example: 'Bedanya AirPods vs earphone ini yang harganya 800rb lebih murah',
    },
  ],
  Hardselling: [
    {
      pattern: 'Urgency Scarcity',
      template: 'Stok tinggal {angka}! {produk} yang udah {social_proof} ini lagi diskon',
      example: 'Stok tinggal 50! Speaker yang udah 10rb+ review ini lagi diskon 40%',
    },
    {
      pattern: 'Price Shock',
      template: 'Harga {harga} untuk {value_proposition}? Beneran ini bukan PHP',
      example: 'Harga 150rb untuk kualitas suara sekelas ini? Beneran ini bukan PHP',
    },
    {
      pattern: 'FOMO',
      template: '{angka} orang udah order {produk} hari ini, kamu?',
      example: '500 orang udah order earphone ini hari ini, kamu?',
    },
    {
      pattern: 'Direct Offer',
      template: 'Link di bio! {produk} + {bonus} cuma {harga} hari ini doang',
      example: 'Link di bio! Speaker portable + gratis case cuma 199rb hari ini doang',
    },
  ],
  Trend: [
    {
      pattern: 'Trend Ride',
      template: 'Ikut trend {nama_trend} tapi pakai {produk} — hasilnya...',
      example: 'Ikut trend silent walking tapi pakai earphone ini — hasilnya...',
    },
    {
      pattern: 'Sound Match',
      template: 'Sound ini {nama_sound} terlalu cocok sama {situasi_pakai_produk}',
      example: 'Sound ini terlalu cocok sama momen unboxing speaker baru',
    },
    {
      pattern: 'Challenge Version',
      template: 'Versi {produk} dari {challenge_trend} yang lagi viral',
      example: 'Versi earphone dari "that girl" challenge yang lagi viral',
    },
  ],
}

export function getHookFormulasForPrompt(contentType: ContentType): string {
  const formulas = HOOK_FORMULAS[contentType] ?? HOOK_FORMULAS.Entertain
  return formulas
    .map(f => `  - [${f.pattern}] Template: "${f.template}" | Contoh: "${f.example}"`)
    .join('\n')
}

export function getAllHookFormulasForPrompt(): string {
  return (Object.keys(HOOK_FORMULAS) as ContentType[])
    .map(type => `${type}:\n${getHookFormulasForPrompt(type)}`)
    .join('\n\n')
}