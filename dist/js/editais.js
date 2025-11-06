// JavaScript para gerenciar editais
// Substitui a lógica das views EJS

const EDITAIS_API_URL = '/api/editais';

// Verificar autenticação ao carregar
document.addEventListener('DOMContentLoaded', () => {
    verificarAutenticacao();
    carregarEditais();
    carregarEstatisticas();
    
    // Listener para formulário de filtros
    document.getElementById('filtrosForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        carregarEditais();
    });
});

// Carregar editais
async function carregarEditais() {
    try {
        mostrarLoading(true);
        
        const url = new URL(EDITAIS_API_URL, window.location.origin);
        const params = new URLSearchParams();
        
        const ano = document.getElementById('ano')?.value;
        const status = document.getElementById('status')?.value;
        
        if (ano) params.append('ano_referencia', ano);
        if (status) params.append('status', status);
        
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
            
            let errorMessage = 'Erro ao carregar editais';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorData.details || errorMessage;
            } catch (e) {
                errorMessage = `Erro ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }
        
        const editais = await response.json();
        exibirEditais(editais);
    } catch (error) {
        console.error('Erro:', error);
        console.error('Detalhes:', error.message);
        mostrarErro(error.message || 'Erro ao carregar editais. Tente novamente.');
    } finally {
        mostrarLoading(false);
    }
}

// Exibir editais na tabela
function exibirEditais(editais) {
    const tbody = document.getElementById('editaisTbody');
    const tableDiv = document.getElementById('editaisTable');
    const emptyDiv = document.getElementById('emptyMessage');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (editais.length === 0) {
        tableDiv?.classList.add('d-none');
        emptyDiv?.classList.remove('d-none');
        return;
    }
    
    tableDiv?.classList.remove('d-none');
    emptyDiv?.classList.add('d-none');
    
    editais.forEach(edital => {
        const tr = document.createElement('tr');
        
        // Formatar data
        let dataPublicacao = '-';
        if (edital.data_publicacao_real || edital.data_publicacao_prevista) {
            const data = new Date(edital.data_publicacao_real || edital.data_publicacao_prevista);
            dataPublicacao = data.toLocaleDateString('pt-BR');
        }
        
        // Status badge
        const statusClass = {
            'rascunho': 'bg-secondary',
            'publicado': 'bg-success',
            'encerrado': 'bg-danger'
        }[edital.status] || 'bg-secondary';
        
        tr.innerHTML = `
            <td>${edital.numero || '-'}</td>
            <td>${edital.ano_referencia || '-'}</td>
            <td>${dataPublicacao}</td>
            <td>${escapeHtml(edital.juiz_nome || '-')}</td>
            <td class="text-center">
                <span class="badge ${statusClass}">
                    ${edital.status || 'rascunho'}
                </span>
            </td>
            <td>
                <div class="btn-group btn-group-sm" role="group">
                    <a href="/editais/${edital.id}.html" class="btn btn-sm btn-outline-primary" title="Visualizar">👁️</a>
                    <a href="/editais/${edital.id}/editar.html" class="btn btn-sm btn-outline-secondary" title="Editar">✏️</a>
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="excluirEdital(${edital.id})" title="Excluir">🗑️</button>
                </div>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

// Carregar estatísticas
async function carregarEstatisticas() {
    try {
        const response = await fetch(EDITAIS_API_URL, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const editais = await response.json();
            
            const stats = {
                totalEditais: editais.length,
                rascunhos: editais.filter(e => e.status === 'rascunho').length,
                publicados: editais.filter(e => e.status === 'publicado').length,
                encerrados: editais.filter(e => e.status === 'encerrado').length
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
                            <div class="text-primary fs-5">📄</div>
                        </div>
                        <div class="flex-grow-1 ms-3">
                            <h5 class="card-title mb-0">Total</h5>
                            <h3 class="mb-0">${stats.totalEditais || 0}</h3>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-3 mb-3">
            <div class="card h-100">
                <div class="card-body">
                    <div class="d-flex align-items-center">
                        <div class="flex-shrink-0">
                            <div class="text-secondary fs-5">📝</div>
                        </div>
                        <div class="flex-grow-1 ms-3">
                            <h5 class="card-title mb-0">Rascunhos</h5>
                            <h3 class="mb-0">${stats.rascunhos || 0}</h3>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-3 mb-3">
            <div class="card h-100">
                <div class="card-body">
                    <div class="d-flex align-items-center">
                        <div class="flex-shrink-0">
                            <div class="text-success fs-5">✅</div>
                        </div>
                        <div class="flex-grow-1 ms-3">
                            <h5 class="card-title mb-0">Publicados</h5>
                            <h3 class="mb-0">${stats.publicados || 0}</h3>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-3 mb-3">
            <div class="card h-100">
                <div class="card-body">
                    <div class="d-flex align-items-center">
                        <div class="flex-shrink-0">
                            <div class="text-danger fs-5">🔴</div>
                        </div>
                        <div class="flex-grow-1 ms-3">
                            <h5 class="card-title mb-0">Encerrados</h5>
                            <h3 class="mb-0">${stats.encerrados || 0}</h3>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Atualizar rodapé
    const totalEditaisEl = document.getElementById('total-editais');
    if (totalEditaisEl) totalEditaisEl.textContent = stats.totalEditais || 0;
}

// Excluir edital
async function excluirEdital(id) {
    if (!confirm('Tem certeza que deseja excluir este edital?')) {
        return;
    }
    
    try {
        const response = await fetch(`${EDITAIS_API_URL}/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao excluir edital');
        }
        
        carregarEditais();
        carregarEstatisticas();
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao excluir edital. Tente novamente.');
    }
}

// Limpar filtros
function limparFiltros() {
    const anoEl = document.getElementById('ano');
    const statusEl = document.getElementById('status');
    
    if (anoEl) anoEl.value = '';
    if (statusEl) statusEl.value = '';
    carregarEditais();
}

// Mostrar/ocultar loading
function mostrarLoading(mostrar) {
    const loading = document.getElementById('loadingMessage');
    const table = document.getElementById('editaisTable');
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

