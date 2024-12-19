import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fetch from 'node-fetch';
import sqlite3 from 'sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const app = express();
const port = process.env.PORT || 3000;

// Configurações do Express
app.use(cors());
app.use(express.json());
app.use(express.static(projectRoot));

// Configuração do SQLite
const db = new sqlite3.Database(join(projectRoot, 'channels.db'));

// Rotas para arquivos estáticos
app.get('/', (req, res) => {
    res.sendFile(join(projectRoot, 'index.html'));
});

app.get('/checker', (req, res) => {
    res.sendFile(join(projectRoot, 'src/pages/checker.html'));
});

app.get('/tutorial', (req, res) => {
    res.sendFile(join(projectRoot, 'src/pages/tutorial.html'));
});

app.get('/sobre', (req, res) => {
    res.sendFile(join(projectRoot, 'src/pages/sobre.html'));
});

app.get('/privacidade', (req, res) => {
    res.sendFile(join(projectRoot, 'src/pages/privacidade.html'));
});

app.get('/termos', (req, res) => {
    res.sendFile(join(projectRoot, 'src/pages/termos.html'));
});

// API Routes
app.post('/api/check-stream', async (req, res) => {
    try {
        const { url } = req.body;
        const response = await fetch(url, { method: 'HEAD', timeout: 5000 });
        res.json({ status: response.ok ? 'active' : 'inactive' });
    } catch (error) {
        res.json({ status: 'inactive', error: error.message });
    }
});

app.get('/api/channels', (req, res) => {
    db.all('SELECT * FROM channels', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/channels', (req, res) => {
    const { name, url, category } = req.body;
    db.run('INSERT INTO channels (name, url, category) VALUES (?, ?, ?)',
        [name, url, category],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: this.lastID });
        });
});

app.delete('/api/channels/:id', (req, res) => {
    db.run('DELETE FROM channels WHERE id = ?',
        req.params.id,
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ changes: this.changes });
        });
});

// Inicialização do servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
