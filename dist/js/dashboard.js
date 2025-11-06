// JavaScript para o Dashboard
// Carrega estatísticas e informações gerais

document.addEventListener('DOMContentLoaded', () => {
    verificarAutenticacao();
    carregarEstatisticas();
});

// Carregar estatísticas
async function carregarEstatisticas() {
    try {
        const response = await fetch('/api/stats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const stats = await response.json();
            exibirEstatisticas(stats);
        } else {
            // Se a API de stats não existir, buscar dados diretamente
            await carregarEstatisticasDireto();
        }
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        // Tentar carregar diretamente
        await carregarEstatisticasDireto();
    }
}

// Carregar estatísticas diretamente da API de jurados
async function carregarEstatisticasDireto() {
    try {
        const response = await fetch('/api/jurados', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const jurados = await response.json();
            
            const stats = {
                totalJurados: jurados.length,
                juradosAtivos: jurados.filter(j => j.status === 'Ativo').length,
                juradosInativos: jurados.filter(j => j.status === 'Inativo').length,
                totalInstituicoes: new Set(jurados.filter(j => j.instituicao_id).map(j => j.instituicao_id)).size
            };
            
            exibirEstatisticas(stats);
        }
    } catch (error) {
        console.error('Erro ao carregar estatísticas diretamente:', error);
    }
}

// Exibir estatísticas
function exibirEstatisticas(stats) {
    const totalJuradosEl = document.getElementById('totalJurados');
    const juradosAtivosEl = document.getElementById('juradosAtivos');
    const juradosInativosEl = document.getElementById('juradosInativos');
    const totalInstituicoesEl = document.getElementById('totalInstituicoes');
    const totalJuradosFooterEl = document.getElementById('total-jurados');
    const totalInstituicoesFooterEl = document.getElementById('total-instituicoes');
    
    if (totalJuradosEl) totalJuradosEl.textContent = stats.totalJurados || 0;
    if (juradosAtivosEl) juradosAtivosEl.textContent = stats.juradosAtivos || 0;
    if (juradosInativosEl) juradosInativosEl.textContent = stats.juradosInativos || 0;
    if (totalInstituicoesEl) totalInstituicoesEl.textContent = stats.totalInstituicoes || 0;
    if (totalJuradosFooterEl) totalJuradosFooterEl.textContent = stats.totalJurados || 0;
    if (totalInstituicoesFooterEl) totalInstituicoesFooterEl.textContent = stats.totalInstituicoes || 0;
}

// Verificar autenticação
function verificarAutenticacao() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/index.html';
        return;
    }
    
    // Exibir nome do usuário
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
}

