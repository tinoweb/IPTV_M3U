const fs = require('fs').promises;
const path = require('path');

class ChannelsManager {
    constructor() {
        this.filePath = path.join(__dirname, 'channels.json');
    }

    async loadChannels() {
        try {
            const data = await fs.readFile(this.filePath, 'utf8');
            return JSON.parse(data).channels;
        } catch (error) {
            console.error('Erro ao carregar canais:', error);
            return [];
        }
    }

    async saveChannels(channels) {
        try {
            await fs.writeFile(this.filePath, JSON.stringify({ channels }, null, 2));
            return true;
        } catch (error) {
            console.error('Erro ao salvar canais:', error);
            return false;
        }
    }

    async addChannel(channel) {
        const channels = await this.loadChannels();
        const exists = channels.some(ch => ch.url === channel.url);
        
        if (!exists) {
            channels.push(channel);
            await this.saveChannels(channels);
            return true;
        }
        return false;
    }

    async removeChannel(streamUrl) {
        const channels = await this.loadChannels();
        const filteredChannels = channels.filter(ch => ch.url !== streamUrl);
        
        if (filteredChannels.length < channels.length) {
            await this.saveChannels(filteredChannels);
            return true;
        }
        return false;
    }

    async updateChannel(channel) {
        const channels = await this.loadChannels();
        const index = channels.findIndex(ch => ch.url === channel.url);
        
        if (index !== -1) {
            channels[index] = channel;
            await this.saveChannels(channels);
            return true;
        }
        return false;
    }

    async migrateFromLocalStorage(localStorage) {
        try {
            const channels = JSON.parse(localStorage.getItem('savedChannels') || '[]');
            await this.saveChannels(channels);
            return channels;
        } catch (error) {
            console.error('Erro ao migrar dados:', error);
            return [];
        }
    }
}

module.exports = new ChannelsManager();
