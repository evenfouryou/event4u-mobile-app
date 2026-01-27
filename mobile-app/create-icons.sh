#!/bin/bash
# Script per creare le icone dell'app Event4U
# Esegui questo script nella cartella mobile-app

cd "$(dirname "$0")/assets"

# Crea icone usando Node.js e sharp
cat > ../generate-icons-temp.js << 'NODESCRIPT'
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function createIconFromLogo(size, filename) {
  const logoPath = path.join(__dirname, 'assets', 'logo-source.png');
  
  if (!fs.existsSync(logoPath)) {
    console.log('logo-source.png non trovato, creo icona semplice...');
    // Crea icona viola semplice se non c'è il logo
    const buffer = await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 124, g: 58, b: 237, alpha: 1 }
      }
    })
    .png({ compressionLevel: 6 })
    .toBuffer();
    
    fs.writeFileSync(path.join(__dirname, 'assets', filename), buffer);
    console.log(`Created ${filename} (${size}x${size})`);
    return;
  }
  
  const logoBuffer = await sharp(logoPath)
    .resize(Math.round(size * 0.65), Math.round(size * 0.65), { 
      fit: 'contain', 
      background: { r: 0, g: 0, b: 0, alpha: 0 } 
    })
    .toBuffer();

  const result = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 15, g: 15, b: 20, alpha: 1 }
    }
  })
  .composite([{
    input: logoBuffer,
    gravity: 'center'
  }])
  .png({ compressionLevel: 6 })
  .toBuffer();

  fs.writeFileSync(path.join(__dirname, 'assets', filename), result);
  console.log(`Created ${filename} (${size}x${size}) - ${result.length} bytes`);
}

async function main() {
  await createIconFromLogo(1024, 'icon.png');
  await createIconFromLogo(1024, 'adaptive-icon.png');
  await createIconFromLogo(1024, 'splash-icon.png');
  await createIconFromLogo(48, 'favicon.png');
  console.log('Tutte le icone create!');
}

main().catch(console.error);
NODESCRIPT

node generate-icons-temp.js
rm generate-icons-temp.js

echo ""
echo "Icone create! Ora puoi fare:"
echo "  git add ."
echo "  git commit -m 'Update app icons with Event4U logo'"
echo "  git push origin main"
echo "  npx eas build --platform ios --profile production --clear-cache"
