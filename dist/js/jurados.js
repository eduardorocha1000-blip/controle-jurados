// JavaScript para gerenciar jurados
// Substitui a lógica das views EJS

const API_URL = '/api/jurados';

// Verificar autenticação ao carregar
document.addEventListener('DOMContentLoaded', () => {
    verificarAutenticacao();
    carregarInstituicoes();
    carregarJurados();
    carregarEstatisticas();
    
    // Listener para formulário de filtros
    document.getElementById('filtrosForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        carregarJurados();
    });
});

// Carregar jurados
async function carregarJurados() {
    try {
        mostrarLoading(true);
        
        const url = new URL(API_URL, window.location.origin);
        const params = new URLSearchParams();
        
        const busca = document.getElementById('busca')?.value;
        const instituicao_id = document.getElementById('instituicao_id')?.value;
        const status = document.getElementById('status')?.value;
        
        if (busca) params.append('busca', busca);
        if (instituicao_id) params.append('instituicao_id', instituicao_id);
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
            throw new Error('Erro ao carregar jurados');
        }
        
        const jurados = await response.json();
        exibirJurados(jurados);
    } catch (error) {
        console.error('Erro:', error);
        mostrarErro('Erro ao carregar jurados. Tente novamente.');
    } finally {
        mostrarLoading(false);
    }
}

// Exibir jurados na tabela
function exibirJurados(jurados) {
    const tbody = document.getElementById('juradosTbody');
    const tableDiv = document.getElementById('juradosTable');
    const emptyDiv = document.getElementById('emptyMessage');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (jurados.length === 0) {
        tableDiv?.classList.add('d-none');
        emptyDiv?.classList.remove('d-none');
        return;
    }
    
    tableDiv?.classList.remove('d-none');
    emptyDiv?.classList.add('d-none');
    
    jurados.forEach(jurado => {
        const tr = document.createElement('tr');
        
        // Calcular idade
        let idade = '-';
        if (jurado.data_nascimento) {
            const hoje = new Date();
            const nascimento = new Date(jurado.data_nascimento);
            idade = hoje.getFullYear() - nascimento.getFullYear();
            idade += ' anos';
        }
        
        tr.innerHTML = `
            <td>${escapeHtml(jurado.nome_completo)}</td>
            <td>${escapeHtml(jurado.cpf)}</td>
            <td>${idade}</td>
            <td>${jurado.telefone || '-'}</td>
            <td>${jurado.email || '-'}</td>
            <td class="text-center">
                <span class="badge ${jurado.status === 'Ativo' ? 'bg-success' : 'bg-danger'}">
                    ${jurado.status}
                </span>
            </td>
            <td>${jurado.instituicao_nome || '-'}</td>
            <td>
                <div class="btn-group btn-group-sm" role="group">
                    <a href="/jurados/${jurado.id}.html" class="btn btn-sm btn-outline-primary" title="Visualizar">👁️</a>
                    <a href="/jurados/${jurado.id}/editar.html" class="btn btn-sm btn-outline-secondary" title="Editar">✏️</a>
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="excluirJurado(${jurado.id})" title="Excluir">🗑️</button>
                </div>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

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
                            <div class="text-primary fs-5">👥</div>
                        </div>
                        <div class="flex-grow-1 ms-3">
                            <h5 class="card-title mb-0">Total</h5>
                            <h3 class="mb-0">${stats.totalJurados || 0}</h3>
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
                            <div class="text-success fs-5">🟢</div>
                        </div>
                        <div class="flex-grow-1 ms-3">
                            <h5 class="card-title mb-0">Ativos</h5>
                            <h3 class="mb-0">${stats.juradosAtivos || 0}</h3>
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
                            <h5 class="card-title mb-0">Inativos</h5>
                            <h3 class="mb-0">${stats.juradosInativos || 0}</h3>
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
                            <div class="text-info fs-5">📅</div>
                        </div>
                        <div class="flex-grow-1 ms-3">
                            <h5 class="card-title mb-0">Este Ano</h5>
                            <h3 class="mb-0">${stats.juradosAno || 0}</h3>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Atualizar rodapé
    document.getElementById('total-jurados').textContent = stats.totalJurados || 0;
    document.getElementById('total-instituicoes').textContent = stats.totalInstituicoes || 0;
}

// Carregar instituições para o filtro
async function carregarInstituicoes() {
    try {
        const response = await fetch('/api/instituicoes', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const instituicoes = await response.json();
            const select = document.getElementById('instituicao_id');
            if (select) {
                instituicoes.forEach(inst => {
                    const option = document.createElement('option');
                    option.value = inst.id;
                    option.textContent = inst.nome;
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Erro ao carregar instituições:', error);
    }
}

// Excluir jurado
async function excluirJurado(id) {
    if (!confirm('Tem certeza que deseja excluir este jurado?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao excluir jurado');
        }
        
        carregarJurados();
        carregarEstatisticas();
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao excluir jurado. Tente novamente.');
    }
}

// Limpar filtros
function limparFiltros() {
    document.getElementById('busca').value = '';
    document.getElementById('instituicao_id').value = '';
    document.getElementById('status').value = '';
    carregarJurados();
}

// Mostrar/ocultar loading
function mostrarLoading(mostrar) {
    const loading = document.getElementById('loadingMessage');
    const table = document.getElementById('juradosTable');
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
}

