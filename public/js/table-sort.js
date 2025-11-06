// Sistema de ordenação de tabelas - Versão independente
(function() {
    'use strict';
    
    // Função para inicializar ordenação em uma tabela
    function initTableSort(table) {
        // Marcar como inicializada para evitar múltiplos listeners
        const listenerKey = 'table-sort-listener-attached';
        if (table[listenerKey]) {
            return;
        }
        table[listenerKey] = true;
        
        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');
        
        if (!thead || !tbody) return;
        
        const headerRow = thead.querySelector('tr');
        if (!headerRow) return;
        
        const headers = Array.from(headerRow.querySelectorAll('th'));
        if (headers.length === 0) return;
        
        // Usar event delegation no thead para capturar cliques
        thead.addEventListener('click', function(e) {
            const th = e.target.closest('th');
            if (!th || !headerRow.contains(th)) return;
            
            const columnIndex = Array.from(headerRow.querySelectorAll('th')).indexOf(th);
            const isLastColumn = columnIndex === headers.length - 1;
            const headerText = th.textContent.trim().toLowerCase();
            
            // Ignorar coluna "Ações"
            if (isLastColumn || headerText === 'ações' || headerText.includes('ações') || headerText.includes('acao')) {
                return;
            }
            
            e.preventDefault();
            e.stopPropagation();
            
            sortTable(table, columnIndex, th);
        }, true); // Capture phase
        
        // Processar cada cabeçalho para adicionar estilos
        headers.forEach(function(th, columnIndex) {
            // Verificar se é a última coluna (Ações)
            const isLastColumn = columnIndex === headers.length - 1;
            const headerText = th.textContent.trim().toLowerCase();
            
            // Ignorar coluna "Ações"
            if (isLastColumn || headerText === 'ações' || headerText.includes('ações') || headerText.includes('acao')) {
                return;
            }
            
            // Adicionar classe sortable
            th.classList.add('sortable');
            
            // Adicionar cursor pointer para indicar que é clicável
            th.style.cursor = 'pointer';
            th.style.userSelect = 'none';
        });
    }
    
    // Função para ordenar tabela
    function sortTable(table, columnIndex, clickedTh) {
        const tbody = table.querySelector('tbody');
        if (!tbody) return;
        
        const rows = Array.from(tbody.querySelectorAll('tr'));
        if (rows.length === 0) return;
        
        const isCurrentlyAsc = clickedTh.classList.contains('sort-asc');
        
        // Remover classes de ordenação de todos os cabeçalhos da tabela
        const thead = table.querySelector('thead');
        if (thead) {
            thead.querySelectorAll('th').forEach(function(h) {
                h.classList.remove('sort-asc', 'sort-desc');
            });
        }
        
        // Adicionar classe ao cabeçalho clicado
        if (isCurrentlyAsc) {
            clickedTh.classList.add('sort-desc');
        } else {
            clickedTh.classList.add('sort-asc');
        }
        
        // Ordenar as linhas
        rows.sort(function(a, b) {
            const aCell = a.cells[columnIndex];
            const bCell = b.cells[columnIndex];
            
            if (!aCell || !bCell) return 0;
            
            let aText = aCell.textContent.trim();
            let bText = bCell.textContent.trim();
            
            // Tentar converter para data (formato dd/mm/yyyy)
            const datePattern = /(\d{1,2})\/(\d{1,2})\/(\d{4})/;
            const aDateMatch = aText.match(datePattern);
            const bDateMatch = bText.match(datePattern);
            
            let comparison = 0;
            
            if (aDateMatch && bDateMatch) {
                // Comparação de datas
                const aDate = new Date(
                    parseInt(aDateMatch[3]), 
                    parseInt(aDateMatch[2]) - 1, 
                    parseInt(aDateMatch[1])
                );
                const bDate = new Date(
                    parseInt(bDateMatch[3]), 
                    parseInt(bDateMatch[2]) - 1, 
                    parseInt(bDateMatch[1])
                );
                comparison = aDate.getTime() - bDate.getTime();
            } else {
                // Tentar converter para número
                const aNum = parseFloat(aText.replace(/[^\d,.-]/g, '').replace(',', '.'));
                const bNum = parseFloat(bText.replace(/[^\d,.-]/g, '').replace(',', '.'));
                
                if (!isNaN(aNum) && !isNaN(bNum) && aText !== '' && bText !== '' && aText.replace(/[^\d,.-]/g, '').length > 0) {
                    // Comparação numérica
                    comparison = aNum - bNum;
                } else {
                    // Comparação de texto
                    comparison = aText.localeCompare(bText, 'pt-BR', { 
                        numeric: true, 
                        sensitivity: 'base' 
                    });
                }
            }
            
            // Inverter se ordem descendente
            return isCurrentlyAsc ? -comparison : comparison;
        });
        
        // Limpar tbody e reordenar as linhas
        const fragment = document.createDocumentFragment();
        rows.forEach(function(row) {
            fragment.appendChild(row);
        });
        tbody.innerHTML = '';
        tbody.appendChild(fragment);
    }
    
    // Função principal de inicialização
    function initializeSorting() {
        // Encontrar todas as tabelas
        const tables = document.querySelectorAll('table');
        
        tables.forEach(function(table) {
            const thead = table.querySelector('thead');
            const tbody = table.querySelector('tbody');
            
            // Só processar se tiver thead e tbody e não tiver sido inicializada ainda
            if (thead && tbody) {
                initTableSort(table);
            }
        });
    }
    
    // Forçar inicialização imediata se já houver tabelas
    function forceInitialize() {
        const tables = document.querySelectorAll('table');
        if (tables.length > 0) {
            initializeSorting();
        }
    }
    
    // Inicializar quando o DOM estiver pronto - múltiplas formas para garantir
    function startSorting() {
        // Tentar imediatamente
        forceInitialize();
        
        // Tentar após um pequeno delay
        setTimeout(function() {
            initializeSorting();
        }, 100);
        
        // Tentar após um delay maior para conteúdo dinâmico
        setTimeout(function() {
            initializeSorting();
        }, 300);
    }
    
    // Executar imediatamente se possível
    forceInitialize();
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startSorting);
    } else {
        startSorting();
    }
    
    // Também tentar quando window está carregado
    window.addEventListener('load', function() {
        setTimeout(function() {
            initializeSorting();
            forceInitialize();
        }, 100);
    });
    
    // Re-inicializar se houver mudanças dinâmicas (ex: AJAX)
    const observer = new MutationObserver(function(mutations) {
        let shouldReinit = false;
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) {
                    if (node.tagName === 'TABLE') {
                        shouldReinit = true;
                    } else if (node.querySelector && node.querySelector('table')) {
                        shouldReinit = true;
                    }
                }
            });
        });
        if (shouldReinit) {
            setTimeout(initializeSorting, 100);
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Expor função globalmente para re-inicialização manual se necessário
    window.initTableSorting = initializeSorting;
})();

