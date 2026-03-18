import 'dotenv/config';

const API_BASE = 'https://toapis.com';
const API_KEY = process.env.TOAPIS_KEY;
const taskId = process.argv[2];

if (!API_KEY || !taskId) {
  console.error('Usage: node check-task.mjs <task_id>');
  process.exit(1);
}

const r = await fetch(`${API_BASE}/v1/images/generations/${taskId}`, {
  headers: { Authorization: `Bearer ${API_KEY}` },
});
const data = await r.json();
console.log(JSON.stringify(data, null, 2));
