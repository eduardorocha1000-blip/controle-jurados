// API de Juízes para Cloudflare Pages
// Substitui routes/juizes.js

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
        // GET - Listar juízes
        if (method === 'GET') {
            return await listarJuizes(request, env, corsHeaders);
        }
        
        // POST - Criar juiz
        if (method === 'POST') {
            return await criarJuiz(request, env, corsHeaders);
        }
        
        // PUT - Atualizar juiz
        if (method === 'PUT') {
            const id = url.pathname.split('/').pop();
            return await atualizarJuiz(id, request, env, corsHeaders);
        }
        
        // DELETE - Excluir juiz
        if (method === 'DELETE') {
            const id = url.pathname.split('/').pop();
            return await excluirJuiz(id, env, corsHeaders);
        }
        
        return new Response('Method not allowed', { 
            status: 405,
            headers: corsHeaders 
        });
    } catch (error) {
        console.error('Erro na API de juízes:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

// Listar juízes com filtros
async function listarJuizes(request, env, corsHeaders) {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const titular = url.searchParams.get('titular');
    const busca = url.searchParams.get('busca');
    
    let query = 'SELECT * FROM juizes WHERE 1=1';
    const params = [];
    
    if (status) {
        query += ' AND status = ?';
        params.push(status);
    }
    
    if (titular) {
        query += ' AND titular = ?';
        params.push(titular);
    }
    
    if (busca) {
        query += ' AND (nome LIKE ? OR cargo LIKE ? OR email LIKE ?)';
        const buscaParam = `%${busca}%`;
        params.push(buscaParam, buscaParam, buscaParam);
    }
    
    query += ' ORDER BY nome';
    
    const result = await env.DB.prepare(query).bind(...params).all();
    
    return new Response(JSON.stringify(result.results || []), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

// Criar novo juiz
async function criarJuiz(request, env, corsHeaders) {
    const data = await request.json();
    
    // Validações básicas
    if (!data.nome) {
        return new Response(JSON.stringify({ error: 'Nome é obrigatório' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    
    // Preparar dados
    const insertData = {
        nome: data.nome.toUpperCase(),
        cargo: data.cargo ? data.cargo.toUpperCase() : null,
        titular: data.titular || 'Não',
        telefone: data.telefone || null,
        email: data.email ? data.email.toLowerCase() : null,
        status: data.status || 'Ativo',
        observacoes: data.observacoes ? data.observacoes.toUpperCase() : null
    };
    
    // Inserir
    const result = await env.DB.prepare(`
        INSERT INTO juizes (nome, cargo, titular, telefone, email, status, observacoes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
        insertData.nome, insertData.cargo, insertData.titular,
        insertData.telefone, insertData.email, insertData.status, insertData.observacoes
    ).run();
    
    // Buscar o juiz criado
    const juiz = await env.DB.prepare(
        'SELECT * FROM juizes WHERE id = ?'
    ).bind(result.meta.last_row_id).first();
    
    return new Response(JSON.stringify(juiz), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

// Atualizar juiz
async function atualizarJuiz(id, request, env, corsHeaders) {
    const data = await request.json();
    
    // Verificar se existe
    const existente = await env.DB.prepare('SELECT id FROM juizes WHERE id = ?').bind(id).first();
    if (!existente) {
        return new Response(JSON.stringify({ error: 'Juiz não encontrado' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    
    // Preparar dados de atualização
    const updates = [];
    const values = [];
    
    if (data.nome !== undefined) {
        updates.push('nome = ?');
        values.push(data.nome.toUpperCase());
    }
    if (data.cargo !== undefined) {
        updates.push('cargo = ?');
        values.push(data.cargo ? data.cargo.toUpperCase() : null);
    }
    if (data.titular !== undefined) {
        updates.push('titular = ?');
        values.push(data.titular);
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
        UPDATE juizes SET ${updates.join(', ')} WHERE id = ?
    `).bind(...values).run();
    
    // Buscar atualizado
    const juiz = await env.DB.prepare(
        'SELECT * FROM juizes WHERE id = ?'
    ).bind(id).first();
    
    return new Response(JSON.stringify(juiz), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

// Excluir juiz
async function excluirJuiz(id, env, corsHeaders) {
    const result = await env.DB.prepare('DELETE FROM juizes WHERE id = ?').bind(id).run();
    
    if (result.meta.changes === 0) {
        return new Response(JSON.stringify({ error: 'Juiz não encontrado' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    
    return new Response(null, {
        status: 204,
        headers: corsHeaders
    });
}

