// Elementos do DOM
const channelsSection = document.querySelector('.channels-section');
const channelsList = document.getElementById('channelsList');
const searchInput = document.getElementById('searchChannel');
const toggleChannelsBtn = document.getElementById('toggleChannels');
const channelsOverlay = document.getElementById('channelsOverlay');
const loadingOverlay = document.getElementById('loadingOverlay');

// Estado
let channels = [];
let activeChannel = null;

// Funções de utilidade
function showLoading() {
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
    }
}

function hideLoading() {
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

function showToast(message, type = 'info') {
    Toastify({
        text: message,
        duration: 3000,
        gravity: 'top',
        position: 'right',
        style: {
            background: type === 'error' ? '#ff5252' : '#4caf50'
        },
        className: `toast-${type}`
    }).showToast();
}

// Funções principais
function toggleChannelsList() {
    channelsSection?.classList.toggle('active');
    channelsOverlay?.classList.toggle('active');
}

function closeChannelsList() {
    channelsSection?.classList.remove('active');
    channelsOverlay?.classList.remove('active');
}

function filterChannels() {
    const searchTerm = searchInput.value.toLowerCase().trim();

    // Normaliza o texto removendo acentos e espaços extras
    const normalizeText = (text) => {
        return text.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    };

    const normalizedSearchTerm = normalizeText(searchTerm);

    const filteredChannels = channels.filter(channel => {
        const normalizedChannelName = normalizeText(channel.name.toLowerCase());
        return normalizedChannelName.includes(normalizedSearchTerm);
    });

    console.log(`Filtrado: ${filteredChannels.length} canais para o termo "${searchTerm}"`);
    renderChannels(filteredChannels);

    // Adiciona feedback quando não há resultados
    if (filteredChannels.length === 0 && searchTerm !== '') {
        channelsList.innerHTML = `
            <div class="no-results">
                <p>Nenhum canal encontrado para "${searchInput.value}"</p>
                <small>Tente uma pesquisa diferente</small>
            </div>
        `;
    }
}

function renderChannels(channelsToRender) {
    if (!channelsList) {
        console.error('Lista de canais não encontrada');
        return;
    }

    channelsList.innerHTML = '';
    
    channelsToRender.forEach(channel => {
        const channelElement = document.createElement('div');
        channelElement.className = `channel-item ${channel === activeChannel ? 'active' : ''}`;
        
        channelElement.innerHTML = `
            <div class="channel-info">
                <div class="channel-name">${channel.name}</div>
            </div>
            <button class="btn-watch" onclick="window.playChannel('${channel.url}')">
                <i class="fas fa-play"></i>
                Assistir
            </button>
        `;
        
        channelElement.addEventListener('click', () => {
            setActiveChannel(channel);
            if (window.innerWidth <= 768) {
                closeChannelsList();
            }
        });
        
        channelsList.appendChild(channelElement);
    });

    console.log(`Renderizados ${channelsToRender.length} canais`);
}

function setActiveChannel(channel) {
    activeChannel = channel;
    if (window.videoPlayer && window.videoPlayer.hls) {
        window.videoPlayer.hls.loadSource(channel.url);
    }
}

async function loadLocalChannels() {
    try {
        showLoading();
        const response = await fetch('./public/data/channels.json');
        const data = await response.json();
        channels = data.savedChannels;

        // Ordenar canais por nome
        channels.sort((a, b) => a.name.localeCompare(b.name));

        // Limpar o input de pesquisa
        if (searchInput) {
            searchInput.value = '';
        }

        // Renderizar todos os canais
        renderChannels(channels);
        hideLoading();
    } catch (error) {
        console.error('Erro ao carregar canais:', error);
        showToast('Erro ao carregar a lista de canais', 'error');
        hideLoading();
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadLocalChannels();

    // Event listeners para pesquisa
    if (searchInput) {
        searchInput.addEventListener('input', filterChannels);
    }

    // Event listeners para toggle de canais
    if (toggleChannelsBtn) {
        toggleChannelsBtn.addEventListener('click', toggleChannelsList);
    }
    if (channelsOverlay) {
        channelsOverlay.addEventListener('click', closeChannelsList);
    }
});

// Função global para reproduzir canal
window.playChannel = function(url) {
    const channel = channels.find(ch => ch.url === url);
    if (channel) {
        setActiveChannel(channel);
    }
};

// Exportar funções necessárias
export {
    loadLocalChannels,
    renderChannels,
    channels,
    setActiveChannel
};
