// Elementos do DOM
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

// Variáveis globais para pesquisa
let allChannels = [];
const searchInput = document.getElementById('channelSearch');
const clearSearchBtn = document.getElementById('clearSearch');

// Função para filtrar canais
function filterChannels(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    const savedChannelsContainer = document.getElementById('saved-channels');
    if (!savedChannelsContainer) return;

    savedChannelsContainer.innerHTML = '';
    
    const filteredChannels = allChannels.filter(channel => 
        channel.name.toLowerCase().includes(term)
    );

    filteredChannels.forEach(channel => {
        const channelDiv = document.createElement('div');
        channelDiv.className = 'channel-item';
        
        const channelName = document.createElement('span');
        channelName.className = 'channel-name';
        
        // Destacar o termo pesquisado se houver
        if (term) {
            const regex = new RegExp(`(${term})`, 'gi');
            const highlightedText = channel.name.replace(regex, '<mark>$1</mark>');
            channelName.innerHTML = highlightedText;
        } else {
            channelName.textContent = channel.name;
        }
        
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'channel-buttons';
        
        const playButton = document.createElement('button');
        playButton.innerHTML = '<i class="fas fa-play"></i> Assistir';
        playButton.className = 'play-btn';
        playButton.onclick = () => playChannel(channel.url);
        
        buttonsDiv.appendChild(playButton);
        channelDiv.appendChild(channelName);
        channelDiv.appendChild(buttonsDiv);
        savedChannelsContainer.appendChild(channelDiv);
    });

    // Mostrar/ocultar botão de limpar
    if (clearSearchBtn) {
        clearSearchBtn.classList.toggle('visible', searchTerm.length > 0);
    }
}

// Função para atualizar a lista de canais salvos
async function displaySavedChannels() {
    const savedChannelsContainer = document.getElementById('saved-channels');
    if (!savedChannelsContainer) return;

    try {
        allChannels = await getSavedChannels(); // Atualiza a lista global
        filterChannels(''); // Exibe todos os canais
        updateMobileChannelsList();
    } catch (error) {
        console.error('Erro ao exibir canais:', error);
        showNotification('Erro ao exibir lista de canais', 'error');
    }
}

// Event listeners para pesquisa
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        filterChannels(e.target.value);
    });
}

if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
        if (searchInput) {
            searchInput.value = '';
            filterChannels('');
            searchInput.focus();
        }
    });
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
    const header = document.querySelector('header');
    const sidebar = document.querySelector('.sidebar');
    const playerArea = document.querySelector('.player-area');
    
    if (header) header.classList.remove('hidden');
    if (sidebar) sidebar.classList.remove('hidden');
    if (playerArea) playerArea.classList.remove('expanded');
    
    document.body.classList.add('show-ui');
    document.body.classList.remove('hide-ui');
}

function hideMenus() {
    const header = document.querySelector('header');
    const sidebar = document.querySelector('.sidebar');
    const playerArea = document.querySelector('.player-area');
    
    if (header) header.classList.add('hidden');
    if (sidebar) sidebar.classList.add('hidden');
    if (playerArea) playerArea.classList.add('expanded');
    
    document.body.classList.remove('show-ui');
    document.body.classList.add('hide-ui');
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

// Configuração do player
if (videoPlayer && Hls.isSupported()) {
    const hls = new Hls();
    window.videoPlayer = videoPlayer;
    window.videoPlayer.hls = hls;
    hls.attachMedia(videoPlayer);

    hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        console.log('HLS: Media attached');
    });

    hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
            switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                    console.error('HLS: Fatal network error');
                    hls.startLoad();
                    break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                    console.error('HLS: Fatal media error');
                    hls.recoverMediaError();
                    break;
                default:
                    console.error('HLS: Fatal error');
                    hls.destroy();
                    break;
            }
        }
    });
}

// Funções do player
export function play() {
    if (videoPlayer) {
        videoPlayer.play().catch(error => {
            console.error('Erro ao reproduzir:', error);
        });
    }
}

export function pause() {
    if (videoPlayer) {
        videoPlayer.pause();
    }
}

export function setVolume(volume) {
    if (videoPlayer) {
        videoPlayer.volume = Math.max(0, Math.min(1, volume));
    }
}

export function toggleMute() {
    if (videoPlayer) {
        videoPlayer.muted = !videoPlayer.muted;
    }
}

export function toggleFullscreen() {
    if (videoPlayer) {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            videoPlayer.requestFullscreen();
        }
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    if (videoPlayer) {
        // Volume controls
        videoPlayer.addEventListener('volumechange', () => {
            console.log('Volume:', videoPlayer.volume);
        });

        // Playback controls
        videoPlayer.addEventListener('play', () => {
            console.log('Video playing');
        });

        videoPlayer.addEventListener('pause', () => {
            console.log('Video paused');
        });

        // Error handling
        videoPlayer.addEventListener('error', (e) => {
            console.error('Video error:', e);
        });
    }
});

