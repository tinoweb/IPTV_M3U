import { loadFromLocalStorage } from '../utils/db.js';

export async function initContentPages() {
    const moviesList = document.getElementById('moviesList');
    const seriesList = document.getElementById('seriesList');
    const favoritesList = document.getElementById('favoritesList');
    const searchMovie = document.getElementById('searchMovie');
    const searchSeries = document.getElementById('searchSeries');
    const searchFavorites = document.getElementById('searchFavorites');

    // Return if not on any of these content pages
    if (!moviesList && !seriesList && !favoritesList) return;

    try {
        const response = await fetch('./public/data/channels.json');
        const data = await response.json();
        const allChannels = data.savedChannels || [];

        // Sort alphabetically
        allChannels.sort((a, b) => a.name.localeCompare(b.name));

        if (moviesList) {
            setupGridPage(moviesList, allChannels.filter(ch => ch.category === 'Filmes'), searchMovie, 'Nenhum filme disponível no momento.');
        } else if (seriesList) {
            setupGridPage(seriesList, allChannels.filter(ch => ch.category === 'Séries'), searchSeries, 'Nenhuma série disponível no momento.');
        } else if (favoritesList) {
            const favorites = loadFromLocalStorage('favorites') || [];
            const favChannels = allChannels.filter(ch => favorites.includes(ch.url));
            setupGridPage(favoritesList, favChannels, searchFavorites, 'Nenhum favorito adicionado ainda.');
        }
    } catch (error) {
        console.error('Error initializing content page:', error);
    }
}

function setupGridPage(container, channels, searchInput, emptyMessage) {
    function render(list) {
        container.innerHTML = '';
        if (list.length === 0) {
            container.innerHTML = `
                <div class="coming-soon">
                    <i class="fas fa-info-circle"></i>
                    <h3>Vazio</h3>
                    <p>${emptyMessage}</p>
                </div>
            `;
            return;
        }

        list.forEach(channel => {
            const card = document.createElement('div');
            card.className = 'content-card';
            
            const firstLetter = channel.name.charAt(0).toUpperCase();
            const logoHTML = channel.logo 
                ? `<img class="card-logo" src="${channel.logo}" alt="${channel.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
                : '';

            card.innerHTML = `
                <div class="card-logo-wrapper">
                    ${logoHTML}
                    <div class="card-avatar" style="${channel.logo ? 'display:none;' : ''}">${firstLetter}</div>
                </div>
                <div class="card-body">
                    <h3 class="card-title">${channel.name}</h3>
                    <span class="card-category">${channel.category || 'Geral'}</span>
                    <button class="card-play-btn"><i class="fas fa-play"></i> Assistir</button>
                </div>
            `;

            card.addEventListener('click', () => {
                window.location.href = `index.html?play=${encodeURIComponent(channel.url)}`;
            });

            container.appendChild(card);
        });
    }

    // Initial render
    render(channels);

    // Setup live search if input is present
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase().trim();
            const normalize = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
            const filtered = channels.filter(ch => normalize(ch.name).includes(normalize(query)));
            render(filtered);
        });
    }
}
