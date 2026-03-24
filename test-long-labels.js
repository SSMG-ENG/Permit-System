const fs = require('fs');

function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function shouldPairFields(f, nf) {
  if (!nf || nf.type==='checkbox') return false;
  if (f.type==='checkbox' || f.type==='textarea') return false;
  const fl=f.id.toLowerCase(), nl=nf.id.toLowerCase();
  const ll=f.label.toLowerCase()+' '+nf.label.toLowerCase();
  if ((fl.includes('date')||ll.includes('date issued'))&&(nl.includes('time')||nl.includes('valid from'))) return true;
  if ((fl.includes('from')&&nl.includes('to'))||(fl.includes('start')&&nl.includes('end'))) return true;
  if (f.label.toLowerCase().includes('name')&&nf.label.toLowerCase().includes('position')) return true;
  return false;
}

function buildSectionHtml(section) {
  let html = '<div class="permit-section"><h2>'+escapeHtml(section.title)+'</h2>';
  const fields = section.fields;
  let i=0, inCbGrid=false;
  while(i<fields.length) {
    const f=fields[i], nf=fields[i+1];
    if(f.type==='checkbox') {
      if(!inCbGrid) { html+='<div class="permit-checkbox-grid">'; inCbGrid=true; }
      html+='<div class="permit-checkbox-row"><span class="permit-checkbox"></span><span>'+escapeHtml(f.label)+'</span></div>';
      i++;
    } else {
      if(inCbGrid) { html+='</div>'; inCbGrid=false; }
      const sp=shouldPairFields(f,nf);
      if(sp&&nf&&nf.type!=='checkbox') {
        html+='<div class="permit-fields-grid"><div class="permit-field permit-field-half"><span class="permit-field-label">'+escapeHtml(f.label)+':</span><span class="permit-field-value blank"></span></div><div class="permit-field permit-field-half"><span class="permit-field-label">'+escapeHtml(nf.label)+':</span><span class="permit-field-value blank"></span></div></div>';
        i+=2;
      } else {
        const isPN = f.id==='permit_number';
        html+='<div class="permit-field"><span class="permit-field-label">'+escapeHtml(f.label)+':</span><span class="permit-field-value'+(isPN?'':' blank')+'">'+(isPN?'HW-001':'')+'</span></div>';
        i++;
      }
    }
  }
  if(inCbGrid) html+='</div>';
  html+='</div>';
  return html;
}

const css = fs.readFileSync('./public/css/style.css','utf8');

// Create a test section with several long labels
let body = '<div class="permit-header"><img src="http://localhost:3000/img/logo.png" class="permit-logo" alt=""><div><h1>LONG LABEL TEST</h1></div></div>';
body += '<div class="permit-body-columns">';

// Add a test section with long labels
body += '<div class="permit-section"><h2>Test: Long Labels</h2>';
const testFields = [
  { id: 'f1', label: 'Scaffold inspection tag number (if applicable)', type: 'text' },
  { id: 'f2', label: 'Isolation Point(s) / Breaker Reference(s)', type: 'text' },
  { id: 'f3', label: 'Authorised By (Name)', type: 'text' },
  { id: 'f4', label: 'Identify any additional hazards', type: 'textarea' },
  { id: 'f5', label: 'Equipment / Circuit to be Isolated', type: 'text' }
];

testFields.forEach(f => {
  body += '<div class="permit-field"><span class="permit-field-label">'+escapeHtml(f.label)+':</span><span class="permit-field-value blank"></span></div>';
});
body += '</div>';

// Add hot-work template
const hotwork = JSON.parse(fs.readFileSync('./templates/hot-work.json'));
hotwork.sections.forEach(s => { body += buildSectionHtml(s); });

body += '</div>';

body += '<div class="permit-footer">Test page for text wrapping.</div>';

const printCss = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 7.5pt; line-height: 1.25; background: #fff; color: #000; }
  .permit-print-area { width: 751px; padding: 0; }
  .permit-header { display: flex; align-items: center; gap: 6px; border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 5px; }
  .permit-logo { max-width: 50px; height: auto; flex-shrink: 0; }
  .permit-header h1 { font-size: 11pt; margin: 0; text-transform: uppercase; font-weight: 700; }
  .permit-body-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 4px; }
  .permit-section { margin-bottom: 4px; }
  .permit-section h2 { font-size: 7pt; padding: 2px 5px; margin-bottom: 3px; border-left: 3px solid #2c3e50; background: #e8e8e8; text-transform: uppercase; letter-spacing: 0.3px; font-weight: 700; }
  .permit-field { display: flex; margin-bottom: 2px; font-size: 7.5pt; line-height: 1.2; align-items: flex-start; gap: 2px; }
  .permit-field-label { max-width: 45%; font-weight: 700; font-size: 7pt; flex-shrink: 1; word-wrap: break-word; overflow-wrap: break-word; padding-top: 1px; }
  .permit-field-value { flex: 1; border-bottom: 1px solid #333; min-height: 1.2em; padding: 0 3px 1px; }
  .permit-field-value.blank { min-width: 60px; }
  .permit-fields-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 2px; }
  .permit-field-half .permit-field-label { max-width: 50%; }
  .permit-checkbox-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1px 4px; }
  .permit-checkbox-row { display: flex; align-items: center; gap: 3px; margin-bottom: 1px; font-size: 7pt; line-height: 1.2; }
  .permit-checkbox { width: 9px; height: 9px; border: 1px solid #333; flex-shrink: 0; display: inline-block; }
  .permit-footer { margin-top: 4px; padding-top: 3px; border-top: 1px solid #000; font-size: 6.5pt; text-align: center; }
`;

const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>${printCss}</style></head>
<body>
<div class="permit-print-area">
${body}
</div>
</body></html>`;

fs.writeFileSync('./public/img/test-long-labels.html', html);
console.log('Generated test-long-labels.html');
