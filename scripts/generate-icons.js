// Simple icon generator script
// Generates placeholder icons for PWA
// Note: Replace these with proper branded icons before production

const fs = require('fs');
const path = require('path');

// Icon sizes to generate
const sizes = [72, 96, 128, 144, 152, 192, 384, 512, 180]; // 180 is for Apple touch icon

// Create a simple SVG template
function createSVG(size) {
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#3b82f6"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.3}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">BB</text>
</svg>`;
}

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate SVG files (these will need to be converted to PNG for production)
// For now, we'll create a note file
const note = `# Icon Generation

Placeholder icons have been set up. For production, you need to:

1. Create proper icons (recommended sizes):
   - 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512 (PNG)
   - 180x180 (Apple touch icon, PNG)

2. Place them in /public/icons/ with these names:
   - icon-72x72.png
   - icon-96x96.png
   - icon-128x128.png
   - icon-144x144.png
   - icon-152x152.png
   - icon-192x192.png
   - icon-384x384.png
   - icon-512x512.png
   - apple-touch-icon.png

3. For quick testing, you can use an online tool like:
   - https://realfavicongenerator.net/
   - https://www.pwabuilder.com/imageGenerator

Or use a design tool to create a 512x512 icon and resize it to all required sizes.
`;

fs.writeFileSync(path.join(iconsDir, 'README.md'), note);

console.log('Icon generation script created.');
console.log('Please create proper PNG icons and place them in /public/icons/');
console.log('See /public/icons/README.md for details.');

