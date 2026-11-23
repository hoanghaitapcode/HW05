import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const THINK_TIME_SECONDS = Number(__ENV.THINK_TIME_SECONDS || 0.4);

export function loadRows() {
  const csv = open('../data/users-products.csv');
  const lines = csv.trim().split(/\r?\n/);
  const headers = lines.shift().split(',');
  return lines.map((line) => {
    const values = line.split(',');
    const row = {};
    headers.forEach((header, index) => { row[header] = values[index]; });
    row.category_id = Number(row.category_id);
    row.product_id = Number(row.product_id);
    row.price = Number(row.price);
    row.quantity = Number(row.quantity);
    return row;
  });
}

export function runJourney(row) {
  const password = __ENV.ESHOP_PASSWORD || row.password;
  if (!password) throw new Error('Set ESHOP_PASSWORD to the seeded test account password.');
  const login = http.post(
    `${BASE_URL}/api/login`,
    JSON.stringify({ email: row.email, password }),
    { headers: { 'Content-Type': 'application/json' }, tags: { endpoint: 'auth-login' } },
  );
  const loginOk = check(login, { 'login returns 200': (r) => r.status === 200 });
  if (!loginOk) return;

  const loginBody = login.json();
  const token = loginBody.token;
  const categoriesResponse = http.get(
    `${BASE_URL}/api/categories`,
    { tags: { endpoint: 'read-categories' } },
  );
  const categoriesOk = check(categoriesResponse, {
    'category list returns 200': (r) => r.status === 200,
    'category list returns an array': (r) => Array.isArray(r.json()),
  });
  if (!categoriesOk) return;
  const category = categoriesResponse.json().find((item) => Number(item.id) === row.category_id);
  if (!check(category, { 'CSV category exists in category list': (item) => Boolean(item) })) return;

  sleep(THINK_TIME_SECONDS);
  const authHeaders = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };
  const addToCart = http.post(
    `${BASE_URL}/api/cart`,
    JSON.stringify({
      id: row.product_id,
      name: row.product_name,
      price: row.price,
      quantity: row.quantity,
    }),
    { ...authHeaders, tags: { endpoint: 'transaction-cart' } },
  );
  check(addToCart, {
    'add to cart returns 200': (r) => r.status === 200,
    'add to cart confirms success': (r) => r.json('message') === 'Added to cart',
  });
}

export function selectedRow(rows) {
  return rows[(__VU + __ITER - 1) % rows.length];
}

export function makeSummary(data) {
  const metric = (name) => data.metrics[name]?.values || {};
  return {
    scenario: __ENV.SCENARIO_NAME || 'unspecified',
    generated_at_utc: new Date().toISOString(),
    requests: metric('http_reqs').count || 0,
    iterations: metric('iterations').count || 0,
    failed_request_rate: metric('http_req_failed').rate ?? null,
    duration_ms: {
      avg: metric('http_req_duration').avg ?? null,
      median: metric('http_req_duration').med ?? null,
      p90: metric('http_req_duration')['p(90)'] ?? null,
      p95: metric('http_req_duration')['p(95)'] ?? null,
      max: metric('http_req_duration').max ?? null,
    },
    data_received_bytes: metric('data_received').count || 0,
    data_sent_bytes: metric('data_sent').count || 0,
  };
}

export function csvSummary(data, scenario) {
  const row = makeSummary(data);
  row.scenario = scenario;
  const values = [
    row.scenario, row.generated_at_utc, row.requests, row.iterations,
    row.failed_request_rate, row.duration_ms.avg, row.duration_ms.median,
    row.duration_ms.p90, row.duration_ms.p95, row.duration_ms.max,
    row.data_received_bytes, row.data_sent_bytes,
  ];
  return [
    'scenario,generated_at_utc,requests,iterations,failed_request_rate,avg_ms,median_ms,p90_ms,p95_ms,max_ms,data_received_bytes,data_sent_bytes',
    values.join(','),
  ].join('\n') + '\n';
}

export function htmlSummary(data, scenario) {
  const s = makeSummary(data);
  s.scenario = scenario;
  const rows = [
    ['Requests', s.requests], ['Workflow iterations', s.iterations],
    ['Failed request rate', s.failed_request_rate], ['Average latency (ms)', s.duration_ms.avg],
    ['Median latency (ms)', s.duration_ms.median], ['p90 latency (ms)', s.duration_ms.p90],
    ['p95 latency (ms)', s.duration_ms.p95], ['Maximum latency (ms)', s.duration_ms.max],
    ['Received bytes', s.data_received_bytes], ['Sent bytes', s.data_sent_bytes],
  ].map(([label, value]) => `<tr><th>${label}</th><td>${value ?? 'n/a'}</td></tr>`).join('');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>${scenario} summary</title><style>body{font:16px system-ui;max-width:900px;margin:3rem auto;padding:0 1rem;color:#172033}table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:.7rem;border-bottom:1px solid #ddd}th{width:55%;background:#f5f7fa}small{color:#596579}</style><h1>${scenario} performance summary</h1><p><small>Generated ${s.generated_at_utc}. Use the accompanying raw k6 JSON-lines file for per-sample evidence.</small></p><table>${rows}</table></html>`;
}
