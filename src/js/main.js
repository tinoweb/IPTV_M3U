import { loadLocalChannels, filterChannels } from './app/channels.js';
import { initPlayer, playChannel } from './app/player.js';
import { initDonationSystem } from './app/donation.js';
import { initContentPages } from './app/contentPages.js';

// Configuration and Theme State
const toggleThemeButton = document.getElementById('toggleTheme');
const showShortcutsButton = document.getElementById('showShortcuts');
const shortcutsModal = document.getElementById('shortcutsModal');
const loadingOverlay = document.getElementById('loadingOverlay');

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

// Mobile sidebar controls
function setupMobileMenu() {
    const mobileMenuBtn = document.getElementById('toggleChannels');
    const closeSidebarBtn = document.getElementById('mobileCloseBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('channelsOverlay');
    const channelsList = document.getElementById('channelsList');

    if (!sidebar) return;

    function openSidebar() {
        sidebar.classList.add('active');
        if (sidebarOverlay) sidebarOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        sidebar.classList.remove('active');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    mobileMenuBtn?.addEventListener('click', openSidebar);
    closeSidebarBtn?.addEventListener('click', closeSidebar);
    sidebarOverlay?.addEventListener('click', closeSidebar);

    // Close when clicking a channel on mobile
    if (channelsList) {
        channelsList.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                const channelItem = e.target.closest('.channel-item');
                // Don't close if they clicked the favorite heart button
                if (channelItem && !e.target.closest('.fav-btn')) {
                    closeSidebar();
                }
            }
        });
    }

    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            closeSidebar();
        }
    });
}

// Initializing the application components on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    setupMobileMenu();
    initPlayer();
    initDonationSystem();
    initContentPages();

    // Setup shortcuts modal triggers
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

    // Toggle theme trigger
    if (toggleThemeButton) {
        toggleThemeButton.addEventListener('click', toggleTheme);
    }

    // Load channels and check URL params for auto-play
    loadLocalChannels().then(loadedChannels => {
        if (!loadedChannels || loadedChannels.length === 0) return;

        const urlParams = new URLSearchParams(window.location.search);
        const playUrl = urlParams.get('play');
        const channelId = urlParams.get('channel');
        
        if (playUrl) {
            const channel = loadedChannels.find(ch => ch.url === decodeURIComponent(playUrl));
            if (channel) {
                playChannel(channel);
            }
        } else if (channelId) {
            const channel = loadedChannels.find(ch => ch.id == channelId);
            if (channel) {
                playChannel(channel);
            }
        } else {
            // Auto play a stable, verified channel on index page load for convenience
            const defaultChannel = loadedChannels.find(ch => ch.name.includes('SBT Nacional')) 
                || loadedChannels.find(ch => ch.name.includes('TV Brasil'))
                || loadedChannels[0];
            if (defaultChannel && (window.location.pathname.endsWith('index.html') || window.location.pathname === '/')) {
                playChannel(defaultChannel);
            }
        }
    });
});
