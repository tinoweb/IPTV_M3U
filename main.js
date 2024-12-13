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

// Variáveis globais
let channelsList = [];
const searchInput = document.getElementById('channelSearch');
const clearSearchBtn = document.getElementById('clearSearch');
const savedChannelsContainer = document.getElementById('saved-channels');

// Função para carregar os canais
async function loadChannels() {
    try {
        const response = await fetch('/api/channels');
        const channels = await response.json();
        channelsList = channels.map((channel, index) => ({
            ...channel,
            id: index
        }));
        displayChannels(channelsList);
    } catch (error) {
        console.error('Erro ao carregar canais:', error);
    }
}

// Função para exibir os canais
function displayChannels(channels) {
    savedChannelsContainer.innerHTML = '';
    channels.forEach(channel => {
        const channelElement = createChannelElement(channel);
        savedChannelsContainer.appendChild(channelElement);
    });
}

// Função para criar elemento do canal
function createChannelElement(channel) {
    const channelDiv = document.createElement('div');
    channelDiv.className = 'channel-item';
    channelDiv.id = `channel-${channel.id}`;

    const channelName = document.createElement('span');
    channelName.className = 'channel-name';
    channelName.textContent = channel.name;

    const qualitySpan = document.createElement('span');
    qualitySpan.className = 'channel-quality';
    qualitySpan.innerHTML = `<i class="fas fa-signal"></i> ${channel.quality || '720p'}`;

    const playButton = document.createElement('button');
    playButton.innerHTML = '<i class="fas fa-play"></i> Assistir Agora';
    playButton.onclick = () => playChannel(channel.url);

    channelDiv.appendChild(channelName);
    channelDiv.appendChild(qualitySpan);
    channelDiv.appendChild(playButton);

    return channelDiv;
}

// Função para filtrar canais
function filterChannels(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    
    const filteredChannels = term === '' 
        ? channelsList 
        : channelsList.filter(channel => 
            channel.name.toLowerCase().includes(term)
          );

    displayChannels(filteredChannels);

    // Se houver um termo de pesquisa, destaca-o
    if (term !== '') {
        const channelNames = document.querySelectorAll('.channel-name');
        channelNames.forEach(nameElement => {
            const text = nameElement.textContent;
            const regex = new RegExp(`(${term})`, 'gi');
            const highlightedText = text.replace(regex, '<mark>$1</mark>');
            nameElement.innerHTML = highlightedText;
        });
    }

    // Mostrar/ocultar botão de limpar
    clearSearchBtn.classList.toggle('visible', searchTerm.length > 0);
}

// Event Listeners
searchInput.addEventListener('input', (e) => {
    filterChannels(e.target.value);
});

clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    filterChannels('');
    searchInput.focus();
});

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    loadChannels();
});
