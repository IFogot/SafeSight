import fs from 'fs';
import vm from 'node:vm';

const code = fs.readFileSync('line-webhook-worker.js', 'utf8');
try {
  new vm.Script(code.replace(/export default/, 'const exported ='));
  console.log('Valid JS script!');
} catch (e) {
  console.error('VM Error:', e.stack);
}
