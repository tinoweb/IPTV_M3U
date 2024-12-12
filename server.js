import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import path from 'path';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuração do banco de dados
const db = new sqlite3.Database('channels.db', (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
    } else {
        console.log('Conectado ao banco de dados SQLite');
        
        // Criar tabela de canais se não existir
        db.run(`CREATE TABLE IF NOT EXISTS channels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            url TEXT NOT NULL,
            status TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error('Erro ao criar tabela:', err);
            } else {
                console.log('Tabela de canais verificada/criada com sucesso');
                
                // Inserir alguns canais de teste se a tabela estiver vazia
                db.get("SELECT COUNT(*) as count FROM channels", [], (err, row) => {
                    if (err) {
                        console.error('Erro ao verificar canais:', err);
                        return;
                    }
                    
                    if (row.count === 0) {
                        const testChannels = [
                            {
                                name: 'Canal Teste 1',
                                url: 'http://example.com/stream1.m3u8',
                                status: 'active'
                            },
                            {
                                name: 'Canal Teste 2',
                                url: 'http://example.com/stream2.m3u8',
                                status: 'active'
                            }
                        ];
                        
                        const stmt = db.prepare("INSERT INTO channels (name, url, status) VALUES (?, ?, ?)");
                        testChannels.forEach(channel => {
                            stmt.run([channel.name, channel.url, channel.status]);
                        });
                        stmt.finalize();
                        
                        console.log('Canais de teste inseridos com sucesso');
                    }
                });
            }
        });
    }
});

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

// Endpoint para salvar canal
app.post('/api/channels', (req, res) => {
  const { name, url, status } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL é obrigatória' });
  }

  db.run('INSERT OR REPLACE INTO channels (name, url, status) VALUES (?, ?, ?)',
    [name || 'Canal sem nome', url, status || 'online'],
    function(err) {
      if (err) {
        console.error('Erro ao salvar canal:', err);
        res.status(500).json({ error: 'Erro ao salvar canal' });
      } else {
        res.json({
          id: this.lastID,
          message: 'Canal salvo com sucesso'
        });
      }
    }
  );
});

// Endpoint para listar canais
app.get('/api/channels', (req, res) => {
  db.all('SELECT * FROM channels ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar canais:', err);
      res.status(500).json({ error: 'Erro ao buscar canais' });
    } else {
      res.json(rows);
    }
  });
});

// Rota para obter todos os canais
app.get('/channels', async (req, res) => {
  try {
    const query = 'SELECT * FROM channels';
    db.all(query, [], (err, rows) => {
      if (err) {
        console.error('Erro ao buscar canais:', err);
        res.status(500).json({ error: 'Erro ao buscar canais do banco de dados' });
        return;
      }
      res.json(rows || []);
    });
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint para deletar canal
app.delete('/api/channels/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM channels WHERE id = ?', id, function(err) {
    if (err) {
      console.error('Erro ao deletar canal:', err);
      res.status(500).json({ error: 'Erro ao deletar canal' });
    } else {
      res.json({ message: 'Canal deletado com sucesso' });
    }
  });
});

// Middleware para proxy de streams
app.get('/proxy/:url(*)', async (req, res) => {
  try {
    const url = decodeURIComponent(req.params.url);
    const response = await fetch(url);
    response.body.pipe(res);
  } catch (error) {
    console.error('Erro no proxy:', error);
    res.status(500).json({ error: 'Erro ao acessar stream' });
  }
});

// Iniciar o servidor
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});

// Função para fechar o banco de dados quando o servidor for encerrado
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Erro ao fechar banco de dados:', err);
    } else {
      console.log('Banco de dados fechado');
    }
    process.exit(0);
  });
});
