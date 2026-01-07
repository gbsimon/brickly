#!/usr/bin/env node

/**
 * Icon Generator for BrickByBrick PWA
 * Creates placeholder icons in all required sizes
 * 
 * Run: node scripts/create-icons.js
 * 
 * Note: This requires 'sharp' to be installed:
 * npm install --save-dev sharp
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('Error: sharp is not installed.');
  console.error('Please run: npm install --save-dev sharp');
  process.exit(1);
}

const iconsDir = path.join(__dirname, '../public/icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Icon sizes to generate
const iconSizes = [
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
];

// Create an SVG template
function createSVG(size) {
  const fontSize = Math.floor(size * 0.3);
  const padding = Math.floor(size * 0.1);
  
  return `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2563eb;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#grad)" rx="${size * 0.15}"/>
  <text 
    x="50%" 
    y="50%" 
    font-family="Arial, sans-serif" 
    font-size="${fontSize}" 
    font-weight="bold" 
    fill="white" 
    text-anchor="middle" 
    dominant-baseline="middle"
    style="text-shadow: 0 2px 4px rgba(0,0,0,0.2);"
  >BB</text>
</svg>`;
}

async function generateIcons() {
  console.log('Generating PWA icons...\n');

  for (const { size, name } of iconSizes) {
    try {
      const svg = createSVG(size);
      const outputPath = path.join(iconsDir, name);
      
      // Convert SVG to PNG using sharp
      await sharp(Buffer.from(svg))
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Created ${name} (${size}x${size})`);
    } catch (error) {
      console.error(`✗ Failed to create ${name}:`, error.message);
    }
  }

  console.log('\n✓ All icons generated successfully!');
  console.log(`Icons saved to: ${iconsDir}`);
}

// Run the generator
generateIcons().catch((error) => {
  console.error('Error generating icons:', error);
  process.exit(1);
});

