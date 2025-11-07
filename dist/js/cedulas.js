// JavaScript para gerenciar cédulas
// Substitui a lógica das views EJS

const CEDULAS_API_URL = '/api/cedulas';

// Verificar autenticação ao carregar
document.addEventListener('DOMContentLoaded', () => {
    verificarAutenticacao();
    carregarSorteios();
    carregarCedulas();
    carregarEstatisticas();
    
    // Listener para formulário de filtros
    document.getElementById('filtrosForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        carregarCedulas();
    });
});

// Carregar cédulas
async function carregarCedulas() {
    try {
        mostrarLoading(true);
        
        const url = new URL(CEDULAS_API_URL, window.location.origin);
        const params = new URLSearchParams();
        
        const sorteio_id = document.getElementById('sorteio_id')?.value;
        const status = document.getElementById('status')?.value;
        
        if (sorteio_id) params.append('sorteio_id', sorteio_id);
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

            let errorMessage = 'Erro ao carregar cédulas';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorData.details || errorMessage;
            } catch (e) {
                errorMessage = `Erro ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }
        
        const cedulas = await response.json();
        exibirCedulas(cedulas);
    } catch (error) {
        console.error('Erro:', error);
        console.error('Detalhes:', error.message);
        mostrarErro(error.message || 'Erro ao carregar cédulas. Tente novamente.');
    } finally {
        mostrarLoading(false);
    }
}

// Exibir cédulas na tabela
function exibirCedulas(cedulas) {
    const tbody = document.getElementById('cedulasTbody');
    const tableDiv = document.getElementById('cedulasTable');
    const emptyDiv = document.getElementById('emptyMessage');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (cedulas.length === 0) {
        tableDiv?.classList.add('d-none');
        emptyDiv?.classList.remove('d-none');
        return;
    }
    
    tableDiv?.classList.remove('d-none');
    emptyDiv?.classList.add('d-none');
    
    cedulas.forEach(cedula => {
        const tr = document.createElement('tr');
        
        // Formatar data
        let dataJuri = '-';
        if (cedula.data_juri) {
            const data = new Date(cedula.data_juri);
            dataJuri = data.toLocaleDateString('pt-BR');
            if (cedula.hora_juri) {
                dataJuri += ' ' + cedula.hora_juri;
            }
        }
        
        // Status badge
        const statusClass = {
            'Gerada': 'bg-secondary',
            'Impressa': 'bg-info',
            'Utilizada': 'bg-success'
        }[cedula.status] || 'bg-secondary';
        
        tr.innerHTML = `
            <td>${cedula.numero_cedula || cedula.numero_sequencial || '-'}</td>
            <td>${cedula.ano_referencia || '-'}</td>
            <td>${cedula.numero_processo || '-'}</td>
            <td>${dataJuri}</td>
            <td>${escapeHtml(cedula.juiz_nome || '-')}</td>
            <td class="text-center">
                <span class="badge ${statusClass}">
                    ${cedula.status || 'Gerada'}
                </span>
            </td>
            <td>
                <div class="btn-group btn-group-sm" role="group">
                    <a href="/cedulas/${cedula.id}.html" class="btn btn-sm btn-outline-primary" title="Visualizar">👁️</a>
                    <a href="/cedulas/${cedula.id}/editar.html" class="btn btn-sm btn-outline-secondary" title="Editar">✏️</a>
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="excluirCedula(${cedula.id})" title="Excluir">🗑️</button>
                </div>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

// Carregar estatísticas
async function carregarEstatisticas() {
    try {
        const response = await fetch(CEDULAS_API_URL, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const cedulas = await response.json();
            
            const stats = {
                totalCedulas: cedulas.length,
                geradas: cedulas.filter(c => c.status === 'Gerada').length,
                impressas: cedulas.filter(c => c.status === 'Impressa').length,
                utilizadas: cedulas.filter(c => c.status === 'Utilizada').length
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
                            <div class="text-primary fs-5">🎫</div>
                        </div>
                        <div class="flex-grow-1 ms-3">
                            <h5 class="card-title mb-0">Total</h5>
                            <h3 class="mb-0">${stats.totalCedulas || 0}</h3>
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
                            <h5 class="card-title mb-0">Geradas</h5>
                            <h3 class="mb-0">${stats.geradas || 0}</h3>
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
                            <div class="text-info fs-5">🖨️</div>
                        </div>
                        <div class="flex-grow-1 ms-3">
                            <h5 class="card-title mb-0">Impressas</h5>
                            <h3 class="mb-0">${stats.impressas || 0}</h3>
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
                            <h5 class="card-title mb-0">Utilizadas</h5>
                            <h3 class="mb-0">${stats.utilizadas || 0}</h3>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Atualizar rodapé
    const totalCedulasEl = document.getElementById('total-cedulas');
    if (totalCedulasEl) totalCedulasEl.textContent = stats.totalCedulas || 0;
}

// Carregar sorteios para o filtro
async function carregarSorteios() {
    try {
        const response = await fetch('/api/sorteios', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const sorteios = await response.json();
            const select = document.getElementById('sorteio_id');
            if (select) {
                sorteios.forEach(sorteio => {
                    const option = document.createElement('option');
                    option.value = sorteio.id;
                    option.textContent = `${sorteio.ano_referencia || ''} - ${sorteio.numero_processo || ''}`.trim();
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Erro ao carregar sorteios:', error);
    }
}

// Excluir cédula
async function excluirCedula(id) {
    if (!confirm('Tem certeza que deseja excluir esta cédula?')) {
        return;
    }
    
    try {
        const response = await fetch(`${CEDULAS_API_URL}/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao excluir cédula');
        }
        
        carregarCedulas();
        carregarEstatisticas();
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao excluir cédula. Tente novamente.');
    }
}

// Limpar filtros
function limparFiltros() {
    const sorteioEl = document.getElementById('sorteio_id');
    const statusEl = document.getElementById('status');
    
    if (sorteioEl) sorteioEl.value = '';
    if (statusEl) statusEl.value = '';
    carregarCedulas();
}

// Mostrar/ocultar loading
function mostrarLoading(mostrar) {
    const loading = document.getElementById('loadingMessage');
    const table = document.getElementById('cedulasTable');
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

