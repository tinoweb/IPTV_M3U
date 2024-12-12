import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Middleware para parsing de JSON
app.use(express.json());

// Configuração do CORS
app.use(cors());
app.use(express.static(path.join(__dirname)));

// Rotas para arquivos estáticos
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Middleware para logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Função para ler o arquivo channels.json
async function readChannelsFile() {
    try {
        const data = await fs.readFile('channels.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Erro ao ler arquivo channels.json:', error);
        return { savedChannels: [] };
    }
}

// Função para escrever no arquivo channels.json
async function writeChannelsFile(data) {
    try {
        await fs.writeFile('channels.json', JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Erro ao escrever no arquivo channels.json:', error);
        return false;
    }
}

// Endpoint para obter todos os canais
app.get('/api/channels', async (req, res) => {
    try {
        const data = await readChannelsFile();
        res.json(data.savedChannels);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao ler canais' });
    }
});

// Endpoint para salvar canal
app.post('/api/channels', async (req, res) => {
    try {
        const { name, url } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL é obrigatória' });
        }

        const data = await readChannelsFile();
        const exists = data.savedChannels.some(ch => ch.url === url);
        
        if (!exists) {
            data.savedChannels.push({
                name: name || 'Canal sem nome',
                url: url
            });
            
            const success = await writeChannelsFile(data);
            if (success) {
                res.json({ message: 'Canal salvo com sucesso' });
            } else {
                res.status(500).json({ error: 'Erro ao salvar canal' });
            }
        } else {
            res.status(400).json({ error: 'Canal já existe' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Erro ao processar requisição' });
    }
});

// Endpoint para remover canal
app.delete('/api/channels/:url', async (req, res) => {
    try {
        const url = decodeURIComponent(req.params.url);
        const data = await readChannelsFile();
        
        data.savedChannels = data.savedChannels.filter(ch => ch.url !== url);
        
        const success = await writeChannelsFile(data);
        if (success) {
            res.json({ message: 'Canal removido com sucesso' });
        } else {
            res.status(500).json({ error: 'Erro ao remover canal' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Erro ao processar requisição' });
    }
});

// Middleware para proxy de streams
app.get('/proxy/:url(*)', async (req, res) => {
    try {
        const url = decodeURIComponent(req.params.url);
        const response = await fetch(url);
        if (!response.ok) throw new Error('Stream não encontrado');
        
        // Encaminhar headers relevantes
        res.set({
            'Content-Type': response.headers.get('content-type'),
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        });
        
        // Pipe a resposta
        response.body.pipe(res);
    } catch (error) {
        console.error('Erro no proxy:', error);
        res.status(500).json({ error: 'Erro ao acessar stream' });
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
