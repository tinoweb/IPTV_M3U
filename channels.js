document.addEventListener('DOMContentLoaded', async () => {
    const channelsGrid = document.getElementById('channelsGrid');
    const searchInput = document.getElementById('searchChannel');
    const groupFilter = document.getElementById('groupFilter');
    let channels = [];

    // Migrar dados do localStorage para o arquivo JSON (executar apenas uma vez)
    async function migrateData() {
        try {
            channels = await window.electronAPI.migrateFromLocalStorage(localStorage);
            // Limpar localStorage após migração bem-sucedida
            localStorage.removeItem('savedChannels');
            updateChannelsDisplay();
            updateGroupFilter();
        } catch (error) {
            console.error('Erro na migração:', error);
        }
    }

    // Carregar canais do arquivo JSON
    async function loadChannels() {
        try {
            channels = await window.electronAPI.getChannels();
            updateChannelsDisplay();
            updateGroupFilter();
        } catch (error) {
            console.error('Erro ao carregar canais:', error);
        }
    }

    // Atualizar a exibição dos canais
    function updateChannelsDisplay(filter = '') {
        const filteredChannels = channels.filter(channel => 
            channel.name.toLowerCase().includes(filter.toLowerCase()) &&
            (groupFilter.value === '' || channel.group_title === groupFilter.value)
        );

        channelsGrid.innerHTML = '';
        
        filteredChannels.forEach(channel => {
            const channelCard = document.createElement('div');
            channelCard.className = 'channel-card';
            
            channelCard.innerHTML = `
                <div class="channel-logo">
                    ${channel.logo ? `<img src="${channel.logo}" alt="${channel.name}">` : 
                    `<i class="fas fa-tv"></i>`}
                </div>
                <div class="channel-info">
                    <h3>${channel.name}</h3>
                    ${channel.group_title ? `<span class="channel-group">${channel.group_title}</span>` : ''}
                </div>
                <div class="channel-actions">
                    <button onclick="playChannel('${channel.url}')" class="btn-play">
                        <i class="fas fa-play"></i>
                    </button>
                    <button onclick="removeChannel('${channel.url}')" class="btn-remove">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            channelsGrid.appendChild(channelCard);
        });
    }

    // Atualizar o filtro de grupos
    function updateGroupFilter() {
        const groups = [...new Set(channels.map(channel => channel.group_title).filter(Boolean))];
        groupFilter.innerHTML = '<option value="">Todos os grupos</option>';
        groups.sort().forEach(group => {
            groupFilter.innerHTML += `<option value="${group}">${group}</option>`;
        });
    }

    // Remover canal
    window.removeChannel = async (url) => {
        if (confirm('Tem certeza que deseja remover este canal?')) {
            await window.electronAPI.removeChannel(url);
            await loadChannels();
        }
    };

    // Play channel in the main player
    function playChannel(url) {
        window.location.href = `index.html?url=${encodeURIComponent(url)}`;
    }

    // Event Listeners
    searchInput.addEventListener('input', (e) => {
        updateChannelsDisplay(e.target.value);
    });

    groupFilter.addEventListener('change', () => {
        updateChannelsDisplay(searchInput.value);
    });

    // Verificar se há dados no localStorage para migrar
    if (localStorage.getItem('savedChannels')) {
        await migrateData();
    } else {
        await loadChannels();
    }
});
