// API de Indicações para Cloudflare Pages
// Substitui routes/indicacoes.js

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
        // GET - Listar indicações
        if (method === 'GET') {
            return await listarIndicacoes(request, env, corsHeaders);
        }
        
        // POST - Criar indicação
        if (method === 'POST') {
            return await criarIndicacao(request, env, corsHeaders);
        }
        
        // PUT - Atualizar indicação
        if (method === 'PUT') {
            const id = url.pathname.split('/').pop();
            return await atualizarIndicacao(id, request, env, corsHeaders);
        }
        
        // DELETE - Excluir indicação
        if (method === 'DELETE') {
            const id = url.pathname.split('/').pop();
            return await excluirIndicacao(id, env, corsHeaders);
        }
        
        return new Response('Method not allowed', { 
            status: 405,
            headers: corsHeaders 
        });
    } catch (error) {
        console.error('Erro na API de indicações:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

// Listar indicações com filtros
async function listarIndicacoes(request, env, corsHeaders) {
    const url = new URL(request.url);
    const ano_referencia = url.searchParams.get('ano_referencia');
    const instituicao_id = url.searchParams.get('instituicao_id');
    const status = url.searchParams.get('status');
    
    let query = `
        SELECT 
            i.*,
            inst.nome as instituicao_nome
        FROM indicacoes i
        LEFT JOIN instituicoes inst ON i.instituicao_id = inst.id
        WHERE 1=1
    `;
    const params = [];
    
    if (ano_referencia) {
        query += ' AND i.ano_referencia = ?';
        params.push(ano_referencia);
    }
    
    if (instituicao_id) {
        query += ' AND i.instituicao_id = ?';
        params.push(instituicao_id);
    }
    
    if (status) {
        query += ' AND i.status = ?';
        params.push(status);
    }
    
    query += ' ORDER BY i.ano_referencia DESC, i.created_at DESC';
    
    const result = await env.DB.prepare(query).bind(...params).all();
    
    return new Response(JSON.stringify(result.results || []), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

// Criar nova indicação
async function criarIndicacao(request, env, corsHeaders) {
    const data = await request.json();
    
    // Validações básicas
    if (!data.ano_referencia || !data.instituicao_id || !data.quantidade) {
        return new Response(JSON.stringify({ error: 'Ano de referência, instituição e quantidade são obrigatórios' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    
    // Preparar dados
    const insertData = {
        ano_referencia: data.ano_referencia,
        instituicao_id: data.instituicao_id,
        quantidade: data.quantidade,
        prazo_envio: data.prazo_envio || null,
        status: data.status || 'pendente',
        observacoes: data.observacoes ? data.observacoes.toUpperCase() : null,
        arquivo_lista: data.arquivo_lista || null
    };
    
    // Inserir
    const result = await env.DB.prepare(`
        INSERT INTO indicacoes (
            ano_referencia, instituicao_id, quantidade, prazo_envio, status, observacoes, arquivo_lista
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
        insertData.ano_referencia, insertData.instituicao_id, insertData.quantidade,
        insertData.prazo_envio, insertData.status, insertData.observacoes, insertData.arquivo_lista
    ).run();
    
    // Buscar a indicação criada
    const indicacao = await env.DB.prepare(`
        SELECT 
            i.*,
            inst.nome as instituicao_nome
        FROM indicacoes i
        LEFT JOIN instituicoes inst ON i.instituicao_id = inst.id
        WHERE i.id = ?
    `).bind(result.meta.last_row_id).first();
    
    return new Response(JSON.stringify(indicacao), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

// Atualizar indicação
async function atualizarIndicacao(id, request, env, corsHeaders) {
    const data = await request.json();
    
    // Verificar se existe
    const existente = await env.DB.prepare('SELECT id FROM indicacoes WHERE id = ?').bind(id).first();
    if (!existente) {
        return new Response(JSON.stringify({ error: 'Indicação não encontrada' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    
    // Preparar dados de atualização
    const updates = [];
    const values = [];
    
    if (data.ano_referencia !== undefined) {
        updates.push('ano_referencia = ?');
        values.push(data.ano_referencia);
    }
    if (data.instituicao_id !== undefined) {
        updates.push('instituicao_id = ?');
        values.push(data.instituicao_id);
    }
    if (data.quantidade !== undefined) {
        updates.push('quantidade = ?');
        values.push(data.quantidade);
    }
    if (data.prazo_envio !== undefined) {
        updates.push('prazo_envio = ?');
        values.push(data.prazo_envio || null);
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
        UPDATE indicacoes SET ${updates.join(', ')} WHERE id = ?
    `).bind(...values).run();
    
    // Buscar atualizada
    const indicacao = await env.DB.prepare(`
        SELECT 
            i.*,
            inst.nome as instituicao_nome
        FROM indicacoes i
        LEFT JOIN instituicoes inst ON i.instituicao_id = inst.id
        WHERE i.id = ?
    `).bind(id).first();
    
    return new Response(JSON.stringify(indicacao), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

// Excluir indicação
async function excluirIndicacao(id, env, corsHeaders) {
    const result = await env.DB.prepare('DELETE FROM indicacoes WHERE id = ?').bind(id).run();
    
    if (result.meta.changes === 0) {
        return new Response(JSON.stringify({ error: 'Indicação não encontrada' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    
    return new Response(null, {
        status: 204,
        headers: corsHeaders
    });
}

