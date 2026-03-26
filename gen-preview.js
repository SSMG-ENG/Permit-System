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

function buildSectionHtml(section, data, isBlank) {
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

let body = '<div class="permit-header"><img src="http://localhost:3000/img/logo.png" class="permit-logo" alt=""><div><h1>'+escapeHtml(template.name)+'</h1></div></div>';
body += '<div class="permit-body-columns">';
template.sections.forEach(s => { body += buildSectionHtml(s, {permit_number:'HW-001'}, true); });
body += '</div>';

body += '<div class="permit-handwritten-row">';
template.handwrittenSections.forEach(s => {
  body += '<div class="permit-handwritten-section"><h2>'+escapeHtml(s.title)+'</h2>';
  if(s.description) body += '<div class="permit-handwritten-description">'+escapeHtml(s.description)+'</div>';
  if(s.fields) s.fields.forEach(f => {
    body += '<div class="permit-handwritten-field">';
    const highlightClass = f.highlight ? ' highlight' : '';
    body += '<div class="permit-handwritten-field-label'+highlightClass+'">'+escapeHtml(f.label)+':</div>';
    for(let j=0;j<(f.lines||1);j++) body += '<div class="permit-handwritten-line"></div>';
    body += '</div>';
  });
  body += '</div>';
});
body += '</div>';

body += '<div class="permit-footer">This permit is only valid for the date, time, and location specified above. All conditions must be met before work commences. Retain this permit at the worksite.</div>';

const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>${css}</style>
</head>
<body style="background:#fff;padding:0;margin:0;">
<div class="permit-print-area" style="margin:0;padding:10mm;box-shadow:none;">
${body}
</div>
</body></html>`;

fs.writeFileSync('./public/img/hot-work-preview.html', html);
console.log('Generated hot-work-preview.html');
