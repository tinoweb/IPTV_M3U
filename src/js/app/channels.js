import { loadFromLocalStorage, saveToLocalStorage } from '../utils/db.js';
import { playChannel } from './player.js';

let channels = [];
let activeCategory = 'Todos';
let searchInput = null;
let channelsList = null;
let categoryTabs = null;

export async function loadLocalChannels() {
    searchInput = document.getElementById('searchChannel');
    channelsList = document.getElementById('channelsList');
    categoryTabs = document.getElementById('categoryTabs');

    if (!channelsList) {
        console.warn('Channels list container not found on this page.');
        return;
    }

    try {
        const response = await fetch('./public/data/channels.json');
        const data = await response.json();
        channels = data.savedChannels || [];

        // Sort channels by name alphabetically
        channels.sort((a, b) => a.name.localeCompare(b.name));

        // Setup Event Listeners for search
        if (searchInput) {
            searchInput.addEventListener('input', () => filterChannels());
        }

        // Setup Category Tabs
        initCategoryTabs();

        // Render all channels initially
        renderChannelsList(channels);
        
        console.log(`Loaded ${channels.length} channels successfully.`);
        return channels;
    } catch (error) {
        console.error('Error loading channels:', error);
        if (channelsList) {
            channelsList.innerHTML = `<div class="error-msg">Erro ao carregar lista de canais.</div>`;
        }
        return [];
    }
}

function initCategoryTabs() {
    if (!categoryTabs) return;

    categoryTabs.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            // Remove active class from all tabs
            categoryTabs.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            const clickedTab = e.currentTarget;
            clickedTab.classList.add('active');
            
            activeCategory = clickedTab.getAttribute('data-category');
            filterChannels();
        });
    });
}

export function filterChannels() {
    if (!channelsList) return;

    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const favorites = loadFromLocalStorage('favorites') || [];

    // Filter by Category first
    let filtered = channels;
    if (activeCategory === 'Favoritos') {
        filtered = channels.filter(ch => favorites.includes(ch.url));
    } else if (activeCategory !== 'Todos') {
        filtered = channels.filter(ch => ch.category === activeCategory);
    }

    // Then filter by search term
    if (searchTerm) {
        const normalize = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const normalizedSearch = normalize(searchTerm);
        filtered = filtered.filter(ch => normalize(ch.name).includes(normalizedSearch));
    }

    renderChannelsList(filtered);

    // If no results, show empty state helper
    if (filtered.length === 0) {
        if (activeCategory === 'Favoritos') {
            channelsList.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-heart" style="color: var(--primary-color); font-size: 2rem; margin-bottom: 10px;"></i>
                    <p>Sua lista de favoritos está vazia.</p>
                    <small>Clique no coração dos canais para adicioná-los aqui.</small>
                </div>
            `;
        } else {
            channelsList.innerHTML = `
                <div class="no-results">
                    <p>Nenhum canal encontrado.</p>
                    <small>Tente alterar sua busca ou categoria.</small>
                </div>
            `;
        }
    }
}

function renderChannelsList(channelsToRender) {
    if (!channelsList) return;

    channelsList.innerHTML = '';
    const favorites = loadFromLocalStorage('favorites') || [];

    channelsToRender.forEach(channel => {
        const isFavorited = favorites.includes(channel.url);
        const channelItem = document.createElement('div');
        channelItem.className = 'channel-item';
        channelItem.setAttribute('data-channel-id', channel.id);

        // Generate dynamic fallback letter avatar if no logo
        const firstLetter = channel.name.charAt(0).toUpperCase();
        const logoHTML = channel.logo 
            ? `<img class="channel-logo" src="${channel.logo}" alt="${channel.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
            : '';
        
        channelItem.innerHTML = `
            <div class="channel-logo-container">
                ${logoHTML}
                <div class="channel-avatar" style="${channel.logo ? 'display:none;' : ''}">${firstLetter}</div>
            </div>
            <div class="channel-info">
                <span class="channel-name">${channel.name}</span>
                <span class="channel-category">${channel.category || 'Geral'}</span>
            </div>
            <div class="channel-actions">
                <button class="fav-btn${isFavorited ? ' active' : ''}" title="Adicionar aos favoritos" aria-label="Favorito">
                    <i class="${isFavorited ? 'fas' : 'far'} fa-heart"></i>
                </button>
                <button class="watch-btn" title="Assistir canal" aria-label="Assistir">
                    <i class="fas fa-play"></i>
                </button>
            </div>
        `;

        // Watch button or direct card click triggers playing
        const watchBtn = channelItem.querySelector('.watch-btn');
        const playAction = (e) => {
            // Prevent execution if clicking fav button
            if (e.target.closest('.fav-btn')) return;
            playChannel(channel);
        };
        channelItem.addEventListener('click', playAction);

        // Fav button click toggles favorite state
        const favBtn = channelItem.querySelector('.fav-btn');
        favBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(channel, favBtn);
        });

        channelsList.appendChild(channelItem);
    });
}

function toggleFavorite(channel, favBtn) {
    const favorites = loadFromLocalStorage('favorites') || [];
    const index = favorites.indexOf(channel.url);
    const icon = favBtn.querySelector('i');

    if (index === -1) {
        favorites.push(channel.url);
        icon.className = 'fas fa-heart';
        favBtn.classList.add('active');
        saveToLocalStorage('favorites', favorites);
    } else {
        favorites.splice(index, 1);
        icon.className = 'far fa-heart';
        favBtn.classList.remove('active');
        saveToLocalStorage('favorites', favorites);
        
        // If we are currently in the favorites tab, re-filter/render immediately to remove the item
        if (activeCategory === 'Favoritos') {
            filterChannels();
        }
    }
}
