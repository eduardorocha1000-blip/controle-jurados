// JavaScript para gerenciar indicações
// Substitui a lógica das views EJS

const INDICACOES_API_URL = '/api/indicacoes';

// Verificar autenticação ao carregar
document.addEventListener('DOMContentLoaded', () => {
    verificarAutenticacao();
    carregarInstituicoes();
    carregarIndicacoes();
    carregarEstatisticas();
    
    // Listener para formulário de filtros
    document.getElementById('filtrosForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        carregarIndicacoes();
    });
});

// Carregar indicações
async function carregarIndicacoes() {
    try {
        mostrarLoading(true);
        
        const url = new URL(INDICACOES_API_URL, window.location.origin);
        const params = new URLSearchParams();
        
        const ano_referencia = document.getElementById('ano_referencia')?.value;
        const instituicao_id = document.getElementById('instituicao_id')?.value;
        const status = document.getElementById('status')?.value;
        
        if (ano_referencia) params.append('ano_referencia', ano_referencia);
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
            
            // Tentar obter mensagem de erro detalhada
            let errorMessage = 'Erro ao carregar indicações';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorData.details || errorMessage;
            } catch (e) {
                errorMessage = `Erro ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }
        
        const indicacoes = await response.json();
        exibirIndicacoes(indicacoes);
    } catch (error) {
        console.error('Erro:', error);
        console.error('Detalhes:', error.message);
        mostrarErro(error.message || 'Erro ao carregar indicações. Tente novamente.');
    } finally {
        mostrarLoading(false);
    }
}

// Exibir indicações na tabela
function exibirIndicacoes(indicacoes) {
    const tbody = document.getElementById('indicacoesTbody');
    const tableDiv = document.getElementById('indicacoesTable');
    const emptyDiv = document.getElementById('emptyMessage');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (indicacoes.length === 0) {
        tableDiv?.classList.add('d-none');
        emptyDiv?.classList.remove('d-none');
        return;
    }
    
    tableDiv?.classList.remove('d-none');
    emptyDiv?.classList.add('d-none');
    
    indicacoes.forEach(indicacao => {
        const tr = document.createElement('tr');
        
        // Formatar data
        let prazoEnvio = '-';
        if (indicacao.prazo_envio) {
            const data = new Date(indicacao.prazo_envio);
            prazoEnvio = data.toLocaleDateString('pt-BR');
        }
        
        // Status badge
        const statusClass = {
            'pendente': 'bg-warning',
            'enviada': 'bg-info',
            'recebida': 'bg-primary',
            'concluida': 'bg-success'
        }[indicacao.status] || 'bg-secondary';
        
        tr.innerHTML = `
            <td>${indicacao.ano_referencia || '-'}</td>
            <td>${escapeHtml(indicacao.instituicao_nome || '-')}</td>
            <td>${indicacao.quantidade || '-'}</td>
            <td>${prazoEnvio}</td>
            <td class="text-center">
                <span class="badge ${statusClass}">
                    ${indicacao.status || 'pendente'}
                </span>
            </td>
            <td>
                <div class="btn-group btn-group-sm" role="group">
                    <a href="/indicacoes/${indicacao.id}.html" class="btn btn-sm btn-outline-primary" title="Visualizar">👁️</a>
                    <a href="/indicacoes/${indicacao.id}/editar.html" class="btn btn-sm btn-outline-secondary" title="Editar">✏️</a>
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="excluirIndicacao(${indicacao.id})" title="Excluir">🗑️</button>
                </div>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

// Carregar estatísticas
async function carregarEstatisticas() {
    try {
        const response = await fetch(INDICACOES_API_URL, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const indicacoes = await response.json();
            
            const stats = {
                totalIndicacoes: indicacoes.length,
                pendentes: indicacoes.filter(i => i.status === 'pendente').length,
                enviadas: indicacoes.filter(i => i.status === 'enviada').length,
                concluidas: indicacoes.filter(i => i.status === 'concluida').length
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
                            <div class="text-primary fs-5">📋</div>
                        </div>
                        <div class="flex-grow-1 ms-3">
                            <h5 class="card-title mb-0">Total</h5>
                            <h3 class="mb-0">${stats.totalIndicacoes || 0}</h3>
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
                            <h5 class="card-title mb-0">Pendentes</h5>
                            <h3 class="mb-0">${stats.pendentes || 0}</h3>
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
                            <div class="text-info fs-5">📤</div>
                        </div>
                        <div class="flex-grow-1 ms-3">
                            <h5 class="card-title mb-0">Enviadas</h5>
                            <h3 class="mb-0">${stats.enviadas || 0}</h3>
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
                            <h5 class="card-title mb-0">Concluídas</h5>
                            <h3 class="mb-0">${stats.concluidas || 0}</h3>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Atualizar rodapé
    const totalIndicacoesEl = document.getElementById('total-indicacoes');
    if (totalIndicacoesEl) totalIndicacoesEl.textContent = stats.totalIndicacoes || 0;
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

// Excluir indicação
async function excluirIndicacao(id) {
    if (!confirm('Tem certeza que deseja excluir esta indicação?')) {
        return;
    }
    
    try {
        const response = await fetch(`${INDICACOES_API_URL}/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao excluir indicação');
        }
        
        carregarIndicacoes();
        carregarEstatisticas();
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao excluir indicação. Tente novamente.');
    }
}

// Limpar filtros
function limparFiltros() {
    const anoEl = document.getElementById('ano_referencia');
    const instituicaoEl = document.getElementById('instituicao_id');
    const statusEl = document.getElementById('status');
    
    if (anoEl) anoEl.value = '';
    if (instituicaoEl) instituicaoEl.value = '';
    if (statusEl) statusEl.value = '';
    carregarIndicacoes();
}

// Mostrar/ocultar loading
function mostrarLoading(mostrar) {
    const loading = document.getElementById('loadingMessage');
    const table = document.getElementById('indicacoesTable');
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

