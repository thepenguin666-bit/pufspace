const fs = require('fs');
try {
    const fd = fs.openSync('public/bat.png', 'r');
    const buffer = Buffer.alloc(24);
    fs.readSync(fd, buffer, 0, 24, 0);
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    console.log(`${width}x${height}`);
    fs.closeSync(fd);
} catch (e) {
    console.error(e);
}
