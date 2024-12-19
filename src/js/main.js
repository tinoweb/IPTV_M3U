// Menu Mobile Controls
document.addEventListener('DOMContentLoaded', function() {
    // Elementos do menu mobile
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const closeSidebarBtn = document.getElementById('mobileCloseBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const channelsList = document.querySelector('.channels-list');

    // Função para abrir o menu
    function openSidebar() {
        sidebar.classList.add('active');
        sidebarOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // Função para fechar o menu
    function closeSidebar() {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Event listeners para o menu mobile
    mobileMenuBtn.addEventListener('click', openSidebar);
    closeSidebarBtn.addEventListener('click', closeSidebar);
    sidebarOverlay.addEventListener('click', closeSidebar);

    // Fechar menu com tecla ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeSidebar();
        }
    });

    // Fechar menu ao clicar em um canal (em mobile)
    if (channelsList) {
        channelsList.addEventListener('click', function(e) {
            if (window.innerWidth <= 768) {
                const channelItem = e.target.closest('.channel-item');
                if (channelItem) {
                    closeSidebar();
                }
            }
        });
    }

    // Ajustar menu ao redimensionar a janela
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    // Handle active menu item
    const currentPath = window.location.pathname;
    const menuLinks = document.querySelectorAll('.sidebar-link');
    
    menuLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath.split('/').pop()) {
            link.classList.add('active');
        }
    });
});

import { loadLocalChannels } from './app/channels.js';
import { initDonationSystem } from './app/donation.js';

// Elementos do DOM
const videoPlayer = document.getElementById('videoPlayer');
const toggleThemeButton = document.getElementById('toggleTheme');
const showShortcutsButton = document.getElementById('showShortcuts');
const shortcutsModal = document.getElementById('shortcutsModal');
const loadingOverlay = document.getElementById('loadingOverlay');

// Configuração do tema
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (toggleThemeButton) {
        toggleThemeButton.innerHTML = `<i class="fas fa-${savedTheme === 'dark' ? 'sun' : 'moon'}"></i>`;
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    if (toggleThemeButton) {
        toggleThemeButton.innerHTML = `<i class="fas fa-${newTheme === 'dark' ? 'sun' : 'moon'}"></i>`;
    }
}

// Configuração do player
if (videoPlayer && Hls.isSupported()) {
    const hls = new Hls();
    videoPlayer.hls = hls;
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

// Funções
function showLoading() {
    loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    loadingOverlay.style.display = 'none';
}

function showToast(message, type = 'info') {
    Toastify({
        text: message,
        duration: 3000,
        gravity: 'top',
        position: 'right',
        backgroundColor: type === 'error' ? '#ff5252' : '#4caf50',
        className: `toast-${type}`
    }).showToast();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();

    // Inicializa o sistema de doação
    initDonationSystem();

    // Atalhos do teclado
    if (toggleThemeButton) {
        toggleThemeButton.addEventListener('click', toggleTheme);
    }

    if (showShortcutsButton && shortcutsModal) {
        showShortcutsButton.addEventListener('click', () => {
            shortcutsModal.style.display = 'flex';
        });

        shortcutsModal.addEventListener('click', (e) => {
            if (e.target === shortcutsModal) {
                shortcutsModal.style.display = 'none';
            }
        });
    }

    // Atalhos de teclado
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return;

        if (videoPlayer) {
            switch (e.key.toLowerCase()) {
                case ' ':
                    e.preventDefault();
                    videoPlayer.paused ? videoPlayer.play() : videoPlayer.pause();
                    break;
                case 'f':
                    e.preventDefault();
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    } else {
                        videoPlayer.requestFullscreen();
                    }
                    break;
                case 'm':
                    e.preventDefault();
                    videoPlayer.muted = !videoPlayer.muted;
                    break;
                case 'arrowup':
                    e.preventDefault();
                    videoPlayer.volume = Math.min(1, videoPlayer.volume + 0.1);
                    break;
                case 'arrowdown':
                    e.preventDefault();
                    videoPlayer.volume = Math.max(0, videoPlayer.volume - 0.1);
                    break;
            }
        }
    });
});
