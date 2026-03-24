const fs = require('fs');
const XLSX = require('xlsx');

const settings = JSON.parse(fs.readFileSync('data/settings.json', 'utf8'));
const workbook = XLSX.readFile(settings.contractorsFile, { cellText: true, cellDates: false });
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
const headers = rows[1] || [];

console.log('Headers');
headers.forEach((header, index) => {
  console.log(index + ': ' + JSON.stringify(header));
});

console.log('--- sample rows ---');
for (let rowIndex = 2; rowIndex < Math.min(rows.length, 8); rowIndex += 1) {
  const row = rows[rowIndex] || [];
  const values = row
    .map((value, index) => ({ index, value }))
    .filter(item => String(item.value || '').trim() !== '')
    .map(item => item.index + ': ' + JSON.stringify(item.value));
  console.log('row ' + (rowIndex + 1) + ': ' + values.join(' | '));
}
