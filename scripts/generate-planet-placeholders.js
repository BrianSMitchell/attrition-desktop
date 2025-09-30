const fs = require('fs');
const path = require('path');

const planetTypes = {
  'Arid': 'sandybrown',
  'Asteroid': 'dimgray',
  'Craters': 'darkgray',
  'Crystalline': 'lightcyan',
  'Earthly': 'forestgreen',
  'Gaia': 'darkseagreen',
  'Glacial': 'powderblue',
  'Magma': 'orangered',
  'Metallic': 'silver',
  'Oceanic': 'royalblue',
  'Radioactive': 'greenyellow',
  'Rocky': 'sienna',
  'Toxic': 'purple',
  'Tundra': 'whitesmoke',
  'Volcanic': 'darkred'
};

const outputDir = path.join(__dirname, '..', 'assets', 'planets');
const imageSize = 64;

// Ensure the output directory exists
if (!fs.existsSync(outputDir)) {
  console.log(`Creating directory: ${outputDir}`);
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('Generating placeholder planet assets...');

for (const [name, color] of Object.entries(planetTypes)) {
  const filename = `${name.toLowerCase()}.svg`;
  const filepath = path.join(outputDir, filename);

  const svgContent = `
<svg width="${imageSize}" height="${imageSize}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${color}" />
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="10" fill="white">
    ${name}
  </text>
</svg>
`.trim();

  fs.writeFileSync(filepath, svgContent);
  console.log(`- Created ${filepath}`);
}

console.log('\nAsset generation complete!');
