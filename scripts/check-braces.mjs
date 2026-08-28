import fs from 'fs';

const code = fs.readFileSync('line-webhook-worker.js', 'utf8');
const lines = code.split('\n');

let depth = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  let inStr = false;
  let quote = '';
  const prevDepth = depth;
  for (let j = 0; j < line.length; j++) {
    const ch = line[j];
    if (!inStr && (ch === '"' || ch === "'" || ch === '`')) {
      inStr = true;
      quote = ch;
    } else if (inStr && ch === quote && line[j-1] !== '\\') {
      inStr = false;
    } else if (!inStr) {
      if (ch === '/' && line[j+1] === '/') break;
      if (ch === '{') depth++;
      if (ch === '}') depth--;
    }
  }
  if (line.includes('function ') && depth === 1 && prevDepth === 0) {
    // top level function start
  } else if (depth === 0 && prevDepth > 0) {
    // top level function or block end
    console.log(`Top-level closed at line ${i+1}: ${line.trim()}`);
  }
}
console.log('Final depth:', depth);
