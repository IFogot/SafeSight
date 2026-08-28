import fs from 'fs';

console.log('Testing line-webhook-worker.js loading...');
const code = fs.readFileSync('line-webhook-worker.js', 'utf8');

try {
  const testFn = new Function(code.replace(/export default/, 'const exported ='));
  testFn();
  console.log('✅ Worker code parses and executes correctly!');
} catch (err) {
  console.error('❌ Syntax or execution error in worker:', err);
  process.exit(1);
}
