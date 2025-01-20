const fs = require('fs');
const path = require('path');

const dbDir = path.join('.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject');

try {
    const files = fs.readdirSync(dbDir);
    const sqliteFile = files.find(file => file.endsWith('.sqlite'));
    if (sqliteFile) {
        process.env.LOCAL_DB_PATH = path.join(dbDir, sqliteFile);
    } else {
        console.error('No SQLite database file found');
        process.exit(1);
    }
} catch (error) {
    console.error('Error finding database:', error);
    process.exit(1);
}
