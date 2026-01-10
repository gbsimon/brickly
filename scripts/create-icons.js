#!/usr/bin/env node

/**
 * Icon Generator for BrickByBrick PWA
 * Resizes web-app-manifest-512x512.png to all required sizes
 * 
 * Run: npm run generate-icons
 * 
 * Note: This requires 'sharp' to be installed (already in devDependencies)
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
const sourceIcon = path.join(iconsDir, 'web-app-manifest-512x512.png');

// Check if source icon exists
if (!fs.existsSync(sourceIcon)) {
  console.error(`Error: Source icon not found at ${sourceIcon}`);
  console.error('Please ensure web-app-manifest-512x512.png exists in public/icons/');
  process.exit(1);
}

// Icon sizes to generate (including 512x512 to replace icon-512x512.png)
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

async function generateIcons() {
  console.log('Resizing web-app-manifest-512x512.png to all required sizes...\n');

  // Read the source image
  const sourceBuffer = fs.readFileSync(sourceIcon);
  const sourceImage = sharp(sourceBuffer);

  for (const { size, name } of iconSizes) {
    try {
      const outputPath = path.join(iconsDir, name);
      
      // Resize the source image to the target size
      await sourceImage
        .clone()
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
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

