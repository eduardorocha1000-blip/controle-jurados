// API de Editais para Cloudflare Pages
// Substitui routes/editais.js

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
        // GET - Listar editais
        if (method === 'GET') {
            return await listarEditais(request, env, corsHeaders);
        }
        
        // POST - Criar edital
        if (method === 'POST') {
            return await criarEdital(request, env, corsHeaders);
        }
        
        // PUT - Atualizar edital
        if (method === 'PUT') {
            const id = url.pathname.split('/').pop();
            return await atualizarEdital(id, request, env, corsHeaders);
        }
        
        // DELETE - Excluir edital
        if (method === 'DELETE') {
            const id = url.pathname.split('/').pop();
            return await excluirEdital(id, env, corsHeaders);
        }
        
        return new Response('Method not allowed', { 
            status: 405,
            headers: corsHeaders 
        });
    } catch (error) {
        console.error('Erro na API de editais:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

// Listar editais com filtros
async function listarEditais(request, env, corsHeaders) {
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

        const url = new URL(request.url);
        const anoRefer = url.searchParams.get('ano') || url.searchParams.get('ano_referencia');
        const status = url.searchParams.get('status');

        const colunasEditais = await getTableColumns(env, 'editais');
        const colunasJuizes = await getTableColumns(env, 'juizes');

        const anoCol = colunasEditais.has('ano_referencia')
            ? 'ano_referencia'
            : (colunasEditais.has('ano') ? 'ano' : null);
        const tituloCol = colunasEditais.has('titulo');
        const corpoCol = colunasEditais.has('corpo_rtf');
        const pubPrevCol = colunasEditais.has('data_publicacao_prevista');
        const pubRealCol = colunasEditais.has('data_publicacao_real')
            ? 'data_publicacao_real'
            : (colunasEditais.has('data_publicacao') ? 'data_publicacao' : null);
        const arquivoCol = colunasEditais.has('arquivo_rtf_gerado');
        const juizIdCol = colunasEditais.has('juiz_id');
        const statusCol = colunasEditais.has('status');
        const createdCol = colunasEditais.has('created_at');
        const updatedCol = colunasEditais.has('updated_at');

        const juizNomeCol = colunasJuizes.has('nome_completo')
            ? 'nome_completo'
            : (colunasJuizes.has('nome') ? 'nome' : null);

        const selectCampos = [
            'e.id',
            'e.numero',
            anoCol ? `e.${anoCol} AS ano_referencia` : 'NULL AS ano_referencia',
            tituloCol ? 'e.titulo' : 'NULL AS titulo',
            corpoCol ? 'e.corpo_rtf' : 'NULL AS corpo_rtf',
            pubPrevCol ? 'e.data_publicacao_prevista' : 'NULL AS data_publicacao_prevista',
            pubRealCol ? `e.${pubRealCol} AS data_publicacao_real` : 'NULL AS data_publicacao_real',
            arquivoCol ? 'e.arquivo_rtf_gerado' : 'NULL AS arquivo_rtf_gerado',
            juizIdCol ? 'e.juiz_id' : 'NULL AS juiz_id',
            statusCol ? 'e.status' : 'NULL AS status',
            createdCol ? 'e.created_at' : 'NULL AS created_at',
            updatedCol ? 'e.updated_at' : 'NULL AS updated_at',
            juizNomeCol ? `j.${juizNomeCol} AS juiz_nome` : 'NULL AS juiz_nome'
        ];

        const joinClause = juizIdCol ? 'LEFT JOIN juizes j ON e.juiz_id = j.id' : '';

        let query = `
            SELECT 
                ${selectCampos.join(',\n                ')}
            FROM editais e
            ${joinClause}
            WHERE 1=1
        `;
        const params = [];

        if (anoRefer) {
            if (anoCol) {
                query += ` AND e.${anoCol} = ?`;
                params.push(anoRefer);
            }
        }

        if (status) {
            if (statusCol) {
                query += ' AND e.status = ?';
                params.push(status);
            }
        }

        const colunaOrdenacaoAno = anoCol ? `e.${anoCol}` : 'e.id';
        query += ` ORDER BY ${colunaOrdenacaoAno} DESC, e.numero DESC`;

        console.log('[editais] Executando query:', query, 'Params:', params);

        const result = await env.DB.prepare(query).bind(...params).all();

        return new Response(JSON.stringify(result.results || []), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Erro ao listar editais:', error);
        return new Response(JSON.stringify({
            error: 'Erro ao buscar editais no banco de dados',
            details: error.message || 'Erro desconhecido',
            type: error.name
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

// Criar novo edital
async function criarEdital(request, env, corsHeaders) {
    if (!env.DB) {
        return new Response(JSON.stringify({
            error: 'Banco de dados não configurado',
            details: 'Configure o binding DB no projeto do Cloudflare Pages.'
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    const data = await safeJson(request);
    if (!data.success) {
        return new Response(JSON.stringify({ error: 'JSON inválido', details: data.error }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    const payload = data.value;

    if (!payload.numero || !payload.ano_referencia) {
        return new Response(JSON.stringify({ error: 'Número e ano de referência são obrigatórios' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    const insertData = {
        numero: payload.numero,
        ano_referencia: payload.ano_referencia,
        titulo: payload.titulo || payload.numero,
        corpo_rtf: payload.corpo_rtf || null,
        data_publicacao_prevista: payload.data_publicacao_prevista || null,
        data_publicacao_real: payload.data_publicacao_real || null,
        arquivo_rtf_gerado: payload.arquivo_rtf_gerado || null,
        juiz_id: payload.juiz_id || null,
        status: payload.status || 'rascunho'
    };

    const result = await env.DB.prepare(`
        INSERT INTO editais (
            numero,
            ano_referencia,
            titulo,
            corpo_rtf,
            data_publicacao_prevista,
            data_publicacao_real,
            arquivo_rtf_gerado,
            juiz_id,
            status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        insertData.numero,
        insertData.ano_referencia,
        insertData.titulo,
        insertData.corpo_rtf,
        insertData.data_publicacao_prevista,
        insertData.data_publicacao_real,
        insertData.arquivo_rtf_gerado,
        insertData.juiz_id,
        insertData.status
    ).run();

    const edital = await env.DB.prepare(`
        SELECT 
            e.*,
            j.nome_completo as juiz_nome
        FROM editais e
        LEFT JOIN juizes j ON e.juiz_id = j.id
        WHERE e.id = ?
    `).bind(result.meta.last_row_id).first();

    return new Response(JSON.stringify(edital), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

// Atualizar edital
async function atualizarEdital(id, request, env, corsHeaders) {
    if (!env.DB) {
        return new Response(JSON.stringify({
            error: 'Banco de dados não configurado',
            details: 'Configure o binding DB no projeto do Cloudflare Pages.'
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    const existente = await env.DB.prepare('SELECT id FROM editais WHERE id = ?').bind(id).first();
    if (!existente) {
        return new Response(JSON.stringify({ error: 'Edital não encontrado' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    const data = await safeJson(request);
    if (!data.success) {
        return new Response(JSON.stringify({ error: 'JSON inválido', details: data.error }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    const payload = data.value;
    const updates = [];
    const values = [];

    if (payload.numero !== undefined) {
        updates.push('numero = ?');
        values.push(payload.numero);
    }
    if (payload.ano_referencia !== undefined || payload.ano !== undefined) {
        updates.push('ano_referencia = ?');
        values.push(payload.ano_referencia ?? payload.ano);
    }
    if (payload.titulo !== undefined) {
        updates.push('titulo = ?');
        values.push(payload.titulo);
    }
    if (payload.corpo_rtf !== undefined) {
        updates.push('corpo_rtf = ?');
        values.push(payload.corpo_rtf);
    }
    if (payload.data_publicacao_prevista !== undefined || payload.data_publicacao !== undefined) {
        updates.push('data_publicacao_prevista = ?');
        values.push(payload.data_publicacao_prevista ?? payload.data_publicacao ?? null);
    }
    if (payload.data_publicacao_real !== undefined) {
        updates.push('data_publicacao_real = ?');
        values.push(payload.data_publicacao_real ?? null);
    }
    if (payload.arquivo_rtf_gerado !== undefined) {
        updates.push('arquivo_rtf_gerado = ?');
        values.push(payload.arquivo_rtf_gerado);
    }
    if (payload.juiz_id !== undefined) {
        updates.push('juiz_id = ?');
        values.push(payload.juiz_id ?? null);
    }
    if (payload.status !== undefined) {
        updates.push('status = ?');
        values.push(payload.status);
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
        UPDATE editais SET ${updates.join(', ')} WHERE id = ?
    `).bind(...values).run();

    const edital = await env.DB.prepare(`
        SELECT 
            e.*,
            j.nome_completo as juiz_nome
        FROM editais e
        LEFT JOIN juizes j ON e.juiz_id = j.id
        WHERE e.id = ?
    `).bind(id).first();

    return new Response(JSON.stringify(edital), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

// Excluir edital
async function excluirEdital(id, env, corsHeaders) {
    const result = await env.DB.prepare('DELETE FROM editais WHERE id = ?').bind(id).run();
    
    if (result.meta.changes === 0) {
        return new Response(JSON.stringify({ error: 'Edital não encontrado' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    
    return new Response(null, {
        status: 204,
        headers: corsHeaders
    });
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

async function safeJson(request) {
    try {
        const json = await request.json();
        return { success: true, value: json };
    } catch (error) {
        console.error('Falha ao ler JSON:', error);
        return { success: false, error: error.message || 'JSON inválido' };
    }
}

