// Sistema de autenticação para Cloudflare Pages
// Substitui express-session por JWT

const API_URL = '/api/auth';

// Verificar se está na página de login
if (window.location.pathname === '/index.html' || window.location.pathname === '/') {
    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await fazerLogin();
    });
} else {
    // Verificar autenticação em outras páginas
    verificarAutenticacao();
}

// Fazer login
async function fazerLogin() {
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    const errorDiv = document.getElementById('errorMessage');
    
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, senha })
        });
        
        // Verificar se a resposta tem conteúdo
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            throw new Error(`Resposta inválida do servidor: ${text || 'Resposta vazia'}`);
        }
        
        if (!response.ok) {
            let error;
            try {
                error = await response.json();
            } catch (e) {
                const text = await response.text();
                throw new Error(`Erro ${response.status}: ${text || 'Erro desconhecido'}`);
            }
            throw new Error(error.error || error.message || 'Erro ao fazer login');
        }
        
        let data;
        try {
            data = await response.json();
        } catch (e) {
            const text = await response.text();
            throw new Error(`Resposta JSON inválida: ${text || 'Resposta vazia'}`);
        }
        
        // Armazenar token JWT
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Redirecionar para dashboard
        window.location.href = '/dashboard.html';
    } catch (error) {
        console.error('Erro no login:', error);
        if (errorDiv) {
            errorDiv.textContent = error.message;
            errorDiv.classList.remove('d-none');
        } else {
            alert(error.message);
        }
    }
}

// Fazer logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
}

// Verificar autenticação
function verificarAutenticacao() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        window.location.href = '/index.html';
        return false;
    }
    
    // Exibir nome do usuário se disponível
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            const userNameEl = document.getElementById('userName');
            if (userNameEl) {
                userNameEl.textContent = user.nome || 'Usuário';
            }
        } catch (e) {
            console.error('Erro ao parsear usuário:', e);
        }
    }
    
    return true;
}

// Obter token para requisições
function getAuthToken() {
    return localStorage.getItem('token');
}

