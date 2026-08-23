const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\alejandro.calisaya\\Documents\\dashboard-ventas\\js\\app.js', 'utf8');
let braceCount = 0;
let lineNum = 1;
let inString = false;
let stringChar = '';
let escapeNext = false;

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
    
    if (ch === '{') {
        braceCount++;
        console.log('Line', lineNum, 'pos', i, ': {  count=', braceCount);
    }
    if (ch === '}') {
        braceCount--;
        console.log('Line', lineNum, 'pos', i, ': }  count=', braceCount);
        if (braceCount < 0) {
            console.log('NEGATIVE at line', lineNum, 'pos', i);
            break;
        }
    }
}

console.log('Final brace count:', braceCount);