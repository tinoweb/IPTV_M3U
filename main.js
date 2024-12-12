const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('channels.db');

// Inicializa o banco de dados
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

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    win.loadFile('index.html');
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC handlers
ipcMain.handle('save-channel', async (event, channel) => {
    return new Promise((resolve, reject) => {
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
            channel.isWorking ? 1 : 0,
            (err) => {
                if (err) reject(err);
                else resolve();
            }
        );
        stmt.finalize();
    });
});

ipcMain.handle('get-channels', async () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM channels WHERE is_working = 1", (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
});
