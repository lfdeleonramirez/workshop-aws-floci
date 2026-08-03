import { createGzip } from 'zlib';
import { Readable } from 'stream';
import { Buffer } from 'buffer';

// Código fuente para cada runtime
const LAMBDA_SOURCES = {
  'nodejs18.x': {
    filename: 'index.js',
    handler: 'index.handler',
    code: `exports.handler = async (event) => {
  console.log('Evento recibido:', JSON.stringify(event));
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Hola desde Lambda con Node.js!' })
  };
};`
  },
  'nodejs20.x': {
    filename: 'index.mjs',
    handler: 'index.handler',
    code: `export const handler = async (event) => {
  console.log('Evento recibido:', JSON.stringify(event));
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Hola desde Lambda con Node.js 20!' })
  };
};`
  },
  'python3.12': {
    filename: 'index.py',
    handler: 'index.handler',
    code: `import json

def handler(event, context):
    print(f"Evento recibido: {json.dumps(event)}")
    return {
        "statusCode": 200,
        "body": json.dumps({"message": "Hola desde Lambda con Python!"})
    }`
  },
  'java17': {
    filename: 'Handler.java',
    handler: 'Handler::handleRequest',
    code: `import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import java.util.Map;
import java.util.HashMap;

public class Handler implements RequestHandler<Map<String, Object>, Map<String, Object>> {
    @Override
    public Map<String, Object> handleRequest(Map<String, Object> event, Context context) {
        Map<String, Object> response = new HashMap<>();
        response.put("statusCode", 200);
        response.put("body", "{\\"message\\": \\"Hola desde Lambda con Java!\\"}");
        return response;
    }
}`
  }
};

// Crear un ZIP simple con un solo archivo
// Formato ZIP mínimo válido
function createZipBuffer(filename, content) {
  const fileData = Buffer.from(content, 'utf-8');
  const fileNameBuf = Buffer.from(filename, 'utf-8');

  // Local file header
  const localHeader = Buffer.alloc(30 + fileNameBuf.length);
  localHeader.writeUInt32LE(0x04034b50, 0);     // Local file header signature
  localHeader.writeUInt16LE(20, 4);             // Version needed to extract
  localHeader.writeUInt16LE(0, 6);              // General purpose bit flag
  localHeader.writeUInt16LE(0, 8);              // Compression method (none)
  localHeader.writeUInt16LE(0, 10);             // Last mod file time
  localHeader.writeUInt16LE(0, 12);             // Last mod file date
  localHeader.writeUInt32LE(crc32(fileData), 14); // CRC-32
  localHeader.writeUInt32LE(fileData.length, 18); // Compressed size
  localHeader.writeUInt32LE(fileData.length, 22); // Uncompressed size
  localHeader.writeUInt16LE(fileNameBuf.length, 26); // File name length
  localHeader.writeUInt16LE(0, 28);             // Extra field length
  fileNameBuf.copy(localHeader, 30);

  // Central directory header
  const centralDir = Buffer.alloc(46 + fileNameBuf.length);
  centralDir.writeUInt32LE(0x02014b50, 0);      // Central directory signature
  centralDir.writeUInt16LE(20, 4);              // Version made by
  centralDir.writeUInt16LE(20, 6);              // Version needed
  centralDir.writeUInt16LE(0, 8);               // General purpose bit flag
  centralDir.writeUInt16LE(0, 10);              // Compression method
  centralDir.writeUInt16LE(0, 12);              // Last mod file time
  centralDir.writeUInt16LE(0, 14);              // Last mod file date
  centralDir.writeUInt32LE(crc32(fileData), 16); // CRC-32
  centralDir.writeUInt32LE(fileData.length, 20); // Compressed size
  centralDir.writeUInt32LE(fileData.length, 24); // Uncompressed size
  centralDir.writeUInt16LE(fileNameBuf.length, 28); // File name length
  centralDir.writeUInt16LE(0, 30);              // Extra field length
  centralDir.writeUInt16LE(0, 32);              // File comment length
  centralDir.writeUInt16LE(0, 34);              // Disk number start
  centralDir.writeUInt16LE(0, 36);              // Internal file attributes
  centralDir.writeUInt32LE(0, 38);              // External file attributes
  centralDir.writeUInt32LE(0, 42);              // Relative offset of local header
  fileNameBuf.copy(centralDir, 46);

  // End of central directory
  const endOfDir = Buffer.alloc(22);
  const centralDirOffset = localHeader.length + fileData.length;
  endOfDir.writeUInt32LE(0x06054b50, 0);        // End of central directory signature
  endOfDir.writeUInt16LE(0, 4);                 // Number of this disk
  endOfDir.writeUInt16LE(0, 6);                 // Disk where central directory starts
  endOfDir.writeUInt16LE(1, 8);                 // Number of central directory records on this disk
  endOfDir.writeUInt16LE(1, 10);                // Total number of central directory records
  endOfDir.writeUInt32LE(centralDir.length, 12); // Size of central directory
  endOfDir.writeUInt32LE(centralDirOffset, 16); // Offset of start of central directory
  endOfDir.writeUInt16LE(0, 20);                // Comment length

  return Buffer.concat([localHeader, fileData, centralDir, endOfDir]);
}

// CRC-32 implementation
function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }

  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

export function getLambdaCode(runtime) {
  const source = LAMBDA_SOURCES[runtime] || LAMBDA_SOURCES['nodejs18.x'];
  return {
    zipBuffer: createZipBuffer(source.filename, source.code),
    handler: source.handler,
    sourceCode: source.code,
    filename: source.filename
  };
}
