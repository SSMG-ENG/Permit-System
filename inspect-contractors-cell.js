const fs = require('fs');
const XLSX = require('xlsx');

const settings = JSON.parse(fs.readFileSync('data/settings.json', 'utf8'));
const workbook = XLSX.readFile(settings.contractorsFile, { cellText: true, cellDates: false, cellNF: true, cellStyles: true });
const sheet = workbook.Sheets[workbook.SheetNames[0]];

['A1', 'A2', 'A3', 'B3', 'A4', 'A5', 'A6', 'A7'].forEach(cellRef => {
  console.log(cellRef, JSON.stringify(sheet[cellRef] || null));
});
