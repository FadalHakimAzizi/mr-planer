import { NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function GET() {
  const out: Record<string, unknown> = {}

  // Step 1: check env vars
  const email = process.env.GOOGLE_CLIENT_EMAIL ?? ''
  const rawKey = process.env.GOOGLE_PRIVATE_KEY ?? ''
  out.email = email ? email.slice(0, 20) + '...' : 'MISSING'
  out.keyLength = rawKey.length
  out.keyStart = rawKey.slice(0, 40)
  out.hasLiteralNewline = rawKey.includes('\\n')
  out.hasRealNewline = rawKey.includes('\n')

  // Step 2: parse key
  const privateKey = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey
  out.parsedKeyStart = privateKey.slice(0, 40)
  out.parsedKeyHasNewline = privateKey.includes('\n')

  // Step 3: try authorize
  try {
    const client = new google.auth.JWT({
      email,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
    const token = await client.authorize()
    out.authOk = true
    out.tokenType = token.token_type
    out.tokenExpiry = token.expiry_date

    // Step 4: try sheets.create
    try {
      const sheets = google.sheets({ version: 'v4', auth: client })
      const res = await sheets.spreadsheets.create({
        requestBody: { properties: { title: 'Debug Test' } },
      })
      out.sheetsCreateOk = true
      out.spreadsheetId = res.data.spreadsheetId
    } catch (e) {
      out.sheetsCreateOk = false
      out.sheetsCreateError = e instanceof Error ? e.message : String(e)
    }

    // Step 5: try drive.files.create with Sheets MIME type
    try {
      const drive = google.drive({ version: 'v3', auth: client })
      const res = await drive.files.create({
        requestBody: {
          name: 'Debug Test via Drive',
          mimeType: 'application/vnd.google-apps.spreadsheet',
        },
        fields: 'id, name',
      })
      out.driveCreateOk = true
      out.driveSpreadsheetId = res.data.id
    } catch (e) {
      out.driveCreateOk = false
      out.driveCreateError = e instanceof Error ? e.message : String(e)
    }
  } catch (e) {
    out.authOk = false
    out.authError = e instanceof Error ? e.message : String(e)
  }

  return NextResponse.json(out)
}
