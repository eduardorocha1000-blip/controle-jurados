// JavaScript para gerenciar juízes
// Substitui a lógica das views EJS

const JUIZES_API_URL = '/api/juizes';

// Verificar autenticação ao carregar
document.addEventListener('DOMContentLoaded', () => {
    verificarAutenticacao();
    carregarJuizes();
    carregarEstatisticas();
    
    // Listener para formulário de filtros
    document.getElementById('filtrosForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        carregarJuizes();
    });
});

// Carregar juízes
async function carregarJuizes() {
    try {
        mostrarLoading(true);
        
        const url = new URL(JUIZES_API_URL, window.location.origin);
        const params = new URLSearchParams();
        
        const busca = document.getElementById('busca')?.value;
        const titular = document.getElementById('titular')?.value;
        const status = document.getElementById('status')?.value;
        
        if (busca) params.append('busca', busca);
        if (titular) params.append('titular', titular);
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

            let errorMessage = 'Erro ao carregar juízes';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorData.details || errorMessage;
            } catch (e) {
                errorMessage = `Erro ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }
        
        const juizes = await response.json();
        exibirJuizes(juizes);
    } catch (error) {
        console.error('Erro:', error);
        console.error('Detalhes:', error.message);
        mostrarErro(error.message || 'Erro ao carregar juízes. Tente novamente.');
    } finally {
        mostrarLoading(false);
    }
}

// Exibir juízes na tabela
function exibirJuizes(juizes) {
    const tbody = document.getElementById('juizesTbody');
    const tableDiv = document.getElementById('juizesTable');
    const emptyDiv = document.getElementById('emptyMessage');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (juizes.length === 0) {
        tableDiv?.classList.add('d-none');
        emptyDiv?.classList.remove('d-none');
        return;
    }
    
    tableDiv?.classList.remove('d-none');
    emptyDiv?.classList.add('d-none');
    
    juizes.forEach(juiz => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td>${escapeHtml(juiz.nome || juiz.nome_completo || '-')}</td>
            <td>${escapeHtml(juiz.cargo || juiz.vara || '-')}</td>
            <td class="text-center">
                <span class="badge ${juiz.titular === 'Sim' ? 'bg-success' : 'bg-secondary'}">
                    ${juiz.titular || 'Não'}
                </span>
            </td>
            <td>${juiz.telefone || '-'}</td>
            <td>${juiz.email || '-'}</td>
            <td class="text-center">
                <span class="badge ${juiz.status === 'Ativo' ? 'bg-success' : 'bg-danger'}">
                    ${juiz.status}
                </span>
            </td>
            <td>
                <div class="btn-group btn-group-sm" role="group">
                    <a href="/juizes/${juiz.id}.html" class="btn btn-sm btn-outline-primary" title="Visualizar">👁️</a>
                    <a href="/juizes/${juiz.id}/editar.html" class="btn btn-sm btn-outline-secondary" title="Editar">✏️</a>
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="excluirJuiz(${juiz.id})" title="Excluir">🗑️</button>
                </div>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

// Carregar estatísticas
async function carregarEstatisticas() {
    try {
        const response = await fetch(JUIZES_API_URL, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const juizes = await response.json();
            
            const stats = {
                totalJuizes: juizes.length,
                juizesTitulares: juizes.filter(j => j.titular === 'Sim').length,
                juizesAtivos: juizes.filter(j => j.status === 'Ativo').length,
                juizesInativos: juizes.filter(j => j.status === 'Inativo').length
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
                            <div class="text-primary fs-5">⚖️</div>
                        </div>
                        <div class="flex-grow-1 ms-3">
                            <h5 class="card-title mb-0">Total</h5>
                            <h3 class="mb-0">${stats.totalJuizes || 0}</h3>
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
                            <h3 class="mb-0">${stats.juizesAtivos || 0}</h3>
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
                            <h3 class="mb-0">${stats.juizesInativos || 0}</h3>
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
                            <div class="text-info fs-5">👑</div>
                        </div>
                        <div class="flex-grow-1 ms-3">
                            <h5 class="card-title mb-0">Titulares</h5>
                            <h3 class="mb-0">${stats.juizesTitulares || 0}</h3>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Atualizar rodapé
    const totalJuizesEl = document.getElementById('total-juizes');
    const totalTitularesEl = document.getElementById('total-titulares');
    if (totalJuizesEl) totalJuizesEl.textContent = stats.totalJuizes || 0;
    if (totalTitularesEl) totalTitularesEl.textContent = stats.juizesTitulares || 0;
}

// Excluir juiz
async function excluirJuiz(id) {
    if (!confirm('Tem certeza que deseja excluir este juiz?')) {
        return;
    }
    
    try {
        const response = await fetch(`${JUIZES_API_URL}/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao excluir juiz');
        }
        
        carregarJuizes();
        carregarEstatisticas();
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao excluir juiz. Tente novamente.');
    }
}

// Limpar filtros
function limparFiltros() {
    const buscaEl = document.getElementById('busca');
    const titularEl = document.getElementById('titular');
    const statusEl = document.getElementById('status');
    
    if (buscaEl) buscaEl.value = '';
    if (titularEl) titularEl.value = '';
    if (statusEl) statusEl.value = '';
    carregarJuizes();
}

// Mostrar/ocultar loading
function mostrarLoading(mostrar) {
    const loading = document.getElementById('loadingMessage');
    const table = document.getElementById('juizesTable');
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

