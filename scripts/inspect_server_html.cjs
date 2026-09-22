const fs = require('fs');

fetch('http://localhost:3001/').then(r => r.text()).then(html => {
  console.log('HTML from server length:', html.length);
  console.log('HTML preview:', html.slice(0, 1000));
}).catch(console.error);
