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
    const url = new URL(request.url);
    const ano = url.searchParams.get('ano');
    const status = url.searchParams.get('status');
    
    let query = `
        SELECT 
            e.*,
            j.nome as juiz_nome
        FROM editais e
        LEFT JOIN juizes j ON e.juiz_id = j.id
        WHERE 1=1
    `;
    const params = [];
    
    if (ano) {
        query += ' AND e.ano = ?';
        params.push(ano);
    }
    
    if (status) {
        query += ' AND e.status = ?';
        params.push(status);
    }
    
    query += ' ORDER BY e.ano DESC, e.numero DESC';
    
    const result = await env.DB.prepare(query).bind(...params).all();
    
    return new Response(JSON.stringify(result.results || []), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

// Criar novo edital
async function criarEdital(request, env, corsHeaders) {
    const data = await request.json();
    
    // Validações básicas
    if (!data.numero || !data.ano) {
        return new Response(JSON.stringify({ error: 'Número e ano são obrigatórios' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    
    // Preparar dados
    const insertData = {
        numero: data.numero,
        ano: data.ano,
        data_publicacao: data.data_publicacao || null,
        juiz_id: data.juiz_id || null,
        status: data.status || 'rascunho',
        observacoes: data.observacoes ? data.observacoes.toUpperCase() : null
    };
    
    // Inserir
    const result = await env.DB.prepare(`
        INSERT INTO editais (
            numero, ano, data_publicacao, juiz_id, status, observacoes
        ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
        insertData.numero, insertData.ano, insertData.data_publicacao,
        insertData.juiz_id, insertData.status, insertData.observacoes
    ).run();
    
    // Buscar o edital criado
    const edital = await env.DB.prepare(`
        SELECT 
            e.*,
            j.nome as juiz_nome
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
    if (data.ano !== undefined) {
        updates.push('ano = ?');
        values.push(data.ano);
    }
    if (data.data_publicacao !== undefined) {
        updates.push('data_publicacao = ?');
        values.push(data.data_publicacao || null);
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
            j.nome as juiz_nome
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

