// JavaScript para a página de perfil

document.addEventListener('DOMContentLoaded', () => {
    verificarAutenticacao();
    carregarInformacoesUsuario();
});

// Carregar informações do usuário
function carregarInformacoesUsuario() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            
            const userNomeEl = document.getElementById('userNome');
            const userEmailEl = document.getElementById('userEmail');
            const userPerfilEl = document.getElementById('userPerfil');
            const userNameEl = document.getElementById('userName');
            
            if (userNomeEl) userNomeEl.textContent = user.nome || '-';
            if (userEmailEl) userEmailEl.textContent = user.email || '-';
            if (userPerfilEl) userPerfilEl.textContent = user.perfil || '-';
            if (userNameEl) userNameEl.textContent = user.nome || 'Usuário';
        } catch (e) {
            console.error('Erro ao parsear usuário:', e);
        }
    }
}

// Verificar autenticação
function verificarAutenticacao() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/index.html';
        return;
    }
}

