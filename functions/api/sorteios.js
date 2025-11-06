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
    const url = new URL(request.url);
    const ano_referencia = url.searchParams.get('ano_referencia');
    const busca = url.searchParams.get('busca');
    
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
        
        let query = `
            SELECT 
                s.*,
                j.nome_completo as juiz_nome
            FROM sorteios s
            LEFT JOIN juizes j ON s.juiz_responsavel_id = j.id
            WHERE 1=1
        `;
        const params = [];
        
        if (ano_referencia) {
            query += ' AND s.ano_referencia = ?';
            params.push(ano_referencia);
        }
        
        if (busca) {
            query += ' AND (s.numero_processo LIKE ? OR j.nome_completo LIKE ? OR s.local_sorteio LIKE ? OR s.status LIKE ?)';
            const buscaParam = `%${busca}%`;
            params.push(buscaParam, buscaParam, buscaParam, buscaParam);
        }
        
        query += ' ORDER BY s.data_juri DESC';
        
        console.log('Executando query:', query);
        console.log('Parâmetros:', params);
        
        const result = await env.DB.prepare(query).bind(...params).all();
        
        console.log('Resultado:', result.results?.length || 0, 'sorteios encontrados');
        
        return new Response(JSON.stringify(result.results || []), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Erro ao listar sorteios:', error);
        console.error('Stack:', error.stack);
        return new Response(JSON.stringify({ 
            error: 'Erro ao buscar sorteios no banco de dados',
            details: error.message,
            type: error.name
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

// Criar novo sorteio
async function criarSorteio(request, env, corsHeaders) {
    const data = await request.json();
    
    // Validações básicas
    if (!data.ano_referencia || !data.data_juri) {
        return new Response(JSON.stringify({ error: 'Ano de referência e data do júri são obrigatórios' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    
    // Preparar dados
    const insertData = {
        ano_referencia: data.ano_referencia,
        data_juri: data.data_juri,
        hora_juri: data.hora_juri || null,
        juiz_responsavel_id: data.juiz_responsavel_id || null,
        local_sorteio: data.local_sorteio ? data.local_sorteio.toUpperCase() : null,
        numero_processo: data.numero_processo || null,
        status: data.status || 'Agendado',
        observacoes: data.observacoes ? data.observacoes.toUpperCase() : null
    };
    
    // Inserir
    const result = await env.DB.prepare(`
        INSERT INTO sorteios (
            ano_referencia, data_juri, hora_juri, juiz_responsavel_id, local_sorteio, numero_processo, status, observacoes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        insertData.ano_referencia, insertData.data_juri, insertData.hora_juri,
        insertData.juiz_responsavel_id, insertData.local_sorteio, insertData.numero_processo,
        insertData.status, insertData.observacoes
    ).run();
    
    // Buscar o sorteio criado
    const sorteio = await env.DB.prepare(`
        SELECT 
            s.*,
            j.nome_completo as juiz_nome
        FROM sorteios s
        LEFT JOIN juizes j ON s.juiz_responsavel_id = j.id
        WHERE s.id = ?
    `).bind(result.meta.last_row_id).first();
    
    return new Response(JSON.stringify(sorteio), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

// Atualizar sorteio
async function atualizarSorteio(id, request, env, corsHeaders) {
    const data = await request.json();
    
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
        updates.push('ano_referencia = ?');
        values.push(data.ano_referencia);
    }
    if (data.data_juri !== undefined) {
        updates.push('data_juri = ?');
        values.push(data.data_juri);
    }
    if (data.hora_juri !== undefined) {
        updates.push('hora_juri = ?');
        values.push(data.hora_juri || null);
    }
    if (data.juiz_responsavel_id !== undefined) {
        updates.push('juiz_responsavel_id = ?');
        values.push(data.juiz_responsavel_id || null);
    }
    if (data.local_sorteio !== undefined) {
        updates.push('local_sorteio = ?');
        values.push(data.local_sorteio ? data.local_sorteio.toUpperCase() : null);
    }
    if (data.numero_processo !== undefined) {
        updates.push('numero_processo = ?');
        values.push(data.numero_processo || null);
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
        UPDATE sorteios SET ${updates.join(', ')} WHERE id = ?
    `).bind(...values).run();
    
    // Buscar atualizado
    const sorteio = await env.DB.prepare(`
        SELECT 
            s.*,
            j.nome_completo as juiz_nome
        FROM sorteios s
        LEFT JOIN juizes j ON s.juiz_responsavel_id = j.id
        WHERE s.id = ?
    `).bind(id).first();
    
    return new Response(JSON.stringify(sorteio), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

// Excluir sorteio
async function excluirSorteio(id, env, corsHeaders) {
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

