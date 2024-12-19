// Configurações do PIX para cada valor
const pixKeys = {
    '10': '00020126580014BR.GOV.BCB.PIX0136cdc48965-f3bf-405d-9017-7117c8acd065520400005303986540510.005802BR5925Albertino Gomes dos Reis 6009SAO PAULO62140510ND6xH0bF4V63046D6E',
    '20': '00020126580014BR.GOV.BCB.PIX0136cdc48965-f3bf-405d-9017-7117c8acd065520400005303986540520.005802BR5925Albertino Gomes dos Reis 6009SAO PAULO62140510KnJ3H7b0NM6304F184',
    '50': '00020126580014BR.GOV.BCB.PIX0136cdc48965-f3bf-405d-9017-7117c8acd065520400005303986540550.005802BR5925Albertino Gomes dos Reis 6009SAO PAULO62140510HJqZPaywyr630457AE'
};

// Configurações do QR Code para cada valor
const qrCodes = {
    '10': 'images/qr-pix-10.png',
    '20': 'images/qr-pix-20.png',
    '50': 'images/qr-pix-50.png'
};

export function initDonationSystem() {
    const modal = document.getElementById('donationModal');
    const donateButton = document.getElementById('donateButton');
    const closeButton = document.querySelector('.close-modal');
    const donationButtons = document.querySelectorAll('.donation-value');
    const pixInfo = document.querySelector('.pix-info');
    const pixKeyInput = document.getElementById('pixKey');
    const pixQRImage = document.getElementById('pixQR');
    const copyButton = document.getElementById('copyPixKey');

    // Abrir modal
    donateButton?.addEventListener('click', () => {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Previne rolagem do body
    });

    // Fechar modal
    const closeModal = () => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        // Reset seleção
        donationButtons.forEach(btn => btn.classList.remove('selected'));
        pixInfo.style.display = 'none';
    };

    closeButton?.addEventListener('click', closeModal);

    // Fechar modal ao clicar fora
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Selecionar valor de doação
    donationButtons.forEach(button => {
        button.addEventListener('click', () => {
            const value = button.getAttribute('data-value');
            
            // Remove seleção anterior
            donationButtons.forEach(btn => btn.classList.remove('selected'));
            
            // Adiciona seleção atual
            button.classList.add('selected');
            
            // Atualiza informações do PIX
            pixKeyInput.value = pixKeys[value];
            pixQRImage.src = qrCodes[value];
            
            // Mostra seção do PIX
            pixInfo.style.display = 'block';

            // Scroll suave até as informações do PIX
            pixInfo.scrollIntoView({ behavior: 'smooth' });
        });
    });

    // Copiar chave PIX
    copyButton?.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(pixKeyInput.value);
            Toastify({
                text: "Chave PIX copiada com sucesso!",
                duration: 3000,
                gravity: "top",
                position: "right",
                style: {
                    background: "linear-gradient(to right, #00b09b, #96c93d)",
                }
            }).showToast();
        } catch (err) {
            Toastify({
                text: "Erro ao copiar a chave PIX",
                duration: 3000,
                gravity: "top",
                position: "right",
                style: {
                    background: "linear-gradient(to right, #ff5f6d, #ffc371)",
                }
            }).showToast();
        }
    });
}
