// Premium IPTV Player Controller using Hls.js

let hls = null;
let currentChannel = null;
let videoPlayer = null;
let loadingOverlay = null;
let loadingChannelName = null;

export function initPlayer() {
    videoPlayer = document.getElementById('videoPlayer');
    loadingOverlay = document.getElementById('playerLoadingOverlay');
    loadingChannelName = document.getElementById('loadingChannelName');

    if (!videoPlayer) {
        console.error('Video player element not found');
        return;
    }

    // Initialize Hls.js if supported
    if (typeof Hls !== 'undefined' && Hls.isSupported()) {
        hls = new Hls({
            debug: false,
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90,
            manifestLoadingTimeOut: 15000,
            manifestLoadingMaxRetry: 4,
            levelLoadingTimeOut: 15000,
            levelLoadingMaxRetry: 4,
            fragLoadingTimeOut: 15000,
            fragLoadingMaxRetry: 4
        });
        hls.attachMedia(videoPlayer);

        hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        console.warn('HLS Network error, attempting recovery...');
                        hls.startLoad();
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        console.warn('HLS Media error, attempting recovery...');
                        hls.recoverMediaError();
                        break;
                    default:
                        console.error('Fatal HLS error, stopping playback:', data);
                        hls.destroy();
                        hideLoadingOverlay();
                        showNotification('error', 'Canal Indisponível', 'Este canal está fora do ar ou não suporta reprodução no navegador.');
                        break;
                }
            }
        });
    }

    // Native player event listeners for loading state
    videoPlayer.addEventListener('waiting', () => {
        showLoadingOverlay();
    });

    videoPlayer.addEventListener('playing', () => {
        hideLoadingOverlay();
    });

    videoPlayer.addEventListener('error', (e) => {
        console.error('HTML5 Video Error:', e);
        hideLoadingOverlay();
        showNotification('error', 'Erro de Reprodução', 'Ocorreu um erro ao reproduzir este canal.');
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.key.toLowerCase()) {
            case ' ': // Spacebar to Play/Pause
                e.preventDefault();
                togglePlay();
                break;
            case 'f': // F for Fullscreen
                e.preventDefault();
                toggleFullscreen();
                break;
            case 'm': // M to Mute/Unmute
                e.preventDefault();
                toggleMute();
                break;
            case 'arrowup': // Vol Up
                e.preventDefault();
                adjustVolume(0.1);
                break;
            case 'arrowdown': // Vol Down
                e.preventDefault();
                adjustVolume(-0.1);
                break;
        }
    });

    console.log('Player system initialized successfully');
}

export function playChannel(channel) {
    if (!videoPlayer) {
        videoPlayer = document.getElementById('videoPlayer');
    }
    if (!videoPlayer || !channel || !channel.url) {
        showNotification('error', 'Canal Inválido', 'Não foi possível carregar as informações deste canal.');
        return;
    }

    currentChannel = channel;
    
    // Update loading overlay with channel details
    if (loadingChannelName) {
        loadingChannelName.textContent = channel.name;
    }
    showLoadingOverlay();

    // Update active class on channel items in the list
    document.querySelectorAll('.channel-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-channel-id') == channel.id) {
            item.classList.add('active');
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    });

    try {
        if (typeof Hls !== 'undefined' && Hls.isSupported() && hls) {
            hls.loadSource(channel.url);
            hls.once(Hls.Events.MANIFEST_PARSED, () => {
                videoPlayer.play()
                    .then(() => {
                        hideLoadingOverlay();
                        showNotification('success', 'Reproduzindo', channel.name);
                    })
                    .catch(err => {
                        console.error('Play request failed:', err);
                        hideLoadingOverlay();
                    });
            });
        } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari / Apple native HLS fallback
            videoPlayer.src = channel.url;
            videoPlayer.play()
                .then(() => {
                    hideLoadingOverlay();
                    showNotification('success', 'Reproduzindo', channel.name);
                })
                .catch(err => {
                    console.error('Play request failed:', err);
                    hideLoadingOverlay();
                });
        } else {
            hideLoadingOverlay();
            showNotification('error', 'Navegador Incompatível', 'Seu navegador não suporta reprodução HLS (.m3u8).');
        }
    } catch (error) {
        console.error('Stream load error:', error);
        hideLoadingOverlay();
        showNotification('error', 'Erro', 'Falha ao conectar com o canal.');
    }
}

export function togglePlay() {
    if (!videoPlayer) return;
    if (videoPlayer.paused) {
        videoPlayer.play().catch(console.error);
    } else {
        videoPlayer.pause();
    }
}

export function toggleMute() {
    if (!videoPlayer) return;
    videoPlayer.muted = !videoPlayer.muted;
    showNotification('info', videoPlayer.muted ? 'Mutado' : 'Som Ativo', '');
}

export function toggleFullscreen() {
    if (!videoPlayer) return;
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        videoPlayer.requestFullscreen().catch(err => {
            console.error('Fullscreen request failed:', err);
        });
    }
}

export function adjustVolume(amount) {
    if (!videoPlayer) return;
    videoPlayer.volume = Math.max(0, Math.min(1, videoPlayer.volume + amount));
    showNotification('info', `Volume: ${Math.round(videoPlayer.volume * 100)}%`, '');
}

function showLoadingOverlay() {
    if (loadingOverlay) {
        loadingOverlay.classList.add('active');
    }
}

function hideLoadingOverlay() {
    if (loadingOverlay) {
        loadingOverlay.classList.remove('active');
    }
}

function showNotification(type, title, message) {
    const gradients = {
        error: 'linear-gradient(135deg, #ff007f 0%, #ff4500 100%)',
        success: 'linear-gradient(135deg, #00b09b 0%, #96c93d 100%)',
        info: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
    };

    const icons = {
        error: '💥',
        success: '📺',
        info: 'ℹ️'
    };

    Toastify({
        text: `${icons[type]} ${title} - ${message}`,
        duration: 3000,
        gravity: 'top',
        position: 'right',
        style: {
            background: gradients[type] || gradients.info,
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: '500',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }
    }).showToast();
}
