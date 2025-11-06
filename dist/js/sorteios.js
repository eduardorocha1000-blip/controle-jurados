// JavaScript para gerenciar sorteios
// Substitui a lógica das views EJS

const SORTEIOS_API_URL = '/api/sorteios';

// Verificar autenticação ao carregar
document.addEventListener('DOMContentLoaded', () => {
    verificarAutenticacao();
    carregarSorteios();
    carregarEstatisticas();
    
    // Listener para formulário de filtros
    document.getElementById('filtrosForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        carregarSorteios();
    });
});

// Carregar sorteios
async function carregarSorteios() {
    try {
        mostrarLoading(true);
        
        const url = new URL(SORTEIOS_API_URL, window.location.origin);
        const params = new URLSearchParams();
        
        const ano_referencia = document.getElementById('ano_referencia')?.value;
        const busca = document.getElementById('busca')?.value;
        
        if (ano_referencia) params.append('ano_referencia', ano_referencia);
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
            throw new Error('Erro ao carregar sorteios');
        }
        
        const sorteios = await response.json();
        exibirSorteios(sorteios);
    } catch (error) {
        console.error('Erro:', error);
        mostrarErro('Erro ao carregar sorteios. Tente novamente.');
    } finally {
        mostrarLoading(false);
    }
}

// Exibir sorteios na tabela
function exibirSorteios(sorteios) {
    const tbody = document.getElementById('sorteiosTbody');
    const tableDiv = document.getElementById('sorteiosTable');
    const emptyDiv = document.getElementById('emptyMessage');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (sorteios.length === 0) {
        tableDiv?.classList.add('d-none');
        emptyDiv?.classList.remove('d-none');
        return;
    }
    
    tableDiv?.classList.remove('d-none');
    emptyDiv?.classList.add('d-none');
    
    sorteios.forEach(sorteio => {
        const tr = document.createElement('tr');
        
        // Formatar data
        let dataJuri = '-';
        if (sorteio.data_juri) {
            const data = new Date(sorteio.data_juri);
            dataJuri = data.toLocaleDateString('pt-BR');
        }
        
        // Status badge
        const statusClass = {
            'Agendado': 'bg-warning',
            'Realizado': 'bg-success',
            'Cancelado': 'bg-danger'
        }[sorteio.status] || 'bg-secondary';
        
        tr.innerHTML = `
            <td>${sorteio.ano_referencia || '-'}</td>
            <td>${sorteio.numero_processo || '-'}</td>
            <td>${dataJuri}</td>
            <td>${sorteio.hora_juri || '-'}</td>
            <td>${escapeHtml(sorteio.local_sorteio || '-')}</td>
            <td>${escapeHtml(sorteio.juiz_nome || '-')}</td>
            <td class="text-center">
                <span class="badge ${statusClass}">
                    ${sorteio.status || 'Agendado'}
                </span>
            </td>
            <td>
                <div class="btn-group btn-group-sm" role="group">
                    <a href="/sorteios/${sorteio.id}.html" class="btn btn-sm btn-outline-primary" title="Visualizar">👁️</a>
                    <a href="/sorteios/${sorteio.id}/editar.html" class="btn btn-sm btn-outline-secondary" title="Editar">✏️</a>
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="excluirSorteio(${sorteio.id})" title="Excluir">🗑️</button>
                </div>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

// Carregar estatísticas
async function carregarEstatisticas() {
    try {
        const response = await fetch(SORTEIOS_API_URL, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const sorteios = await response.json();
            
            const stats = {
                totalSorteios: sorteios.length,
                agendados: sorteios.filter(s => s.status === 'Agendado').length,
                realizados: sorteios.filter(s => s.status === 'Realizado').length,
                cancelados: sorteios.filter(s => s.status === 'Cancelado').length
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
                            <div class="text-primary fs-5">🎲</div>
                        </div>
                        <div class="flex-grow-1 ms-3">
                            <h5 class="card-title mb-0">Total</h5>
                            <h3 class="mb-0">${stats.totalSorteios || 0}</h3>
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
                            <div class="text-warning fs-5">⏳</div>
                        </div>
                        <div class="flex-grow-1 ms-3">
                            <h5 class="card-title mb-0">Agendados</h5>
                            <h3 class="mb-0">${stats.agendados || 0}</h3>
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
                            <h5 class="card-title mb-0">Realizados</h5>
                            <h3 class="mb-0">${stats.realizados || 0}</h3>
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
                            <div class="text-danger fs-5">❌</div>
                        </div>
                        <div class="flex-grow-1 ms-3">
                            <h5 class="card-title mb-0">Cancelados</h5>
                            <h3 class="mb-0">${stats.cancelados || 0}</h3>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Atualizar rodapé
    const totalSorteiosEl = document.getElementById('total-sorteios');
    if (totalSorteiosEl) totalSorteiosEl.textContent = stats.totalSorteios || 0;
}

// Excluir sorteio
async function excluirSorteio(id) {
    if (!confirm('Tem certeza que deseja excluir este sorteio?')) {
        return;
    }
    
    try {
        const response = await fetch(`${SORTEIOS_API_URL}/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao excluir sorteio');
        }
        
        carregarSorteios();
        carregarEstatisticas();
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao excluir sorteio. Tente novamente.');
    }
}

// Limpar filtros
function limparFiltros() {
    const anoEl = document.getElementById('ano_referencia');
    const buscaEl = document.getElementById('busca');
    
    if (anoEl) anoEl.value = '';
    if (buscaEl) buscaEl.value = '';
    carregarSorteios();
}

// Mostrar/ocultar loading
function mostrarLoading(mostrar) {
    const loading = document.getElementById('loadingMessage');
    const table = document.getElementById('sorteiosTable');
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