// Atualizando o sistema de reprodução com feedback visual e tratamento de erros
let currentChannel = null;
let hls = null;

export function initPlayer() {
    const videoPlayer = document.getElementById('videoPlayer');
    if (Hls.isSupported()) {
        hls = new Hls({
            debug: false,
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90
        });
        
        hls.attachMedia(videoPlayer);

        hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        showNotification('error', 'Erro de conexão', 'Não foi possível conectar ao canal. Verifique sua internet.');
                        hls.startLoad();
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        showNotification('error', 'Erro de mídia', 'O canal está com problemas. Tente novamente mais tarde.');
                        hls.recoverMediaError();
                        break;
                    default:
                        showNotification('error', 'Canal indisponível', 'Este canal está temporariamente fora do ar.');
                        hideLoading();
                        hls.destroy();
                        break;
                }
            }
        });

        // Eventos de carregamento do HLS
        hls.on(Hls.Events.MANIFEST_LOADING, () => {
            showNotification('info', 'Carregando canal', 'Por favor, aguarde...', 2000);
        });

        hls.on(Hls.Events.LEVEL_LOADED, () => {
            showNotification('success', 'Canal carregado', 'Boa diversão!', 3000);
        });
    }

    // Eventos do player
    videoPlayer.addEventListener('playing', () => {
        if (currentChannel) {
            showNotification('success', 'Canal no ar', `${currentChannel.name} está sendo reproduzido`, 3000);
        }
    });

    videoPlayer.addEventListener('error', () => {
        showNotification('error', 'Erro no canal', 'Não foi possível reproduzir este canal. Tente outro.');
    });

    videoPlayer.addEventListener('stalled', () => {
        showNotification('warning', 'Problemas de conexão', 'A reprodução está instável. Verificando conexão...', 3000);
    });

    videoPlayer.addEventListener('waiting', () => {
        showNotification('info', 'Carregando', 'Aguarde, recuperando transmissão...', 2000);
    });
}

export function playChannel(channel) {
    if (!channel || !channel.url) {
        showNotification('error', 'Canal inválido', 'Não foi possível carregar este canal.');
        return;
    }

    const videoPlayer = document.getElementById('videoPlayer');
    
    // Atualiza status do canal
    currentChannel = channel;
    showNotification('info', 'Iniciando canal', `Carregando ${channel.name}...`, 2000);

    try {
        if (Hls.isSupported()) {
            hls.loadSource(channel.url);
            
            // Define timeout para erro de carregamento
            const loadTimeout = setTimeout(() => {
                showNotification('error', 'Tempo excedido', 'O canal demorou muito para responder. Tente novamente.');
                hideLoading();
            }, 15000);

            hls.once(Hls.Events.MANIFEST_PARSED, () => {
                clearTimeout(loadTimeout);
                videoPlayer.play()
                    .catch(error => {
                        console.error('Erro ao iniciar reprodução:', error);
                        showNotification('error', 'Erro de reprodução', 'Não foi possível iniciar o canal.');
                    });
            });
        } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
            videoPlayer.src = channel.url;
            videoPlayer.play()
                .catch(error => {
                    console.error('Erro ao iniciar reprodução:', error);
                    showNotification('error', 'Erro de reprodução', 'Não foi possível iniciar o canal.');
                });
        }
    } catch (error) {
        console.error('Erro ao carregar canal:', error);
        showNotification('error', 'Erro inesperado', 'Ocorreu um erro ao carregar o canal.');
    }
}

function showNotification(type, title, message, duration = 5000) {
    const backgroundColor = {
        error: 'linear-gradient(to right, #ff5f6d, #ffc371)',
        success: 'linear-gradient(to right, #00b09b, #96c93d)',
        warning: 'linear-gradient(to right, #f6d365, #fda085)',
        info: 'linear-gradient(to right, #2193b0, #6dd5ed)'
    };

    const icon = {
        error: '❌',
        success: '✅',
        warning: '⚠️',
        info: 'ℹ️'
    };

    Toastify({
        text: `${icon[type]} ${title}\n${message}`,
        duration: duration,
        gravity: "top",
        position: "right",
        style: {
            background: backgroundColor[type],
            borderRadius: '8px',
            padding: '12px 20px',
            boxShadow: '0 3px 10px rgba(0,0,0,0.2)',
            fontSize: '14px',
            maxWidth: '320px'
        },
        onClick: function(){} // Callback after click
    }).showToast();
}

function hideLoading() {
    const loadingOverlay = document.getElementById('playerLoadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('active');
    }
}

export function getCurrentChannel() {
    return currentChannel;
}
