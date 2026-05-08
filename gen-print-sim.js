const fs = require('fs');
const { buildPermitHtml, escapeHtml } = require('./shared/permit-render');
const template = JSON.parse(fs.readFileSync('./templates/hot-work.json'));

const css = fs.readFileSync('./public/css/layout.css','utf8')
  + '\n' + fs.readFileSync('./public/css/components.css','utf8')
  + '\n' + fs.readFileSync('./public/css/print.css','utf8');

const body = buildPermitHtml(template, { permit_number: 'HW-001' }, true);

const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>${css}</style></head>
<body>
<div class="permit-print-area">
${body}
</div>
</body></html>`;

fs.writeFileSync('./public/img/hot-work-print-sim.html', html);
console.log('Generated hot-work-print-sim.html');
