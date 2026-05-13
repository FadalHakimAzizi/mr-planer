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

export async function createContentPlanSpreadsheet(params: {
  title: string
  items: Array<{
    row_number: number
    post_date: string
    product_name: string | null
    title: string | null
    content_type: string | null
    post_type: string | null
    hook: string | null
    caption: string | null
    hashtags: string[]
  }>
}): Promise<string> {
  const auth = await getAuthClient()
  const sheets = google.sheets({ version: 'v4', auth })
  const drive = google.drive({ version: 'v3', auth })

  // Create directly in user's Drive folder (uses user's storage quota, not service account's)
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

  // Populate with values
  const headers = ['No', 'Tanggal Posting', 'Nama Produk', 'Judul Konten', 'Jenis Konten', 'Post Type', 'Hook / Headline', 'Caption TikTok', 'Hashtag', 'Link Script', 'Status']
  const rows = params.items.map(item => [
    String(item.row_number),
    item.post_date ?? '',
    item.product_name ?? '',
    item.title ?? '',
    item.content_type ?? '',
    item.post_type ?? '',
    item.hook ?? '',
    item.caption ?? '',
    (item.hashtags ?? []).join(' '),
    '',
    'Menunggu',
  ])

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data: [{ range: 'Sheet1!A1', values: [headers, ...rows] }],
    },
  })

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
