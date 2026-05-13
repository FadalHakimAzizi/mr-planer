import https from 'https';

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0OWUyYjc5Ny04ZDEwLTQ5NWYtOTIwZS0zNTJlZTRiYmNlMjEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMDQxZjE3MDUtMjEyOC00MGZjLWJlNDQtOTJhYzYyNThjNWFkIiwiaWF0IjoxNzc3OTcxNDUzfQ.8hhdsbOSQYL95pQ_dhCgtwfFPTirv5Dfy3r-QG5Je14';
const N8N = 'n8n.srv1423352.hstgr.cloud';
const WF_ID = 'NABwYQobx1GQzFCh';

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = https.request({
      hostname: N8N, path, method,
      headers: {
        'X-N8N-API-KEY': API_KEY,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ s: res.statusCode, b: JSON.parse(b) }));
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

// Build UPSERT node — query is a pure n8n expression, no parameterized queries
// $json = output of Parse Message node (userId=number, username=string)
const upsertUserNode = {
  id: 'upsert-user',
  name: 'Upsert User',
  type: 'n8n-nodes-base.postgres',
  typeVersion: 2.5,
  position: [680, 300],
  credentials: { postgres: { id: 'FAp93leIeUwKDX59', name: 'Postgres planner' } },
  parameters: {
    operation: 'executeQuery',
    // Expression-based query — values embedded directly, no $1/$2 params needed
    query: "={{ 'INSERT INTO public.users (telegram_id, full_name) VALUES (' + $json.userId + ', ' + \"'\" + String($json.username || '').replace(/'/g, \"''\") + \"') ON CONFLICT (telegram_id) DO UPDATE SET full_name = COALESCE(EXCLUDED.full_name, public.users.full_name) RETURNING id, telegram_id, full_name, role, plan_type\" }}",
    options: {}
  }
};

const callWf02Node = {
  id: 'call-wf02',
  name: 'Call WF-02 Analyzer',
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  position: [1740, 100],
  parameters: {
    method: 'POST',
    url: "https://" + N8N + "/webhook/analyze-product",
    sendBody: true,
    contentType: 'json',
    body: "={{ JSON.stringify({ chatId: $('Parse Message').item.json.chatId, telegramUserId: $('Parse Message').item.json.userId, photoFileId: $('Parse Message').item.json.photo?.slice(-1)[0]?.file_id, description: $('Parse Message').item.json.args, dbUserId: $json.id }) }}",
    options: {}
  }
};

const callWf03Node = {
  id: 'call-wf03',
  name: 'Call WF-03 Content Plan',
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  position: [1520, 400],
  parameters: {
    method: 'POST',
    url: "https://" + N8N + "/webhook/generate-content-plan",
    sendBody: true,
    contentType: 'json',
    body: "={{ JSON.stringify({ chatId: $('Parse Message').item.json.chatId, telegramUserId: $('Parse Message').item.json.userId, durationDays: parseInt($('Parse Message').item.json.args) || 7, dbUserId: $json.id }) }}",
    options: {}
  }
};

const callWf04Node = {
  id: 'call-wf04',
  name: 'Call WF-04 Script',
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  position: [1520, 480],
  parameters: {
    method: 'POST',
    url: "https://" + N8N + "/webhook/generate-script",
    sendBody: true,
    contentType: 'json',
    body: "={{ JSON.stringify({ chatId: $('Parse Message').item.json.chatId, telegramUserId: $('Parse Message').item.json.userId, rowNumber: parseInt($('Parse Message').item.json.args) || 1, dbUserId: $json.id }) }}",
    options: {}
  }
};

const { b: wf } = await req('GET', `/api/v1/workflows/${WF_ID}`);

const replaceIds = new Set(['upsert-user', 'call-wf02', 'call-wf03', 'call-wf04']);
const allNodes = [
  ...wf.nodes.filter(n => !replaceIds.has(n.id)),
  upsertUserNode, callWf02Node, callWf03Node, callWf04Node
];

const conns = { ...wf.connections };
delete conns['Find User in DB'];
delete conns['User Exists?'];
delete conns['Create New User'];
conns['Telegram Trigger'] = { main: [[{ node: 'Parse Message',   type: 'main', index: 0 }]] };
conns['Parse Message']    = { main: [[{ node: 'Upsert User',     type: 'main', index: 0 }]] };
conns['Upsert User']      = { main: [[{ node: 'Command Router',  type: 'main', index: 0 }]] };

const updated = { name: wf.name, nodes: allNodes, connections: conns, settings: wf.settings || {} };
const { s: ps, b: pr } = await req('PUT', `/api/v1/workflows/${WF_ID}`, updated);
if (ps !== 200) { console.error('PUT failed:', JSON.stringify(pr).slice(0, 400)); process.exit(1); }
console.log(`PUT OK — ${allNodes.length} nodes`);

await req('POST', `/api/v1/workflows/${WF_ID}/deactivate`);
const { s: as, b: act } = await req('POST', `/api/v1/workflows/${WF_ID}/activate`);
console.log(as === 200 ? '✓ WF-01 active!' : '✗ ' + JSON.stringify(act).slice(0, 300));
