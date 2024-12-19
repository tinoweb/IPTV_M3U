document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const linksInput = document.getElementById('linksInput');
    const checkLinksBtn = document.getElementById('checkLinks');
    const clearLinksBtn = document.getElementById('clearLinks');
    const progressBar = document.getElementById('checkProgress');
    const progressText = document.getElementById('progressText');
    const onlineCount = document.getElementById('onlineCount');
    const offlineCount = document.getElementById('offlineCount');
    const workingLinksList = document.getElementById('workingLinksList');
    const allLinksList = document.getElementById('allLinksList');
    const copyWorkingLinksBtn = document.getElementById('copyWorkingLinks');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const themeSwitch = document.getElementById('themeSwitch');

    // Theme handling
    const currentTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    themeSwitch.checked = currentTheme === 'dark';

    themeSwitch.addEventListener('change', () => {
        const theme = themeSwitch.checked ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    });

    // Tab handling
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.dataset.tab;
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(tab === 'working' ? 'workingLinks' : 'allLinks').classList.add('active');
        });
    });

    // Check if a stream is working
    async function checkStream(url) {
        try {
            const response = await fetch(url, { method: 'HEAD', timeout: 5000 });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    // Create link item element
    function createLinkItem(url, isWorking, metadata = {}) {
        const div = document.createElement('div');
        div.className = 'link-item';
        div.innerHTML = `
            <div class="link-info">
                <span class="status ${isWorking ? 'online' : 'offline'}">
                    <i class="fas fa-${isWorking ? 'check' : 'times'}-circle"></i>
                </span>
                <div class="link-details">
                    <span class="channel-name">${metadata.name || 'Canal sem nome'}</span>
                    <span class="link-url">${url}</span>
                </div>
            </div>
            <div class="link-actions">
                <button class="btn-secondary test-link" title="Testar link">
                    <i class="fas fa-play"></i>
                </button>
                ${isWorking ? `
                    <button class="btn-secondary save-channel" title="Salvar canal">
                        <i class="fas fa-save"></i>
                    </button>
                ` : ''}
            </div>
        `;

        // Adicionar eventos aos botões
        const testButton = div.querySelector('.test-link');
        testButton.addEventListener('click', () => {
            window.open(url, '_blank');
        });

        if (isWorking) {
            const saveButton = div.querySelector('.save-channel');
            saveButton.addEventListener('click', async () => {
                try {
                    const response = await fetch('http://localhost:3000/api/channels', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            name: metadata.name || 'Canal sem nome',
                            url: url,
                            status: 'online'
                        })
                    });

                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || 'Erro ao salvar canal');
                    }

                    const result = await response.json();
                    Toastify({
                        text: "Canal salvo com sucesso!",
                        duration: 3000,
                        gravity: "top",
                        position: 'right',
                        style: {
                            background: "#28a745"
                        }
                    }).showToast();

                    saveButton.disabled = true;
                    saveButton.innerHTML = '<i class="fas fa-check"></i>';
                } catch (error) {
                    console.error('Erro ao salvar canal:', error);
                    Toastify({
                        text: error.message,
                        duration: 3000,
                        gravity: "top",
                        position: 'right',
                        style: {
                            background: "#dc3545"
                        }
                    }).showToast();
                }
            });
        }

        return div;
    }

    // Update progress
    function updateProgress(current, total) {
        const percentage = (current / total) * 100;
        progressBar.style.width = `${percentage}%`;
        progressText.textContent = `${current} de ${total} links verificados`;
    }

    let currentMetadata = null;

    function parseMetadata(line) {
        if (!line.startsWith('#EXTINF:')) return null;
        
        const metadata = {};
        // Extract duration and name
        const matches = line.match(/#EXTINF:(-?\d+)\s*(.*?),\s*(.*)/);
        if (matches) {
            metadata.duration = matches[1];
            metadata.attributes = matches[2];
            metadata.name = matches[3];
        }

        // Extract tvg-id if present
        const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
        if (tvgIdMatch) {
            metadata.tvgId = tvgIdMatch[1];
        }

        return metadata;
    }

    async function processLinks() {
        const linksText = linksInput.value;
        const lines = linksText.split('\n').map(line => line.trim());
        const links = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.startsWith('#EXTINF:')) {
                currentMetadata = parseMetadata(line);
            } else if (line.startsWith('https://')) {
                if (currentMetadata) {
                    links.push({
                        url: line,
                        metadata: currentMetadata
                    });
                    currentMetadata = null;
                } else {
                    links.push({
                        url: line,
                        metadata: { name: 'Canal sem nome' }
                    });
                }
            }
        }

        if (links.length === 0) {
            Toastify({
                text: "Nenhum link HTTPS válido encontrado!",
                duration: 3000,
                gravity: "top",
                position: 'right',
                style: {
                    background: "#dc3545",
                }
            }).showToast();
            return;
        }

        let totalLinks = links.length;
        let checkedLinks = 0;
        let workingLinks = 0;
        let nonWorkingLinks = 0;

        workingLinksList.innerHTML = '';
        allLinksList.innerHTML = '';
        
        updateProgress(0, totalLinks);
        
        for (const link of links) {
            try {
                const isWorking = await checkStream(link.url);
                
                if (isWorking) {
                    workingLinks++;
                    workingLinksList.appendChild(createLinkItem(link.url, true, link.metadata));
                } else {
                    nonWorkingLinks++;
                }
                
                allLinksList.appendChild(createLinkItem(link.url, isWorking, link.metadata));
                
                checkedLinks++;
                updateProgress(checkedLinks, totalLinks);
                onlineCount.textContent = workingLinks;
                offlineCount.textContent = nonWorkingLinks;
            } catch (error) {
                console.error('Erro ao verificar link:', error);
                nonWorkingLinks++;
                allLinksList.appendChild(createLinkItem(link.url, false, link.metadata));
                
                checkedLinks++;
                updateProgress(checkedLinks, totalLinks);
                onlineCount.textContent = workingLinks;
                offlineCount.textContent = nonWorkingLinks;
            }
        }

        Toastify({
            text: `Verificação concluída! ${workingLinks} links funcionando, ${nonWorkingLinks} offline.`,
            duration: 3000,
            gravity: "top",
            position: 'right',
            style: {
                background: workingLinks > 0 ? "#28a745" : "#dc3545",
            }
        }).showToast();

        // Salvar canais online no localStorage
        const existingChannels = JSON.parse(localStorage.getItem('savedChannels') || '[]');
        const newChannels = links.filter(link => link.metadata && link.metadata.name && link.metadata.name !== 'Canal sem nome')
            .filter(link => existingChannels.every(channel => channel.url !== link.url))
            .map(link => ({ name: link.metadata.name, url: link.url }));

        if (newChannels.length > 0) {
            const updatedChannels = [...existingChannels, ...newChannels];
            localStorage.setItem('savedChannels', JSON.stringify(updatedChannels));
            Toastify({
                text: `${newChannels.length} canais salvos com sucesso!`,
                duration: 3000,
                gravity: "top",
                position: 'right',
                style: {
                    background: "#28a745",
                }
            }).showToast();
        }
    }

    // Event Listeners
    checkLinksBtn.addEventListener('click', processLinks);

    clearLinksBtn.addEventListener('click', () => {
        linksInput.value = '';
        workingLinksList.innerHTML = '';
        allLinksList.innerHTML = '';
        progressBar.style.width = '0%';
        progressText.textContent = '0 de 0 links verificados';
        onlineCount.textContent = '0';
        offlineCount.textContent = '0';
    });

    copyWorkingLinksBtn.addEventListener('click', () => {
        const workingLinks = Array.from(workingLinksList.querySelectorAll('.link-url'))
            .map(span => span.textContent)
            .join('\n');

        if (workingLinks) {
            navigator.clipboard.writeText(workingLinks).then(() => {
                Toastify({
                    text: "Links copiados com sucesso!",
                    duration: 3000,
                    gravity: "top",
                    position: 'right',
                    style: {
                        background: "#28a745",
                    }
                }).showToast();
            });
        }
    });
});
