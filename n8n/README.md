# MR. PLANER — n8n Workflows

## Setup

1. Install n8n di Hostinger VPS:
```bash
npm install -g n8n
# Atau gunakan Docker:
docker run -it --rm --name n8n -p 5678:5678 n8nio/n8n
```

2. Buka n8n UI: `http://your-vps-ip:5678`

3. Setup Credentials di n8n:
   - **Telegram Bot** (ID: 1): masukkan Bot Token dari @BotFather
   - **Supabase DB** (ID: 2): masukkan PostgreSQL connection string dari Supabase
   - **Supabase** (ID: 3): masukkan Supabase URL + Service Role Key
   - **OpenRouter API** (ID: 4): Header Auth `Authorization: Bearer sk-or-v1-...`

4. Import workflow JSON:
   - Settings > Import workflow > pilih file JSON

5. Set Environment Variables di n8n:
```
TELEGRAM_BOT_TOKEN=...
SERPAPI_KEY=...
NEXT_PUBLIC_URL=https://mr-planer.vercel.app
```

6. Set Telegram Webhook:
```
curl -X POST "https://api.telegram.org/bot{TOKEN}/setWebhook" \
  -d "url=https://your-n8n-domain.com/webhook/telegram"
```

## Workflows

| File | Nama | Trigger |
|---|---|---|
| WF-01 | Telegram Bot Router | Telegram Webhook |
| WF-02 | Product Analyzer | POST /webhook/analyze-product |
| WF-03 | Content Plan Generator | POST /webhook/generate-content-plan |
| WF-04 | Script Generator | POST /webhook/generate-script |
| WF-05 | Google Trends Fetcher | Cron daily + POST /webhook/fetch-trends |

## Flow WF-01 → WF-02/03/04

WF-01 menerima semua pesan Telegram. Setelah routing command,
WF-01 memanggil webhook WF-02/03/04 dengan data yang diperlukan.
Tambahkan node HTTP Request di WF-01 untuk setiap routing command.
