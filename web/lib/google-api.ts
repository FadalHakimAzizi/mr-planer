import { google } from 'googleapis'

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive',
]

async function getAuthClient() {
  const rawKey = process.env.GOOGLE_PRIVATE_KEY ?? ''
  const privateKey = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey

  const client = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: privateKey,
    scopes: SCOPES,
  })
  await client.authorize()
  return client
}

const SOUND_HINT: Record<string, string> = {
  Entertain: 'Viral sound TikTok ID (cek Creative Center)',
  Softselling: 'Lofi / chill instrumental',
  Edukasi: 'Light instrumental volume rendah',
  Hardselling: 'Hype beat / drop beat',
  Trend: '#1 Trending sound TikTok ID hari ini',
}

export async function createContentPlanSpreadsheet(params: {
  title: string
  items: Array<{
    row_number: number
    post_date: string
    post_time?: string | null
    product_name: string | null
    title: string | null
    content_type: string | null
    post_type: string | null
    hook: string | null
    caption: string | null
    hashtags: string[]
    script_url?: string | null
  }>
}): Promise<string> {
  const auth = await getAuthClient()
  const sheets = google.sheets({ version: 'v4', auth })
  const drive = google.drive({ version: 'v3', auth })

  const parents = process.env.GOOGLE_DRIVE_FOLDER_ID ? [process.env.GOOGLE_DRIVE_FOLDER_ID] : []
  const driveFile = await drive.files.create({
    requestBody: {
      name: params.title,
      mimeType: 'application/vnd.google-apps.spreadsheet',
      ...(parents.length ? { parents } : {}),
    },
    fields: 'id',
  })
  const spreadsheetId = driveFile.data.id!

  const sorted = [...params.items].sort((a, b) => a.row_number - b.row_number)
  const dates = sorted.map(i => i.post_date).filter(Boolean).sort()
  const periodeStart = dates[0] ?? ''
  const periodeEnd = dates[dates.length - 1] ?? ''
  const periodeText = periodeStart ? `Periode : ${periodeStart} - ${periodeEnd}` : 'Periode : -'

  const headers = [
    'No',
    'Tanggal Posting',
    'Nama Produk',
    'Judul Konten',
    'Jenis Konten',
    'Post Type',
    'Hook / Headline',
    'Caption TikTok',
    'Hashtag',
    'Link Script (Google Docs)',
    'Ide Musik/Tren',
    'Status',
    'Jam Posting',
  ]
  const rows = sorted.map(item => [
    String(item.row_number),
    item.post_date ?? '',
    item.product_name ?? '',
    item.title ?? '',
    item.content_type ?? '',
    item.post_type ?? '',
    item.hook ?? '',
    item.caption ?? '',
    (item.hashtags ?? []).join(' '),
    item.script_url ?? '',
    SOUND_HINT[item.content_type ?? ''] ?? '',
    'Menunggu',
    item.post_time ?? '',
  ])

  const titleRow = ['CONTENT PLAN', ...Array(headers.length - 1).fill('')]
  const periodeRow = [periodeText, ...Array(headers.length - 1).fill('')]

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data: [{ range: 'Sheet1!A1', values: [titleRow, periodeRow, headers, ...rows] }],
    },
  })

  try {
    const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets(properties(sheetId,title))' })
    const sheetId = sheetMeta.data.sheets?.[0]?.properties?.sheetId ?? 0
    const lastCol = headers.length
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          { mergeCells: { range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: lastCol }, mergeType: 'MERGE_ALL' } },
          { mergeCells: { range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: lastCol }, mergeType: 'MERGE_ALL' } },
          { repeatCell: { range: { sheetId, startRowIndex: 0, endRowIndex: 1 }, cell: { userEnteredFormat: { horizontalAlignment: 'CENTER', textFormat: { bold: true, fontSize: 14 } } }, fields: 'userEnteredFormat(horizontalAlignment,textFormat)' } },
          { repeatCell: { range: { sheetId, startRowIndex: 2, endRowIndex: 3 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.85, green: 0.85, blue: 0.95 }, textFormat: { bold: true } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } },
          { updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 3 } }, fields: 'gridProperties.frozenRowCount' } },
        ],
      },
    })
  } catch (e) {
    console.warn('Sheet formatting failed (non-fatal):', e instanceof Error ? e.message : e)
  }

  try {
    await drive.permissions.create({
      fileId: spreadsheetId,
      requestBody: { role: 'reader', type: 'anyone' },
    })
  } catch (e) {
    console.warn('Drive permission failed (non-fatal):', e instanceof Error ? e.message : e)
  }

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
}

export async function createScriptDoc(params: {
  title: string
  productName: string
  script: {
    hook_text: string
    problem: string
    solution: string
    cta: string
    visual_direction: string
    audio_cue: string
  }
}): Promise<string> {
  const auth = await getAuthClient()
  const docs = google.docs({ version: 'v1', auth })
  const drive = google.drive({ version: 'v3', auth })

  const document = await docs.documents.create({
    requestBody: { title: params.title },
  })

  const docId = document.data.documentId!

  const content = `SCRIPT VIDEO TIKTOK
Produk: ${params.productName}
Judul: ${params.title}
=====================================

HOOK (0-5 detik)
${params.script.hook_text}

PROBLEM / PAIN POINT (5-20 detik)
${params.script.problem}

SOLUSI / PRODUK (20-40 detik)
${params.script.solution}

CALL TO ACTION (40-50 detik)
${params.script.cta}

VISUAL DIRECTION
${params.script.visual_direction}

AUDIO / SOUND
${params.script.audio_cue}
`

  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: {
      requests: [{ insertText: { location: { index: 1 }, text: content } }],
    },
  })

  if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
    try {
      const file = await drive.files.get({ fileId: docId, fields: 'parents' })
      await drive.files.update({
        fileId: docId,
        addParents: process.env.GOOGLE_DRIVE_FOLDER_ID,
        removeParents: file.data.parents?.join(','),
      })
    } catch (e) {
      console.warn('Drive folder move failed (non-fatal):', e instanceof Error ? e.message : e)
    }
  }

  try {
    await drive.permissions.create({
      fileId: docId,
      requestBody: { role: 'reader', type: 'anyone' },
    })
  } catch (e) {
    console.warn('Drive permission failed (non-fatal):', e instanceof Error ? e.message : e)
  }

  return `https://docs.google.com/document/d/${docId}/edit`
}
