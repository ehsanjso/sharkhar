#!/usr/bin/env node
// Creates simple PNG icons for the extension

const fs = require('fs');
const path = require('path');

// Simple PNG with just a colored square (placeholder)
// In production, you'd want proper icons

function createPNG(size) {
  // Create a minimal PNG with a purple gradient-like color
  // This is a very basic approach - just a solid color square
  
  const width = size;
  const height = size;
  
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk
  const ihdr = createIHDR(width, height);
  
  // IDAT chunk (image data)
  const idat = createIDAT(width, height);
  
  // IEND chunk
  const iend = createIEND();
  
  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createIHDR(width, height) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data[8] = 8;  // bit depth
  data[9] = 2;  // color type (RGB)
  data[10] = 0; // compression
  data[11] = 0; // filter
  data[12] = 0; // interlace
  
  return createChunk('IHDR', data);
}

function createIDAT(width, height) {
  const zlib = require('zlib');
  
  // Create raw image data (RGB)
  const rowSize = width * 3 + 1; // +1 for filter byte
  const raw = Buffer.alloc(rowSize * height);
  
  for (let y = 0; y < height; y++) {
    const rowStart = y * rowSize;
    raw[rowStart] = 0; // No filter
    
    for (let x = 0; x < width; x++) {
      const pixelStart = rowStart + 1 + x * 3;
      // Purple color: RGB(102, 126, 234)
      raw[pixelStart] = 102;     // R
      raw[pixelStart + 1] = 126; // G
      raw[pixelStart + 2] = 234; // B
    }
  }
  
  const compressed = zlib.deflateSync(raw);
  return createChunk('IDAT', compressed);
}

function createIEND() {
  return createChunk('IEND', Buffer.alloc(0));
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  
  const typeBuffer = Buffer.from(type);
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcData);
  
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc >>> 0, 0);
  
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

// CRC32 implementation
function crc32(data) {
  let crc = 0xffffffff;
  
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  
  return crc ^ 0xffffffff;
}

// Create icons
const sizes = [16, 48, 128];
const iconsDir = path.join(__dirname, 'icons');

sizes.forEach(size => {
  const png = createPNG(size);
  const filename = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filename, png);
  console.log(`Created ${filename}`);
});

console.log('Done!');
