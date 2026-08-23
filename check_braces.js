const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\alejandro.calisaya\\Documents\\dashboard-ventas\\js\\app.js', 'utf8');
let braceCount = 0;
let parenCount = 0;
let inString = false;
let stringChar = '';
let escapeNext = false;
let lineNum = 1;

for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    
    if (ch === '\n') lineNum++;
    
    if (escapeNext) {
        escapeNext = false;
        continue;
    }
    
    if (ch === '\\') {
        escapeNext = true;
        continue;
    }
    
    if (inString) {
        if (ch === stringChar) {
            inString = false;
        }
        continue;
    }
    
    if (ch === '"' || ch === "'" || ch === '`') {
        inString = true;
        stringChar = ch;
        continue;
    }
    
    if (ch === '{') braceCount++;
    if (ch === '}') {
        braceCount--;
        if (braceCount < 0) {
            console.log('Negative brace count at line', lineNum, 'pos', i);
            break;
        }
    }
    if (ch === '(') parenCount++;
    if (ch === ')') {
        parenCount--;
        if (parenCount < 0) {
            console.log('Negative paren count at line', lineNum, 'pos', i);
            break;
        }
    }
}

console.log('Final brace count:', braceCount);
console.log('Final paren count:', parenCount);