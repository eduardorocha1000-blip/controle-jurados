// Sistema de autenticação para Cloudflare Pages
// Substitui express-session por JWT

const AUTH_API_URL = '/api/auth';

// Aguardar DOM estar pronto
document.addEventListener('DOMContentLoaded', () => {
    const pathname = window.location.pathname;
    console.log('Pathname:', pathname);
    
    // Verificar se está na página de login
    if (pathname === '/index.html' || pathname === '/' || pathname.endsWith('/index.html')) {
        const loginForm = document.getElementById('loginForm');
        console.log('Formulário encontrado:', !!loginForm);
        
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log('Formulário enviado!');
                await fazerLogin();
            });
        } else {
            console.error('Formulário de login não encontrado!');
        }
    } else {
        // Verificar autenticação em outras páginas
        verificarAutenticacao();
    }
});

// Fazer login
async function fazerLogin() {
    const emailInput = document.getElementById('email');
    const senhaInput = document.getElementById('senha');
    const submitButton = document.querySelector('#loginForm button[type="submit"]');
    const errorDiv = document.getElementById('errorMessage');
    
    if (!emailInput || !senhaInput) {
        console.error('Campos de email ou senha não encontrados!');
        if (errorDiv) {
            errorDiv.textContent = 'Erro: Campos não encontrados. Recarregue a página.';
            errorDiv.classList.remove('d-none');
        }
        return;
    }
    
    const email = emailInput.value.trim();
    const senha = senhaInput.value;
    
    if (!email || !senha) {
        if (errorDiv) {
            errorDiv.textContent = 'Por favor, preencha email e senha.';
            errorDiv.classList.remove('d-none');
        }
        return;
    }
    
    // Mostrar loading
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Entrando...';
    }
    
    if (errorDiv) {
        errorDiv.classList.add('d-none');
    }
    
    console.log('Fazendo login para:', email);
    
    try {
        const response = await fetch(`${AUTH_API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, senha })
        });
        
        console.log('Resposta recebida:', response.status, response.statusText);
        
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
        
        console.log('Login bem-sucedido! Redirecionando...');
        
        // Redirecionar para dashboard
        window.location.href = '/dashboard.html';
    } catch (error) {
        console.error('Erro no login:', error);
        if (errorDiv) {
            errorDiv.textContent = error.message || 'Erro ao fazer login. Tente novamente.';
            errorDiv.classList.remove('d-none');
        } else {
            alert(error.message || 'Erro ao fazer login. Tente novamente.');
        }
    } finally {
        // Restaurar botão
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Entrar';
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

