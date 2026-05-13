import https from 'https';

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0OWUyYjc5Ny04ZDEwLTQ5NWYtOTIwZS0zNTJlZTRiYmNlMjEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMDQxZjE3MDUtMjEyOC00MGZjLWJlNDQtOTJhYzYyNThjNWFkIiwiaWF0IjoxNzc3OTcxNDUzfQ.8hhdsbOSQYL95pQ_dhCgtwfFPTirv5Dfy3r-QG5Je14';
const N8N = 'n8n.srv1423352.hstgr.cloud';

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = https.request({
      hostname: N8N, path, method,
      headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) }
    }, res => { let b = ''; res.on('data', c => b += c); res.on('end', () => resolve({ s: res.statusCode, b: JSON.parse(b) })); });
    r.on('error', reject); if (data) r.write(data); r.end();
  });
}

async function deactReact(id) {
  await req('POST', `/api/v1/workflows/${id}/deactivate`);
  const { s, b } = await req('POST', `/api/v1/workflows/${id}/activate`);
  return s === 200;
}

// ── FIX 1: WF-01 — fix HTTP Request nodes body format ──────────────────────
async function fixWf01() {
  const { b: wf } = await req('GET', '/api/v1/workflows/NABwYQobx1GQzFCh');

  const bodyFor = (path, extraFields) => ({
    method: 'POST',
    url: "https://" + N8N + "/webhook/" + path,
    sendBody: true,
    contentType: 'json',
    specifyBody: 'json',
    // jsonBody sends data as proper JSON object (not double-stringified)
    jsonBody: "={{ JSON.stringify({ chatId: $('Parse Message').item.json.chatId, telegramUserId: $('Parse Message').item.json.userId, dbUserId: $json.id, " + extraFields + " }) }}",
    options: {}
  });

  const fixedNodes = wf.nodes.map(n => {
    if (n.id === 'call-wf02') return { ...n, parameters: bodyFor('analyze-product',
      "photoFileId: $('Parse Message').item.json.photo?.slice(-1)[0]?.file_id, description: $('Parse Message').item.json.args") };
    if (n.id === 'call-wf03') return { ...n, parameters: bodyFor('generate-content-plan',
      "durationDays: parseInt($('Parse Message').item.json.args) || 7") };
    if (n.id === 'call-wf04') return { ...n, parameters: bodyFor('generate-script',
      "rowNumber: parseInt($('Parse Message').item.json.args) || 1") };
    return n;
  });

  const { s } = await req('PUT', '/api/v1/workflows/NABwYQobx1GQzFCh',
    { name: wf.name, nodes: fixedNodes, connections: wf.connections, settings: wf.settings || {} });
  const ok = await deactReact('NABwYQobx1GQzFCh');
  console.log(ok ? '✓ WF-01 fixed' : '✗ WF-01 activate failed');
}

// ── FIX 2: WF-02/03/04 — add Normalize node that unwraps $json.body → $json ─
const NORMALIZE_CODE = `// Webhook body arrives as $json.body.* — unwrap to $json.*
const data = $json.body || $json;
return [{ json: data }];`;

async function addNormalizeNode(wfId, wfName) {
  const { b: wf } = await req('GET', `/api/v1/workflows/${wfId}`);

  // Remove existing normalize node if present
  const baseNodes = wf.nodes.filter(n => n.id !== 'normalize-input');

  // Find the webhook trigger node name
  const webhookNode = baseNodes.find(n => n.type === 'n8n-nodes-base.webhook');
  if (!webhookNode) { console.log('No webhook in', wfName); return; }

  // Add normalize node between webhook and next node
  const normalizeNode = {
    id: 'normalize-input',
    name: 'Normalize Input',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [webhookNode.position[0] + 220, webhookNode.position[1]],
    parameters: { jsCode: NORMALIZE_CODE }
  };

  // Update connections: webhook → normalize → [original next node]
  const conns = { ...wf.connections };
  const origNextNodes = conns[webhookNode.name]?.main?.[0] || [];
  conns[webhookNode.name] = { main: [[{ node: 'Normalize Input', type: 'main', index: 0 }]] };
  conns['Normalize Input'] = { main: [origNextNodes] };

  const { s } = await req('PUT', `/api/v1/workflows/${wfId}`,
    { name: wf.name, nodes: [...baseNodes, normalizeNode], connections: conns, settings: wf.settings || {} });
  const ok = await deactReact(wfId);
  console.log(ok ? `✓ ${wfName} normalized` : `✗ ${wfName} failed`);
}

await fixWf01();
await addNormalizeNode('YUtQO5eQiGBeOmZA', 'WF-02');
await addNormalizeNode('1SJ1Zp0K1jE9Nac9', 'WF-03');
await addNormalizeNode('E94EMtV4UZPfqXEU', 'WF-04');

// Quick smoke test
await new Promise(r => setTimeout(r, 1500));
const result = await new Promise(resolve => {
  const body = JSON.stringify({ chatId: 'test', telegramUserId: 0, dbUserId: null });
  https.request({ hostname: N8N, path: '/webhook/analyze-product', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  }, res => { let b = ''; res.on('data', c => b += c); res.on('end', () => resolve(res.statusCode)); })
  .on('error', () => resolve(0)).end(body);
});
console.log('\nWebhook smoke test:', result === 200 ? '✓ 200 OK' : `HTTP ${result}`);
