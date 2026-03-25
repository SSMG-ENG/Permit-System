const fs = require('fs');
const template = JSON.parse(fs.readFileSync('./templates/hot-work.json'));

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

let body = '<div class="permit-header"><img src="http://localhost:3000/img/logo.png" class="permit-logo" alt=""><div><h1>'+escapeHtml(template.name)+'</h1></div></div>';
body += '<div class="permit-body-columns">';
template.sections.forEach(s => { body += buildSectionHtml(s); });
body += '</div>';

body += '<div class="permit-handwritten-row">';
template.handwrittenSections.forEach(s => {
  body += '<div class="permit-handwritten-section"><h2>'+escapeHtml(s.title)+'</h2>';
  if(s.description) body += '<div class="permit-handwritten-description">'+escapeHtml(s.description)+'</div>';
  if(s.fields) s.fields.forEach(f => {
    body += '<div class="permit-handwritten-field">';
    body += '<div class="permit-handwritten-field-label">'+escapeHtml(f.label)+':</div>';
    for(let j=0;j<(f.lines||1);j++) body += '<div class="permit-handwritten-line"></div>';
    body += '</div>';
  });
  body += '</div>';
});
body += '</div>';

body += '<div class="permit-footer">This permit is only valid for the date, time, and location specified above. All conditions must be met before work commences. Retain this permit at the worksite.</div>';

// Simulate print layout at A4 dimensions (595pt x 842pt, A4 at 96dpi = 794x1123px, minus 6mm margins each side = ~751x1080)
// Use inline print-equivalent CSS
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
  .permit-field { display: flex; margin-bottom: 2px; font-size: 7.5pt; line-height: 1.2; align-items: flex-end; }
  .permit-field-label { font-weight: 700; min-width: 90px; flex-shrink: 0; font-size: 7pt; line-height: 1.2; }
  .permit-field-value { flex: 1; border-bottom: 1px solid #333; min-height: 1.2em; padding: 0 3px 1px; }
  .permit-field-value.blank { min-width: 80px; }
  .permit-fields-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 2px; }
  .permit-field-half .permit-field-label { min-width: 70px; }
  .permit-checkbox-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1px 4px; }
  .permit-checkbox-row { display: flex; align-items: center; gap: 3px; margin-bottom: 1px; font-size: 7pt; line-height: 1.2; }
  .permit-checkbox { width: 9px; height: 9px; border: 1px solid #333; flex-shrink: 0; display: inline-block; }
  .permit-handwritten-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-top: 4px; }
  .permit-handwritten-section { background: #fafafa; padding: 4px; border-radius: 2px; }
  .permit-handwritten-section h2 { font-size: 7pt; padding: 2px 5px; margin: -4px -4px 4px -4px; border-left: 3px solid #555; background: #d9d9d9; text-transform: uppercase; letter-spacing: 0.3px; font-weight: 700; }
  .permit-handwritten-description { font-size: 6.5pt; margin-bottom: 3px; line-height: 1.2; color: #555; font-style: italic; }
  .permit-handwritten-field { margin-bottom: 3px; }
  .permit-handwritten-field-label { font-size: 6.5pt; font-weight: 700; margin-bottom: 1px; background-color: #ffeb3b; padding: 1px 2px; border-radius: 1px; display: inline-block; }
  .permit-handwritten-line { height: 16px; border-bottom: 1px solid #666; background: #fff; margin-bottom: 1px; }
  .permit-footer { margin-top: 4px; padding-top: 3px; border-top: 1px solid #000; font-size: 6.5pt; text-align: center; }
`;

const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>${printCss}</style></head>
<body>
<div class="permit-print-area">
${body}
</div>
</body></html>`;

fs.writeFileSync('./public/img/hot-work-print-sim.html', html);
console.log('Generated hot-work-print-sim.html');
