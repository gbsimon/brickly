# PWA Icons

This directory should contain the following icon files for the PWA:

## Required Icons

- `icon-72x72.png` - 72x72 pixels
- `icon-96x96.png` - 96x96 pixels
- `icon-128x128.png` - 128x128 pixels
- `icon-144x144.png` - 144x144 pixels
- `icon-152x152.png` - 152x152 pixels
- `icon-192x192.png` - 192x192 pixels (Android)
- `icon-384x384.png` - 384x384 pixels
- `icon-512x512.png` - 512x512 pixels (Android)
- `apple-touch-icon.png` - 180x180 pixels (iOS)

## Quick Generation

You can generate these icons using:

1. **Online Tools:**
   - https://realfavicongenerator.net/
   - https://www.pwabuilder.com/imageGenerator
   - https://www.favicon-generator.org/

2. **Design Tool:**
   - Create a 512x512px icon in your design tool
   - Export/resize to all required sizes
   - Ensure icons are square and have proper padding

3. **Command Line (if you have ImageMagick):**
   ```bash
   # Assuming you have a source icon.png (512x512)
   convert icon.png -resize 72x72 icon-72x72.png
   convert icon.png -resize 96x96 icon-96x96.png
   # ... repeat for all sizes
   ```

## Testing

For testing purposes, you can create simple colored square placeholders. The PWA will work without icons, but they're required for a proper "Add to Home Screen" experience.
