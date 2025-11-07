// API de Cédulas para Cloudflare Pages
// Substitui routes/cedulas.js

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
        // GET - Listar cédulas
        if (method === 'GET') {
            return await listarCedulas(request, env, corsHeaders);
        }
        
        // POST - Criar cédula
        if (method === 'POST') {
            return await criarCedula(request, env, corsHeaders);
        }
        
        // PUT - Atualizar cédula
        if (method === 'PUT') {
            const id = url.pathname.split('/').pop();
            return await atualizarCedula(id, request, env, corsHeaders);
        }
        
        // DELETE - Excluir cédula
        if (method === 'DELETE') {
            const id = url.pathname.split('/').pop();
            return await excluirCedula(id, env, corsHeaders);
        }
        
        return new Response('Method not allowed', { 
            status: 405,
            headers: corsHeaders 
        });
    } catch (error) {
        console.error('Erro na API de cédulas:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

// Listar cédulas com filtros
async function listarCedulas(request, env, corsHeaders) {
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

        const colunasCedulas = await getTableColumns(env, 'cedulas');
        const colunasSorteios = await getTableColumns(env, 'sorteios');
        const colunasJuizes = await getTableColumns(env, 'juizes');

        const numeroCedulaCol = colunasCedulas.has('numero_cedula') ? 'numero_cedula' : null;
        const numeroSequencialCol = colunasCedulas.has('numero_sequencial') ? 'numero_sequencial' : null;
        const statusCol = colunasCedulas.has('status') ? 'status' : null;
        const createdCol = colunasCedulas.has('created_at') ? 'created_at' : null;
        const updatedCol = colunasCedulas.has('updated_at') ? 'updated_at' : null;

        const sorteioIdCol = colunasCedulas.has('sorteio_id') ? 'sorteio_id' : null;

        const sorteioNumeroCol = colunasSorteios.has('numero_processo') ? 'numero_processo' : null;
        const sorteioAnoCol = colunasSorteios.has('ano_referencia')
            ? 'ano_referencia'
            : (colunasSorteios.has('ano') ? 'ano' : null);
        const sorteioDataCol = colunasSorteios.has('data_juri')
            ? 'data_juri'
            : (colunasSorteios.has('data_sessao') ? 'data_sessao' : null);
        const sorteioHoraCol = colunasSorteios.has('hora_juri') ? 'hora_juri' : null;
        const sorteioLocalCol = colunasSorteios.has('local_sorteio')
            ? 'local_sorteio'
            : (colunasSorteios.has('local') ? 'local' : null);
        const sorteioJuizIdCol = colunasSorteios.has('juiz_responsavel_id') ? 'juiz_responsavel_id' : null;

        const juizNomeCol = colunasJuizes.has('nome_completo')
            ? 'nome_completo'
            : (colunasJuizes.has('nome') ? 'nome' : null);

        const url = new URL(request.url);
        const sorteio_id = url.searchParams.get('sorteio_id');
        const status = url.searchParams.get('status');
        
        const camposSelect = [
            'c.id',
            sorteioIdCol ? `c.${sorteioIdCol} AS sorteio_id` : 'NULL AS sorteio_id',
            numeroCedulaCol ? `c.${numeroCedulaCol}` : 'NULL AS numero_cedula',
            numeroSequencialCol ? `c.${numeroSequencialCol}` : 'NULL AS numero_sequencial',
            statusCol ? `COALESCE(c.${statusCol}, 'Gerada') AS status` : `'Gerada' AS status`,
            createdCol ? `c.${createdCol} AS created_at` : 'NULL AS created_at',
            updatedCol ? `c.${updatedCol} AS updated_at` : 'NULL AS updated_at',
            sorteioNumeroCol ? `s.${sorteioNumeroCol} AS numero_processo` : 'NULL AS numero_processo',
            sorteioDataCol ? `s.${sorteioDataCol} AS data_juri` : 'NULL AS data_juri',
            sorteioHoraCol ? `s.${sorteioHoraCol} AS hora_juri` : 'NULL AS hora_juri',
            sorteioLocalCol ? `s.${sorteioLocalCol} AS local_sorteio` : 'NULL AS local_sorteio',
            sorteioAnoCol ? `s.${sorteioAnoCol} AS ano_referencia` : 'NULL AS ano_referencia',
            juizNomeCol ? `j.${juizNomeCol} AS juiz_nome` : 'NULL AS juiz_nome'
        ];

        const joinSorteios = sorteioIdCol ? 'LEFT JOIN sorteios s ON c.sorteio_id = s.id' : '';
        const joinJuizes = (sorteioJuizIdCol && juizNomeCol) ? 'LEFT JOIN juizes j ON s.juiz_responsavel_id = j.id' : '';

        let query = `
            SELECT 
                ${camposSelect.join(',\n                ')}
            FROM cedulas c
            ${joinSorteios}
            ${joinJuizes}
            WHERE 1=1
        `;
        const params = [];
        
        if (sorteio_id) {
            if (sorteioIdCol) {
                query += ` AND c.${sorteioIdCol} = ?`;
                params.push(sorteio_id);
            }
        }
        
        if (status) {
            if (statusCol) {
                query += ` AND COALESCE(c.${statusCol}, 'Gerada') = ?`;
                params.push(status);
            }
        }
        
        const colunaOrdenacao = createdCol ? `c.${createdCol}` : 'c.id';
        query += ` ORDER BY ${colunaOrdenacao} DESC`;
        
        console.log('[cedulas] Executando query:', query, 'Params:', params);

        const result = await env.DB.prepare(query).bind(...params).all();
        
        return new Response(JSON.stringify(result.results || []), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Erro ao listar cédulas:', error);
        return new Response(JSON.stringify({
            error: 'Erro ao buscar cédulas no banco de dados',
            details: error.message || 'Erro desconhecido',
            type: error.name
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

// Criar nova cédula
async function criarCedula(request, env, corsHeaders) {
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
    if (!data.sorteio_id) {
        return new Response(JSON.stringify({ error: 'Sorteio é obrigatório' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    
    // Preparar dados
    const colunasCedulas = await getTableColumns(env, 'cedulas');
    const insertData = {
        sorteio_id: colunasCedulas.has('sorteio_id') ? data.sorteio_id : undefined,
        numero_cedula: colunasCedulas.has('numero_cedula') ? (data.numero_cedula || null) : undefined,
        numero_sequencial: colunasCedulas.has('numero_sequencial')
            ? (data.numero_sequencial || data.numero_cedula || null)
            : undefined,
        status: colunasCedulas.has('status') ? (data.status || 'Gerada') : undefined
    };
    
    // Inserir
    const campos = ['sorteio_id', 'numero_cedula', 'numero_sequencial', 'status'];
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
        INSERT INTO cedulas (${camposPresentes.join(', ')})
        VALUES (${placeholders.join(', ')})
    `).bind(...valores).run();
    
    // Buscar a cédula criada
    const cedula = await env.DB.prepare('SELECT * FROM cedulas WHERE id = ?').bind(result.meta.last_row_id).first();
    
    return new Response(JSON.stringify(cedula), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

// Atualizar cédula
async function atualizarCedula(id, request, env, corsHeaders) {
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
    const existente = await env.DB.prepare('SELECT id FROM cedulas WHERE id = ?').bind(id).first();
    if (!existente) {
        return new Response(JSON.stringify({ error: 'Cédula não encontrada' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    
    // Preparar dados de atualização
    const updates = [];
    const values = [];
    
    if (data.sorteio_id !== undefined && colunasCedulas.has('sorteio_id')) {
        updates.push('sorteio_id = ?');
        values.push(data.sorteio_id);
    }
    if (data.numero_cedula !== undefined && colunasCedulas.has('numero_cedula')) {
        updates.push('numero_cedula = ?');
        values.push(data.numero_cedula);
    }
    if (data.numero_sequencial !== undefined && colunasCedulas.has('numero_sequencial')) {
        updates.push('numero_sequencial = ?');
        values.push(data.numero_sequencial);
    }
    if (data.status !== undefined && colunasCedulas.has('status')) {
        updates.push('status = ?');
        values.push(data.status);
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
        UPDATE cedulas SET ${updates.join(', ')} WHERE id = ?
    `).bind(...values).run();
    
    // Buscar atualizada
    const cedula = await env.DB.prepare('SELECT * FROM cedulas WHERE id = ?').bind(id).first();
    
    return new Response(JSON.stringify(cedula), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

// Excluir cédula
async function excluirCedula(id, env, corsHeaders) {
    if (!env.DB) {
        return new Response(JSON.stringify({
            error: 'Banco de dados não configurado',
            details: 'Configure o binding DB no projeto do Cloudflare Pages.'
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    const result = await env.DB.prepare('DELETE FROM cedulas WHERE id = ?').bind(id).run();
    
    if (result.meta.changes === 0) {
        return new Response(JSON.stringify({ error: 'Cédula não encontrada' }), {
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

