import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const db = new sqlite3.Database(join(projectRoot, 'channels.db'));

// Criar tabela de canais
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS channels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        url TEXT NOT NULL UNIQUE,
        category TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Criar índices
    db.run('CREATE INDEX IF NOT EXISTS idx_channels_name ON channels(name)');
    db.run('CREATE INDEX IF NOT EXISTS idx_channels_category ON channels(category)');

    console.log('Banco de dados inicializado com sucesso!');
});

db.close();
