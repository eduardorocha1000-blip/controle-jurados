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
    const url = new URL(request.url);
    const sorteio_id = url.searchParams.get('sorteio_id');
    const status = url.searchParams.get('status');
    
    let query = `
        SELECT 
            c.*,
            c.numero_sequencial as numero_cedula,
            COALESCE(c.status, 'Gerada') as status,
            s.numero_processo,
            s.data_juri,
            s.hora_juri,
            s.local_sorteio,
            s.ano_referencia,
            j.nome as juiz_nome
        FROM cedulas c
        LEFT JOIN sorteios s ON c.sorteio_id = s.id
        LEFT JOIN juizes j ON s.juiz_responsavel_id = j.id
        WHERE 1=1
    `;
    const params = [];
    
    if (sorteio_id) {
        query += ' AND c.sorteio_id = ?';
        params.push(sorteio_id);
    }
    
    if (status) {
        query += ' AND COALESCE(c.status, \'Gerada\') = ?';
        params.push(status);
    }
    
    query += ' ORDER BY c.created_at DESC';
    
    const result = await env.DB.prepare(query).bind(...params).all();
    
    return new Response(JSON.stringify(result.results || []), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

// Criar nova cédula
async function criarCedula(request, env, corsHeaders) {
    const data = await request.json();
    
    // Validações básicas
    if (!data.sorteio_id) {
        return new Response(JSON.stringify({ error: 'Sorteio é obrigatório' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    
    // Preparar dados
    const insertData = {
        sorteio_id: data.sorteio_id,
        numero_cedula: data.numero_cedula || null,
        numero_sequencial: data.numero_sequencial || data.numero_cedula || null,
        status: data.status || 'Gerada'
    };
    
    // Inserir
    const result = await env.DB.prepare(`
        INSERT INTO cedulas (
            sorteio_id, numero_cedula, numero_sequencial, status
        ) VALUES (?, ?, ?, ?)
    `).bind(
        insertData.sorteio_id, insertData.numero_cedula, insertData.numero_sequencial, insertData.status
    ).run();
    
    // Buscar a cédula criada
    const cedula = await env.DB.prepare(`
        SELECT 
            c.*,
            c.numero_sequencial as numero_cedula,
            COALESCE(c.status, 'Gerada') as status,
            s.numero_processo,
            s.data_juri,
            s.hora_juri,
            s.ano_referencia,
            j.nome as juiz_nome
        FROM cedulas c
        LEFT JOIN sorteios s ON c.sorteio_id = s.id
        LEFT JOIN juizes j ON s.juiz_responsavel_id = j.id
        WHERE c.id = ?
    `).bind(result.meta.last_row_id).first();
    
    return new Response(JSON.stringify(cedula), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

// Atualizar cédula
async function atualizarCedula(id, request, env, corsHeaders) {
    const data = await request.json();
    
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
    
    if (data.sorteio_id !== undefined) {
        updates.push('sorteio_id = ?');
        values.push(data.sorteio_id);
    }
    if (data.numero_cedula !== undefined) {
        updates.push('numero_cedula = ?');
        values.push(data.numero_cedula);
    }
    if (data.numero_sequencial !== undefined) {
        updates.push('numero_sequencial = ?');
        values.push(data.numero_sequencial);
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
        UPDATE cedulas SET ${updates.join(', ')} WHERE id = ?
    `).bind(...values).run();
    
    // Buscar atualizada
    const cedula = await env.DB.prepare(`
        SELECT 
            c.*,
            c.numero_sequencial as numero_cedula,
            COALESCE(c.status, 'Gerada') as status,
            s.numero_processo,
            s.data_juri,
            s.hora_juri,
            s.ano_referencia,
            j.nome as juiz_nome
        FROM cedulas c
        LEFT JOIN sorteios s ON c.sorteio_id = s.id
        LEFT JOIN juizes j ON s.juiz_responsavel_id = j.id
        WHERE c.id = ?
    `).bind(id).first();
    
    return new Response(JSON.stringify(cedula), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

// Excluir cédula
async function excluirCedula(id, env, corsHeaders) {
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

