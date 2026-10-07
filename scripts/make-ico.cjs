const fs = require('fs');
const path = require('path');

const pngPath = path.resolve(__dirname, '../packages/web/public/logo.png');
const icoPath = path.resolve(__dirname, '../src-tauri/icons/icon.ico');

const pngBuffer = fs.readFileSync(pngPath);
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // Reserved
header.writeUInt16LE(1, 2); // Type 1 (ICO)
header.writeUInt16LE(1, 4); // 1 Image

const dirEntry = Buffer.alloc(16);
dirEntry.writeUInt8(0, 0); // Width 256
dirEntry.writeUInt8(0, 1); // Height 256
dirEntry.writeUInt8(0, 2); // Colors
dirEntry.writeUInt8(0, 3); // Reserved
dirEntry.writeUInt16LE(1, 4); // Planes
dirEntry.writeUInt16LE(32, 6); // Bits per pixel
dirEntry.writeUInt32LE(pngBuffer.length, 8); // Size in bytes
dirEntry.writeUInt32LE(22, 12); // Offset (6 + 16 = 22)

const icoBuffer = Buffer.concat([header, dirEntry, pngBuffer]);
fs.mkdirSync(path.dirname(icoPath), { recursive: true });
fs.writeFileSync(icoPath, icoBuffer);
console.log('Successfully created icon.ico at ' + icoPath);
