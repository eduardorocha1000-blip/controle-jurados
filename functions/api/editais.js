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
        // Verificar se o banco está disponível
        if (!env.DB) {
            return new Response(JSON.stringify({ 
                error: 'Banco de dados não configurado',
                details: 'Configure o binding DB no Cloudflare Pages'
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        
        const url = new URL(request.url);
        const ano_referencia = url.searchParams.get('ano') || url.searchParams.get('ano_referencia');
        const status = url.searchParams.get('status');
        
        let query = `
            SELECT 
                e.*,
                j.nome_completo as juiz_nome
            FROM editais e
            LEFT JOIN juizes j ON e.juiz_id = j.id
            WHERE 1=1
        `;
        const params = [];
        
        if (ano_referencia) {
            query += ' AND e.ano_referencia = ?';
            params.push(ano_referencia);
        }
        
        if (status) {
            query += ' AND e.status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY e.ano_referencia DESC, e.numero DESC';
        
        console.log('Executando query:', query);
        console.log('Parâmetros:', params);
        
        const result = await env.DB.prepare(query).bind(...params).all();
        
        console.log('Resultado:', result.results?.length || 0, 'editais encontrados');
        
        return new Response(JSON.stringify(result.results || []), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Erro ao listar editais:', error);
        console.error('Stack:', error.stack);
        return new Response(JSON.stringify({ 
            error: 'Erro ao buscar editais no banco de dados',
            details: error.message,
            type: error.name
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

// Criar novo edital
async function criarEdital(request, env, corsHeaders) {
    const data = await request.json();
    
    // Validações básicas
    if (!data.numero || !data.ano_referencia) {
        return new Response(JSON.stringify({ error: 'Número e ano de referência são obrigatórios' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    
    // Preparar dados
    const insertData = {
        numero: data.numero,
        ano_referencia: data.ano_referencia || data.ano,
        titulo: data.titulo || data.numero,
        data_publicacao_prevista: data.data_publicacao_prevista || data.data_publicacao || null,
        data_publicacao_real: data.data_publicacao_real || null,
        juiz_id: data.juiz_id || null,
        status: data.status || 'rascunho',
        observacoes: data.observacoes ? data.observacoes.toUpperCase() : null
    };
    
    // Inserir
    const result = await env.DB.prepare(`
        INSERT INTO editais (
            numero, ano_referencia, titulo, data_publicacao_prevista, data_publicacao_real, juiz_id, status, observacoes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        insertData.numero, insertData.ano_referencia, insertData.titulo,
        insertData.data_publicacao_prevista, insertData.data_publicacao_real,
        insertData.juiz_id, insertData.status, insertData.observacoes
    ).run();
    
    // Buscar o edital criado
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
    const data = await request.json();
    
    // Verificar se existe
    const existente = await env.DB.prepare('SELECT id FROM editais WHERE id = ?').bind(id).first();
    if (!existente) {
        return new Response(JSON.stringify({ error: 'Edital não encontrado' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    
    // Preparar dados de atualização
    const updates = [];
    const values = [];
    
    if (data.numero !== undefined) {
        updates.push('numero = ?');
        values.push(data.numero);
    }
    if (data.ano_referencia !== undefined || data.ano !== undefined) {
        updates.push('ano_referencia = ?');
        values.push(data.ano_referencia || data.ano);
    }
    if (data.data_publicacao_prevista !== undefined || data.data_publicacao !== undefined) {
        updates.push('data_publicacao_prevista = ?');
        values.push(data.data_publicacao_prevista || data.data_publicacao || null);
    }
    if (data.data_publicacao_real !== undefined) {
        updates.push('data_publicacao_real = ?');
        values.push(data.data_publicacao_real || null);
    }
    if (data.juiz_id !== undefined) {
        updates.push('juiz_id = ?');
        values.push(data.juiz_id || null);
    }
    if (data.status !== undefined) {
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
        UPDATE editais SET ${updates.join(', ')} WHERE id = ?
    `).bind(...values).run();
    
    // Buscar atualizado
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

