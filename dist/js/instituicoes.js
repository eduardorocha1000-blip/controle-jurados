// JavaScript para gerenciar instituições
// Substitui a lógica das views EJS

const INSTITUICOES_API_URL = '/api/instituicoes';

// Verificar autenticação ao carregar
document.addEventListener('DOMContentLoaded', () => {
    verificarAutenticacao();
    carregarInstituicoes();
    carregarEstatisticas();
    
    // Listener para formulário de filtros
    document.getElementById('filtrosForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        carregarInstituicoes();
    });
});

// Carregar instituições
async function carregarInstituicoes() {
    try {
        mostrarLoading(true);
        
        const url = new URL(INSTITUICOES_API_URL, window.location.origin);
        const params = new URLSearchParams();
        
        const busca = document.getElementById('busca')?.value;
        
        if (busca) params.append('busca', busca);
        
        if (params.toString()) {
            url.search = params.toString();
        }
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/index.html';
                return;
            }
            throw new Error('Erro ao carregar instituições');
        }
        
        const instituicoes = await response.json();
        exibirInstituicoes(instituicoes);
    } catch (error) {
        console.error('Erro:', error);
        mostrarErro('Erro ao carregar instituições. Tente novamente.');
    } finally {
        mostrarLoading(false);
    }
}

// Exibir instituições na tabela
function exibirInstituicoes(instituicoes) {
    const tbody = document.getElementById('instituicoesTbody');
    const tableDiv = document.getElementById('instituicoesTable');
    const emptyDiv = document.getElementById('emptyMessage');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (instituicoes.length === 0) {
        tableDiv?.classList.add('d-none');
        emptyDiv?.classList.remove('d-none');
        return;
    }
    
    tableDiv?.classList.remove('d-none');
    emptyDiv?.classList.add('d-none');
    
    instituicoes.forEach(instituicao => {
        const tr = document.createElement('tr');
        
        // Formatar endereço
        let endereco = '';
        if (instituicao.endereco) {
            endereco = instituicao.endereco;
            if (instituicao.numero) endereco += ', ' + instituicao.numero;
            if (instituicao.bairro) endereco += ' - ' + instituicao.bairro;
            if (instituicao.cidade) endereco += ', ' + instituicao.cidade;
            if (instituicao.uf) endereco += ' - ' + instituicao.uf;
        } else {
            endereco = '-';
        }
        
        tr.innerHTML = `
            <td>${escapeHtml(instituicao.nome)}</td>
            <td>${escapeHtml(instituicao.cnpj || '-')}</td>
            <td>${instituicao.telefone || '-'}</td>
            <td>${instituicao.email || '-'}</td>
            <td>${escapeHtml(endereco)}</td>
            <td>
                <div class="btn-group btn-group-sm" role="group">
                    <a href="/instituicoes/${instituicao.id}.html" class="btn btn-sm btn-outline-primary" title="Visualizar">👁️</a>
                    <a href="/instituicoes/${instituicao.id}/editar.html" class="btn btn-sm btn-outline-secondary" title="Editar">✏️</a>
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="excluirInstituicao(${instituicao.id})" title="Excluir">🗑️</button>
                </div>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

// Carregar estatísticas
async function carregarEstatisticas() {
    try {
        const response = await fetch(INSTITUICOES_API_URL, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const instituicoes = await response.json();
            
            const stats = {
                totalInstituicoes: instituicoes.length
            };
            
            exibirEstatisticas(stats);
        }
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

// Exibir estatísticas
function exibirEstatisticas(stats) {
    const statsDiv = document.getElementById('statsCards');
    if (!statsDiv) return;
    
    statsDiv.innerHTML = `
        <div class="col-md-3 mb-3">
            <div class="card h-100">
                <div class="card-body">
                    <div class="d-flex align-items-center">
                        <div class="flex-shrink-0">
                            <div class="text-primary fs-5">🏢</div>
                        </div>
                        <div class="flex-grow-1 ms-3">
                            <h5 class="card-title mb-0">Total</h5>
                            <h3 class="mb-0">${stats.totalInstituicoes || 0}</h3>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Atualizar rodapé
    const totalInstituicoesEl = document.getElementById('total-instituicoes');
    if (totalInstituicoesEl) totalInstituicoesEl.textContent = stats.totalInstituicoes || 0;
}

// Excluir instituição
async function excluirInstituicao(id) {
    if (!confirm('Tem certeza que deseja excluir esta instituição?')) {
        return;
    }
    
    try {
        const response = await fetch(`${INSTITUICOES_API_URL}/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao excluir instituição');
        }
        
        carregarInstituicoes();
        carregarEstatisticas();
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao excluir instituição. Tente novamente.');
    }
}

// Limpar filtros
function limparFiltros() {
    const buscaEl = document.getElementById('busca');
    
    if (buscaEl) buscaEl.value = '';
    carregarInstituicoes();
}

// Mostrar/ocultar loading
function mostrarLoading(mostrar) {
    const loading = document.getElementById('loadingMessage');
    const table = document.getElementById('instituicoesTable');
    const empty = document.getElementById('emptyMessage');
    
    if (mostrar) {
        loading?.classList.remove('d-none');
        table?.classList.add('d-none');
        empty?.classList.add('d-none');
    } else {
        loading?.classList.add('d-none');
    }
}

// Mostrar erro
function mostrarErro(mensagem) {
    alert(mensagem);
}

// Escapar HTML (prevenir XSS)
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

