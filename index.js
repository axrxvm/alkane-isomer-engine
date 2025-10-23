const { generateIsomerCount } = require('./lib/generator');

const arg = process.argv[2];
if (!arg) {
  console.log('Usage: node index.js <n>');
  process.exit(1);
}

const n = parseInt(arg, 10);
if (isNaN(n) || n < 1) {
  console.log('Invalid n');
  process.exit(1);
}

console.time('Generation');
const { count } = generateIsomerCount(n, { resume: true });
console.timeEnd('Generation');

console.log(`Structural isomers of C${n}H${2 * n + 2}: ${count}`);
