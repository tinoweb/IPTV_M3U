import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('channels.db');

// Inicializa o banco de dados
export function initDatabase() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS channels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            tvg_id TEXT,
            logo TEXT,
            group_title TEXT,
            stream_url TEXT UNIQUE,
            last_checked DATETIME,
            is_working INTEGER
        )`);
    });
}

// Adiciona ou atualiza um canal
export function upsertChannel(channel) {
    const stmt = db.prepare(`
        INSERT OR REPLACE INTO channels 
        (name, tvg_id, logo, group_title, stream_url, last_checked, is_working)
        VALUES (?, ?, ?, ?, ?, datetime('now'), ?)
    `);
    
    stmt.run(
        channel.name,
        channel.tvgId,
        channel.logo,
        channel.groupTitle,
        channel.streamUrl,
        channel.isWorking ? 1 : 0
    );
    stmt.finalize();
}

// Obtém todos os canais funcionando
export function getWorkingChannels() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM channels WHERE is_working = 1", (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Funções de banco de dados
function saveToLocalStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error('Erro ao salvar no localStorage:', error);
        return false;
    }
}

function loadFromLocalStorage(key) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch (error) {
        console.error('Erro ao carregar do localStorage:', error);
        return null;
    }
}

function removeFromLocalStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('Erro ao remover do localStorage:', error);
        return false;
    }
}

// Exportar funções
export {
    saveToLocalStorage,
    loadFromLocalStorage,
    removeFromLocalStorage
};
