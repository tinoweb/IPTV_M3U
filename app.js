document.addEventListener('DOMContentLoaded', () => {
    const videoPlayer = document.getElementById('videoPlayer');
    const m3uInput = document.getElementById('m3uInput');
    const loadBtn = document.getElementById('loadBtn');
    const playlistsContainer = document.getElementById('playlists-container');
    const savedChannelsContainer = document.getElementById('saved-channels');
    let currentStreamUrl = null;
    let currentChannel = null;
    let hls = null;

    // Função para mostrar notificações
    function showNotification(message, type = 'info') {
        Toastify({
            text: message,
            duration: 3000,
            gravity: "top",
            position: 'right',
            backgroundColor: type === 'error' ? '#ff4444' : type === 'success' ? '#00C851' : '#33b5e5'
        }).showToast();
    }

    // Função para carregar stream
    async function loadStream(url) {
        return new Promise((resolve, reject) => {
            try {
                if (Hls.isSupported()) {
                    if (hls) {
                        hls.destroy();
                    }
                    hls = new Hls({
                        debug: false,
                        manifestLoadingTimeOut: 20000,    // 20 segundos para carregar o manifest
                        manifestLoadingMaxRetry: 3,       // 3 tentativas
                        levelLoadingTimeOut: 20000,       // 20 segundos para carregar os levels
                        levelLoadingMaxRetry: 3,          // 3 tentativas
                        fragLoadingTimeOut: 20000,        // 20 segundos para carregar fragmentos
                        fragLoadingMaxRetry: 3            // 3 tentativas
                    });

                    hls.attachMedia(videoPlayer);

                    hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                        console.log('HLS: Media attached');
                        hls.loadSource(url);
                    });

                    hls.on(Hls.Events.MANIFEST_PARSED, () => {
                        console.log('HLS: Manifest parsed successfully');
                        videoPlayer.play().catch(error => {
                            console.log('Erro ao iniciar playback:', error);
                            showNotification('Erro ao iniciar playback. Tente novamente.', 'error');
                        });
                        resolve(true);
                    });

                    hls.on(Hls.Events.ERROR, (event, data) => {
                        if (data.fatal) {
                            console.error('Erro fatal HLS:', data);
                            switch(data.type) {
                                case Hls.ErrorTypes.NETWORK_ERROR:
                                    console.log('Erro de rede, tentando recuperar...');
                                    hls.startLoad();
                                    break;
                                case Hls.ErrorTypes.MEDIA_ERROR:
                                    console.log('Erro de mídia, tentando recuperar...');
                                    hls.recoverMediaError();
                                    break;
                                default:
                                    console.error('Erro fatal não recuperável');
                                    hls.destroy();
                                    showNotification('Erro ao carregar stream. Tente novamente.', 'error');
                                    reject(new Error('Erro fatal no HLS'));
                                    break;
                            }
                        }
                    });
                } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
                    // Fallback para Safari
                    videoPlayer.src = url;
                    videoPlayer.addEventListener('loadedmetadata', () => {
                        videoPlayer.play();
                        resolve(true);
                    });
                    videoPlayer.addEventListener('error', (e) => {
                        console.error('Erro no player nativo:', e);
                        showNotification('Erro ao carregar stream no player nativo', 'error');
                        reject(new Error('Erro no player nativo'));
                    });
                } else {
                    showNotification('Seu navegador não suporta HLS', 'error');
                    reject(new Error('HLS não suportado'));
                }
            } catch (error) {
                console.error('Erro ao configurar HLS:', error);
                showNotification('Erro ao configurar player', 'error');
                reject(error);
            }
        });
    }

    // Função para carregar canais do arquivo JSON
    async function getSavedChannels() {
        try {
            const response = await fetch('channels.json');
            const data = await response.json();
            return data.savedChannels || [];
        } catch (error) {
            console.error('Erro ao carregar canais:', error);
            showNotification('Erro ao carregar canais do arquivo', 'error');
            return [];
        }
    }

    // Função para salvar um canal
    async function saveChannel(channel) {
        try {
            const channels = await getSavedChannels();
            const exists = channels.some(ch => ch.url === channel.url);
            if (!exists) {
                channels.push(channel);
                const data = { savedChannels: channels };
                const json = JSON.stringify(data, null, 2);
                await fetch('channels.json', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: json
                });
                showNotification('Canal salvo com sucesso!', 'success');
                displaySavedChannels(); // Atualiza a lista de canais
            } else {
                showNotification('Este canal já está salvo!', 'info');
            }
        } catch (error) {
            console.error('Erro ao salvar canal:', error);
            showNotification('Erro ao salvar canal', 'error');
        }
    }

    // Função para remover um canal
    async function removeChannel(url) {
        try {
            const channels = await getSavedChannels();
            const updatedChannels = channels.filter(ch => ch.url !== url);
            const data = { savedChannels: updatedChannels };
            const json = JSON.stringify(data, null, 2);
            await fetch('channels.json', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: json
            });
            showNotification('Canal removido!', 'success');
            displaySavedChannels(); // Atualiza a lista de canais
        } catch (error) {
            console.error('Erro ao remover canal:', error);
            showNotification('Erro ao remover canal', 'error');
        }
    }

    // Making playChannel globally accessible
    window.playChannel = function(url) {
        if (videoPlayer && url) {
            loadStream(url)
                .then(() => {
                    currentStreamUrl = url;
                    const channels = getSavedChannels();
                    currentChannel = channels.find(ch => ch.url === url);
                    updateCurrentInfo();
                    showNotification('Canal carregado com sucesso', 'success');
                })
                .catch(error => {
                    console.error('Erro ao carregar canal:', error);
                    showNotification('Erro ao carregar canal', 'error');
                });
        }
    };

    // Making removeChannel globally accessible
    window.removeChannel = function(url) {
        removeChannel(url);
    };

    // Função para atualizar informações do canal atual
    function updateCurrentInfo() {
        const currentInfo = document.getElementById('current-info');
        if (currentInfo && currentChannel) {
            currentInfo.innerHTML = `
                <h3>Reproduzindo:</h3>
                <p>${currentChannel.name}</p>
            `;
        }
    }

    // Função para parsear arquivo M3U
    function parseM3U(content) {
        console.log('Conteúdo recebido:', content); // Log do conteúdo recebido
        
        const lines = content.split('\n');
        const channels = [];
        let currentChannel = null;

        console.log('Total de linhas:', lines.length); // Log do número de linhas

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            console.log('Processando linha:', line); // Log da linha atual

            // Pular linhas vazias
            if (!line) continue;

            // Verificar se é uma linha de informação do canal
            if (line.startsWith('#EXTINF:')) {
                const nameMatch = line.match(/,(.+)$/);
                currentChannel = {
                    name: nameMatch ? nameMatch[1].trim() : 'Canal sem nome'
                };
                console.log('Canal encontrado:', currentChannel); // Log do canal encontrado
            }
            // Se não é uma linha de comentário e temos um canal atual
            else if (!line.startsWith('#') && currentChannel) {
                // Verificar se a URL é válida
                try {
                    new URL(line); // Tenta criar um objeto URL para validar
                    currentChannel.url = line;
                    channels.push(currentChannel);
                    console.log('Canal adicionado:', currentChannel); // Log do canal adicionado
                    currentChannel = null;
                } catch (e) {
                    console.log('URL inválida encontrada:', line); // Log de URL inválida
                }
            }
            // Se é a primeira linha, verificar se é o cabeçalho M3U
            else if (i === 0 && !line.includes('#EXTM3U')) {
                console.log('Cabeçalho M3U não encontrado'); // Log de cabeçalho ausente
            }
        }

        console.log('Total de canais encontrados:', channels.length); // Log do total de canais
        return channels;
    }

    // Função para atualizar a lista de canais salvos
    async function displaySavedChannels() {
        const savedChannelsContainer = document.getElementById('saved-channels');
        if (!savedChannelsContainer) return;

        try {
            const channels = await getSavedChannels();
            savedChannelsContainer.innerHTML = '';

            channels.forEach(channel => {
                const channelDiv = document.createElement('div');
                channelDiv.className = 'channel-item';
                
                const channelName = document.createElement('span');
                channelName.textContent = channel.name;
                channelName.className = 'channel-name';
                
                const buttonsDiv = document.createElement('div');
                buttonsDiv.className = 'channel-buttons';
                
                const playButton = document.createElement('button');
                playButton.innerHTML = '<i class="fas fa-play"></i>';
                playButton.className = 'play-btn';
                playButton.onclick = () => playChannel(channel.url);
                
                buttonsDiv.appendChild(playButton);
                channelDiv.appendChild(channelName);
                channelDiv.appendChild(buttonsDiv);
                savedChannelsContainer.appendChild(channelDiv);
            });

            updateMobileChannelsList();
        } catch (error) {
            console.error('Erro ao exibir canais:', error);
            showNotification('Erro ao exibir lista de canais', 'error');
        }
    }

    // Função para atualizar a lista de canais mobile
    async function updateMobileChannelsList() {
        const mobileChannelsList = document.getElementById('mobile-channels-list');
        if (!mobileChannelsList) return;

        try {
            const channels = await getSavedChannels();
            mobileChannelsList.innerHTML = '';

            channels.forEach(channel => {
                const li = document.createElement('li');
                li.className = 'mobile-channel-item';
                
                const channelName = document.createElement('span');
                channelName.textContent = channel.name;
                
                const playButton = document.createElement('button');
                playButton.innerHTML = '<i class="fas fa-play"></i>';
                playButton.onclick = () => {
                    playChannel(channel.url);
                    mobileChannelsModal.classList.remove('show');
                };
                
                li.appendChild(channelName);
                li.appendChild(playButton);
                mobileChannelsList.appendChild(li);
            });
        } catch (error) {
            console.error('Erro ao atualizar lista mobile:', error);
            showNotification('Erro ao atualizar lista mobile', 'error');
        }
    }

    // Função para verificar status do stream
    async function checkStreamStatus(url) {
        try {
            const response = await fetch(url, { method: 'HEAD', timeout: 5000 });
            return response.ok;
        } catch (error) {
            console.error('Erro ao verificar stream:', error);
            return false;
        }
    }

    // Função para checar e salvar um canal
    async function checkAndSaveChannel() {
        const urlInput = document.getElementById('stream-url');
        const nameInput = document.getElementById('channel-name');
        
        if (!urlInput || !nameInput) return;

        const url = urlInput.value.trim();
        const name = nameInput.value.trim() || 'Canal sem nome';

        if (!url) {
            showNotification('Por favor, insira uma URL válida', 'error');
            return;
        }

        showNotification('Verificando stream...', 'info');
        const isOnline = await checkStreamStatus(url);

        if (isOnline) {
            const channel = {
                name: name,
                url: url,
                dateAdded: new Date().toISOString()
            };
            saveChannel(channel);
            showNotification('Stream verificado e salvo com sucesso!', 'success');
        } else {
            showNotification('Stream offline ou inválido!', 'error');
        }
    }

    // Função para reproduzir um canal salvo
    async function playChannel(url) {
        try {
            const success = await loadStream(url);
            if (success) {
                currentStreamUrl = url;
                const channels = await getSavedChannels();
                currentChannel = channels.find(ch => ch.url === url);
                updateCurrentInfo();
                showNotification('Reproduzindo canal', 'success');
            }
        } catch (error) {
            console.error('Erro ao reproduzir canal:', error);
            showNotification('Erro ao reproduzir canal', 'error');
        }
    }

    // Event Listeners
    if (loadBtn && m3uInput) {
        loadBtn.addEventListener('click', async () => {
            const url = m3uInput.value.trim();
            if (!url) {
                showNotification('Por favor, insira uma URL válida', 'error');
                return;
            }

            try {
                // Se for um arquivo m3u8, tratar como stream HLS direto
                if (url.toLowerCase().endsWith('.m3u8')) {
                    console.log('Tentando carregar stream HLS:', url);
                    const success = await loadStream(url);
                    if (success) {
                        currentStreamUrl = url;
                        currentChannel = { 
                            name: 'Stream HLS', 
                            url: url 
                        };
                        updateCurrentInfo();
                        saveChannel(currentChannel);
                        console.log('Stream HLS carregado com sucesso');
                    }
                }
                // Se for uma playlist M3U normal
                else if (url.toLowerCase().endsWith('.m3u')) {
                    console.log('Tentando carregar playlist M3U:', url);
                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error('Erro ao acessar a playlist');
                    }
                    const content = await response.text();
                    console.log('Conteúdo da playlist recebido');
                    
                    const channels = parseM3U(content);
                    console.log('Canais parseados:', channels);
                    
                    if (channels && channels.length > 0) {
                        let validChannels = 0;
                        for (const channel of channels) {
                            console.log('Verificando canal:', channel);
                            const isOnline = await checkStreamStatus(channel.url);
                            if (isOnline) {
                                saveChannel({
                                    name: channel.name,
                                    url: channel.url
                                });
                                validChannels++;
                                console.log('Canal válido encontrado:', channel);
                            }
                        }
                        showNotification(`Playlist processada: ${validChannels} canais válidos encontrados`, 'success');
                    } else {
                        throw new Error('Nenhum canal encontrado na playlist');
                    }
                } 
                // Se não for nem m3u nem m3u8, tentar como stream direto
                else {
                    console.log('Tentando carregar como stream direto:', url);
                    const isOnline = await checkStreamStatus(url);
                    if (isOnline) {
                        const success = await loadStream(url);
                        if (success) {
                            currentStreamUrl = url;
                            currentChannel = { name: 'Stream Direto', url: url };
                            updateCurrentInfo();
                            saveChannel(currentChannel);
                            console.log('Stream direto carregado com sucesso');
                        }
                    } else {
                        showNotification('Este stream está offline ou inacessível!', 'error');
                    }
                }
            } catch (error) {
                console.error('Erro ao processar URL:', error);
                showNotification(error.message, 'error');
            }
        });
    }

    // Carregar canais ao iniciar
    displaySavedChannels();

    // Mobile Channels Modal
    const mobileChannelsBtn = document.getElementById('mobileChannelsBtn');
    const mobileChannelsModal = document.getElementById('mobileChannelsModal');
    const closeModalBtn = document.querySelector('.close-modal-btn');
    const mobileChannelsList = document.getElementById('mobile-channels-list');

    // Event listeners para o modal mobile
    mobileChannelsBtn.addEventListener('click', () => {
        mobileChannelsModal.classList.add('show');
        updateMobileChannelsList();
    });

    closeModalBtn.addEventListener('click', () => {
        mobileChannelsModal.classList.remove('show');
    });

    // Fechar modal ao clicar fora dele
    mobileChannelsModal.addEventListener('click', (e) => {
        if (e.target === mobileChannelsModal) {
            mobileChannelsModal.classList.remove('show');
        }
    });

    // Atualizar lista mobile quando novos canais são adicionados
    const originalSaveChannel = saveChannel;
    saveChannel = function(channel) {
        originalSaveChannel(channel);
        updateMobileChannelsList();
    };

    // Menu visibility control
    let menuTimeout;
    const MENU_HIDE_DELAY = 3000; // 3 seconds

    function showMenus() {
        clearTimeout(menuTimeout);
        const header = document.querySelector('header');
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        document.body.classList.add('show-ui');
        document.body.classList.remove('hide-ui');
        
        header.classList.remove('hidden');
        sidebar.classList.remove('hidden');
        mainContent.classList.remove('expanded');
    }

    function hideMenus() {
        const header = document.querySelector('header');
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        document.body.classList.remove('show-ui');
        document.body.classList.add('hide-ui');
        
        header.classList.add('hidden');
        sidebar.classList.add('hidden');
        mainContent.classList.add('expanded');
    }

    function resetMenuTimer() {
        showMenus();
        clearTimeout(menuTimeout);
        menuTimeout = setTimeout(hideMenus, MENU_HIDE_DELAY);
    }

    // Add event listeners for menu visibility
    document.addEventListener('mousemove', resetMenuTimer);
    document.addEventListener('keydown', resetMenuTimer);

    // Hide menus initially after a delay
    setTimeout(hideMenus, MENU_HIDE_DELAY);

    // Prevent menu hiding when interacting with controls
    document.querySelector('.sidebar')?.addEventListener('mouseenter', () => {
        clearTimeout(menuTimeout);
        showMenus();
    });

    document.querySelector('header')?.addEventListener('mouseenter', () => {
        clearTimeout(menuTimeout);
        showMenus();
    });

    // Resume menu hiding when leaving interactive areas
    document.querySelector('.sidebar')?.addEventListener('mouseleave', () => {
        if (!document.querySelector('.sidebar:hover') && !document.querySelector('header:hover')) {
            resetMenuTimer();
        }
    });

    document.querySelector('header')?.addEventListener('mouseleave', () => {
        if (!document.querySelector('.sidebar:hover') && !document.querySelector('header:hover')) {
            resetMenuTimer();
        }
    });
});

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const channelsManager = require('./channelsManager');

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
ipcMain.handle('get-channels', async () => {
    return await channelsManager.loadChannels();
});

ipcMain.handle('save-channel', async (event, channel) => {
    return await channelsManager.addChannel(channel);
});

ipcMain.handle('remove-channel', async (event, streamUrl) => {
    return await channelsManager.removeChannel(streamUrl);
});

ipcMain.handle('update-channel', async (event, channel) => {
    return await channelsManager.updateChannel(channel);
});

// Migração do localStorage
ipcMain.handle('migrate-from-localstorage', async () => {
    return await channelsManager.migrateFromLocalStorage();
});
