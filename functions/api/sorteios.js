// API de Sorteios para Cloudflare Pages
// Substitui routes/sorteios.js

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const method = request.method;
    
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    // Handle OPTIONS
    if (method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }
    
    try {
        // GET - Listar sorteios
        if (method === 'GET') {
            return await listarSorteios(request, env, corsHeaders);
        }
        
        // POST - Criar sorteio
        if (method === 'POST') {
            return await criarSorteio(request, env, corsHeaders);
        }
        
        // PUT - Atualizar sorteio
        if (method === 'PUT') {
            const id = url.pathname.split('/').pop();
            return await atualizarSorteio(id, request, env, corsHeaders);
        }
        
        // DELETE - Excluir sorteio
        if (method === 'DELETE') {
            const id = url.pathname.split('/').pop();
            return await excluirSorteio(id, env, corsHeaders);
        }
        
        return new Response('Method not allowed', { 
            status: 405,
            headers: corsHeaders 
        });
    } catch (error) {
        console.error('Erro na API de sorteios:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

// Listar sorteios com filtros
async function listarSorteios(request, env, corsHeaders) {
    try {
        if (!env.DB) {
            return new Response(JSON.stringify({
                error: 'Banco de dados não configurado',
                details: 'Configure o binding DB no projeto do Cloudflare Pages.'
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const colunasSorteios = await getTableColumns(env, 'sorteios');
        const colunasJuizes = await getTableColumns(env, 'juizes');

        const anoCol = colunasSorteios.has('ano_referencia')
            ? 'ano_referencia'
            : (colunasSorteios.has('ano') ? 'ano' : null);
        const dataJuriCol = colunasSorteios.has('data_juri')
            ? 'data_juri'
            : (colunasSorteios.has('data_sessao') ? 'data_sessao' : null);
        const horaCol = colunasSorteios.has('hora_juri') ? 'hora_juri' : null;
        const juizIdCol = colunasSorteios.has('juiz_responsavel_id') ? 'juiz_responsavel_id' : null;
        const localCol = colunasSorteios.has('local_sorteio')
            ? 'local_sorteio'
            : (colunasSorteios.has('local') ? 'local' : null);
        const numeroProcCol = colunasSorteios.has('numero_processo') ? 'numero_processo' : null;
        const statusCol = colunasSorteios.has('status') ? 'status' : null;
        const obsCol = colunasSorteios.has('observacoes') ? 'observacoes' : null;
        const createdCol = colunasSorteios.has('created_at') ? 'created_at' : null;
        const updatedCol = colunasSorteios.has('updated_at') ? 'updated_at' : null;

        const juizNomeCol = colunasJuizes.has('nome_completo')
            ? 'nome_completo'
            : (colunasJuizes.has('nome') ? 'nome' : null);

        const url = new URL(request.url);
        const ano_referencia = url.searchParams.get('ano_referencia');
        const busca = url.searchParams.get('busca');
        
        const selectCampos = [
            's.id',
            anoCol ? `s.${anoCol} AS ano_referencia` : 'NULL AS ano_referencia',
            dataJuriCol ? `s.${dataJuriCol} AS data_juri` : 'NULL AS data_juri',
            horaCol ? `s.${horaCol} AS hora_juri` : 'NULL AS hora_juri',
            juizIdCol ? `s.${juizIdCol} AS juiz_responsavel_id` : 'NULL AS juiz_responsavel_id',
            localCol ? `s.${localCol} AS local_sorteio` : 'NULL AS local_sorteio',
            numeroProcCol ? `s.${numeroProcCol} AS numero_processo` : 'NULL AS numero_processo',
            statusCol ? `s.${statusCol} AS status` : 'NULL AS status',
            obsCol ? `s.${obsCol} AS observacoes` : 'NULL AS observacoes',
            createdCol ? `s.${createdCol} AS created_at` : 'NULL AS created_at',
            updatedCol ? `s.${updatedCol} AS updated_at` : 'NULL AS updated_at',
            juizNomeCol ? `j.${juizNomeCol} AS juiz_nome` : 'NULL AS juiz_nome'
        ];

        const joinClause = (juizIdCol && juizNomeCol) ? 'LEFT JOIN juizes j ON s.juiz_responsavel_id = j.id' : '';

        let query = `
            SELECT 
                ${selectCampos.join(',\n                ')}
            FROM sorteios s
            ${joinClause}
            WHERE 1=1
        `;
        const params = [];
        
        if (ano_referencia) {
            if (anoCol) {
                query += ` AND s.${anoCol} = ?`;
                params.push(ano_referencia);
            }
        }
        
        if (busca) {
            const clausulasBusca = [];
            const buscaParam = `%${busca}%`;
            if (numeroProcCol) {
                clausulasBusca.push(`s.${numeroProcCol} LIKE ?`);
                params.push(buscaParam);
            }
            if (juizNomeCol) {
                clausulasBusca.push(`j.${juizNomeCol} LIKE ?`);
                params.push(buscaParam);
            }
            if (localCol) {
                clausulasBusca.push(`s.${localCol} LIKE ?`);
                params.push(buscaParam);
            }
            if (statusCol) {
                clausulasBusca.push(`s.${statusCol} LIKE ?`);
                params.push(buscaParam);
            }

            if (clausulasBusca.length > 0) {
                query += ` AND (${clausulasBusca.join(' OR ')})`;
            }
        }
        
        const colunaOrdenacao = dataJuriCol ? `s.${dataJuriCol}` : 's.id';
        query += ` ORDER BY ${colunaOrdenacao} DESC`;
        
        console.log('[sorteios] Executando query:', query, 'Params:', params);

        const result = await env.DB.prepare(query).bind(...params).all();
        
        return new Response(JSON.stringify(result.results || []), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Erro ao listar sorteios:', error);
        return new Response(JSON.stringify({
            error: 'Erro ao buscar sorteios no banco de dados',
            details: error.message || 'Erro desconhecido',
            type: error.name
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

// Criar novo sorteio
async function criarSorteio(request, env, corsHeaders) {
    if (!env.DB) {
        return new Response(JSON.stringify({
            error: 'Banco de dados não configurado',
            details: 'Configure o binding DB no projeto do Cloudflare Pages.'
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    const parsed = await safeJson(request);
    if (!parsed.success) {
        return new Response(JSON.stringify({ error: 'JSON inválido', details: parsed.error }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    const data = parsed.value || {};
    
    // Validações básicas
    if (!data.ano_referencia || !data.data_juri) {
        return new Response(JSON.stringify({ error: 'Ano de referência e data do júri são obrigatórios' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    
    const colunasSorteios = await getTableColumns(env, 'sorteios');
    const insertData = {
        ano_referencia: colunasSorteios.has('ano_referencia') ? data.ano_referencia : undefined,
        ano: (!colunasSorteios.has('ano_referencia') && colunasSorteios.has('ano')) ? data.ano_referencia : undefined,
        data_juri: colunasSorteios.has('data_juri') ? data.data_juri : undefined,
        data_sessao: (!colunasSorteios.has('data_juri') && colunasSorteios.has('data_sessao')) ? data.data_juri : undefined,
        hora_juri: colunasSorteios.has('hora_juri') ? (data.hora_juri || null) : undefined,
        juiz_responsavel_id: colunasSorteios.has('juiz_responsavel_id') ? (data.juiz_responsavel_id || null) : undefined,
        local_sorteio: colunasSorteios.has('local_sorteio') ? (data.local_sorteio ? data.local_sorteio.toUpperCase() : null) : undefined,
        local: (!colunasSorteios.has('local_sorteio') && colunasSorteios.has('local')) ? (data.local_sorteio ? data.local_sorteio.toUpperCase() : null) : undefined,
        numero_processo: colunasSorteios.has('numero_processo') ? (data.numero_processo || null) : undefined,
        status: colunasSorteios.has('status') ? (data.status || 'Agendado') : undefined,
        observacoes: colunasSorteios.has('observacoes') ? (data.observacoes ? data.observacoes.toUpperCase() : null) : undefined
    };
    
    // Inserir
    const campos = ['ano_referencia', 'ano', 'data_juri', 'data_sessao', 'hora_juri', 'juiz_responsavel_id', 'local_sorteio', 'local', 'numero_processo', 'status', 'observacoes'];
    const camposPresentes = [];
    const placeholders = [];
    const valores = [];
    for (const campo of campos) {
        if (insertData[campo] !== undefined) {
            camposPresentes.push(campo);
            placeholders.push('?');
            valores.push(insertData[campo]);
        }
    }

    const result = await env.DB.prepare(`
        INSERT INTO sorteios (${camposPresentes.join(', ')})
        VALUES (${placeholders.join(', ')})
    `).bind(...valores).run();
    
    // Buscar o sorteio criado
    const sorteio = await env.DB.prepare('SELECT * FROM sorteios WHERE id = ?').bind(result.meta.last_row_id).first();
    
    return new Response(JSON.stringify(sorteio), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

// Atualizar sorteio
async function atualizarSorteio(id, request, env, corsHeaders) {
    if (!env.DB) {
        return new Response(JSON.stringify({
            error: 'Banco de dados não configurado',
            details: 'Configure o binding DB no projeto do Cloudflare Pages.'
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    const parsed = await safeJson(request);
    if (!parsed.success) {
        return new Response(JSON.stringify({ error: 'JSON inválido', details: parsed.error }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    const data = parsed.value || {};
    
    // Verificar se existe
    const existente = await env.DB.prepare('SELECT id FROM sorteios WHERE id = ?').bind(id).first();
    if (!existente) {
        return new Response(JSON.stringify({ error: 'Sorteio não encontrado' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    
    // Preparar dados de atualização
    const updates = [];
    const values = [];
    
    if (data.ano_referencia !== undefined) {
        if (colunasSorteios.has('ano_referencia')) {
            updates.push('ano_referencia = ?');
            values.push(data.ano_referencia);
        } else if (colunasSorteios.has('ano')) {
            updates.push('ano = ?');
            values.push(data.ano_referencia);
        }
    }
    if (data.data_juri !== undefined) {
        if (colunasSorteios.has('data_juri')) {
            updates.push('data_juri = ?');
            values.push(data.data_juri);
        } else if (colunasSorteios.has('data_sessao')) {
            updates.push('data_sessao = ?');
            values.push(data.data_juri);
        }
    }
    if (data.hora_juri !== undefined && colunasSorteios.has('hora_juri')) {
        updates.push('hora_juri = ?');
        values.push(data.hora_juri || null);
    }
    if (data.juiz_responsavel_id !== undefined && colunasSorteios.has('juiz_responsavel_id')) {
        updates.push('juiz_responsavel_id = ?');
        values.push(data.juiz_responsavel_id || null);
    }
    if (data.local_sorteio !== undefined) {
        if (colunasSorteios.has('local_sorteio')) {
            updates.push('local_sorteio = ?');
            values.push(data.local_sorteio ? data.local_sorteio.toUpperCase() : null);
        } else if (colunasSorteios.has('local')) {
            updates.push('local = ?');
            values.push(data.local_sorteio ? data.local_sorteio.toUpperCase() : null);
        }
    }
    if (data.numero_processo !== undefined && colunasSorteios.has('numero_processo')) {
        updates.push('numero_processo = ?');
        values.push(data.numero_processo || null);
    }
    if (data.status !== undefined && colunasSorteios.has('status')) {
        updates.push('status = ?');
        values.push(data.status);
    }
    if (data.observacoes !== undefined && colunasSorteios.has('observacoes')) {
        updates.push('observacoes = ?');
        values.push(data.observacoes ? data.observacoes.toUpperCase() : null);
    }
    
    if (updates.length === 0) {
        return new Response(JSON.stringify({ error: 'Nenhum campo para atualizar' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    await env.DB.prepare(`
        UPDATE sorteios SET ${updates.join(', ')} WHERE id = ?
    `).bind(...values).run();
    
    // Buscar atualizado
    const sorteio = await env.DB.prepare('SELECT * FROM sorteios WHERE id = ?').bind(id).first();
    
    return new Response(JSON.stringify(sorteio), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

// Excluir sorteio
async function excluirSorteio(id, env, corsHeaders) {
    if (!env.DB) {
        return new Response(JSON.stringify({
            error: 'Banco de dados não configurado',
            details: 'Configure o binding DB no projeto do Cloudflare Pages.'
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    const result = await env.DB.prepare('DELETE FROM sorteios WHERE id = ?').bind(id).run();
    
    if (result.meta.changes === 0) {
        return new Response(JSON.stringify({ error: 'Sorteio não encontrado' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    
    return new Response(null, {
        status: 204,
        headers: corsHeaders
    });
}

async function safeJson(request) {
    try {
        const json = await request.json();
        return { success: true, value: json };
    } catch (error) {
        console.error('Falha ao ler JSON:', error);
        return { success: false, error: error.message || 'JSON inválido' };
    }
}

async function getTableColumns(env, tableName) {
    try {
        const result = await env.DB.prepare(`SELECT name FROM pragma_table_info('${tableName}')`).all();
        const colunas = new Set();
        for (const row of result.results || []) {
            if (row.name) {
                colunas.add(row.name);
            }
        }
        return colunas;
    } catch (error) {
        console.warn(`Não foi possível obter colunas da tabela ${tableName}:`, error);
        return new Set();
    }
}

