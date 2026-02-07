const fs = require('fs');
const path = require('path');

// Source: node_modules/web-ifc/
// Destination: public/wasm/

const sourceDir = path.join(__dirname, '..', 'node_modules', 'web-ifc');
const destDir = path.join(__dirname, '..', 'public', 'wasm');

// Create destination directory if it doesn't exist
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
  console.log('✅ Created public/wasm/ directory');
}

// Files to copy
const wasmFiles = [
  'web-ifc.wasm',
  'web-ifc-mt.wasm'
];

// Copy each file
wasmFiles.forEach(file => {
  const source = path.join(sourceDir, file);
  const dest = path.join(destDir, file);
  
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, dest);
    console.log(`✅ Copied ${file} to public/wasm/`);
  } else {
    console.warn(`⚠️  ${file} not found in node_modules/web-ifc/`);
  }
});

console.log('🎉 WASM files copied successfully!');
