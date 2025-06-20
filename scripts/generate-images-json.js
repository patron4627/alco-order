const fs = require('fs');
const path = require('path');

const imagesDir = path.join(__dirname, '../public/images');
const files = fs.readdirSync(imagesDir);
const imageFiles = files.filter(file =>
  /\.(jpe?g|png|gif|webp)$/i.test(file)
);

fs.writeFileSync(
  path.join(__dirname, '../src/images.json'),
  JSON.stringify(imageFiles.map(f => `/images/${f}`), null, 2)
);

console.log('Bilder-Liste generiert:', imageFiles.length, 'Bilder gefunden.'); 