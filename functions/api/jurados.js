// API de Jurados para Cloudflare Pages
// Substitui routes/jurados.js

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
        // GET - Listar jurados
        if (method === 'GET') {
            return await listarJurados(request, env, corsHeaders);
        }
        
        // POST - Criar jurado
        if (method === 'POST') {
            return await criarJurado(request, env, corsHeaders);
        }
        
        // PUT - Atualizar jurado
        if (method === 'PUT') {
            const id = url.pathname.split('/').pop();
            return await atualizarJurado(id, request, env, corsHeaders);
        }
        
        // DELETE - Excluir jurado
        if (method === 'DELETE') {
            const id = url.pathname.split('/').pop();
            return await excluirJurado(id, env, corsHeaders);
        }
        
        return new Response('Method not allowed', { 
            status: 405,
            headers: corsHeaders 
        });
    } catch (error) {
        console.error('Erro na API de jurados:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

// Listar jurados com filtros
async function listarJurados(request, env, corsHeaders) {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const instituicao_id = url.searchParams.get('instituicao_id');
    const busca = url.searchParams.get('busca');
    
    let query = `
        SELECT 
            j.*,
            i.nome as instituicao_nome
        FROM jurados j
        LEFT JOIN instituicoes i ON j.instituicao_id = i.id
        WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
        query += ' AND j.status = ?';
        params.push(status);
    }
    
    if (instituicao_id) {
        query += ' AND j.instituicao_id = ?';
        params.push(instituicao_id);
    }
    
    if (busca) {
        query += ' AND (j.nome_completo LIKE ? OR j.cpf LIKE ? OR j.profissao LIKE ? OR j.email LIKE ?)';
        const buscaParam = `%${busca}%`;
        params.push(buscaParam, buscaParam, buscaParam, buscaParam);
    }
    
    query += ' ORDER BY j.nome_completo';
    
    const result = await env.DB.prepare(query).bind(...params).all();
    
    return new Response(JSON.stringify(result.results || []), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

// Criar novo jurado
async function criarJurado(request, env, corsHeaders) {
    const data = await request.json();
    
    // Validações básicas
    if (!data.nome_completo || !data.cpf || !data.sexo) {
        return new Response(JSON.stringify({ error: 'Campos obrigatórios: nome_completo, cpf, sexo' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    
    // Verificar se CPF já existe
    const cpfExistente = await env.DB.prepare(
        'SELECT id FROM jurados WHERE cpf = ?'
    ).bind(data.cpf).first();
    
    if (cpfExistente) {
        return new Response(JSON.stringify({ error: 'CPF já cadastrado' }), {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    
    // Preparar dados
    const insertData = {
        nome_completo: data.nome_completo.toUpperCase(),
        cpf: data.cpf,
        rg: data.rg || null,
        data_nascimento: data.data_nascimento || null,
        sexo: data.sexo,
        endereco: (data.endereco || '').toUpperCase(),
        numero: data.numero || '',
        complemento: data.complemento ? data.complemento.toUpperCase() : null,
        bairro: (data.bairro || '').toUpperCase(),
        cidade: data.cidade ? data.cidade.toUpperCase() : 'CAPIVARI DE BAIXO',
        uf: data.uf || 'SC',
        cep: data.cep || '88745-000',
        email: data.email ? data.email.toLowerCase() : null,
        telefone: data.telefone || null,
        profissao: (data.profissao || '').toUpperCase(),
        observacoes: data.observacoes ? data.observacoes.toUpperCase() : null,
        status: data.status || 'Ativo',
        motivo: data.motivo || null,
        suspenso_ate: data.suspenso_ate || null,
        ultimo_conselho: data.ultimo_conselho || null,
        instituicao_id: data.instituicao_id || null,
        foto_path: data.foto_path || null
    };
    
    // Inserir
    const result = await env.DB.prepare(`
        INSERT INTO jurados (
            nome_completo, cpf, rg, data_nascimento, sexo,
            endereco, numero, complemento, bairro, cidade, uf, cep,
            email, telefone, profissao, observacoes,
            status, motivo, suspenso_ate, ultimo_conselho, instituicao_id, foto_path
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        insertData.nome_completo, insertData.cpf, insertData.rg, insertData.data_nascimento,
        insertData.sexo, insertData.endereco, insertData.numero, insertData.complemento,
        insertData.bairro, insertData.cidade, insertData.uf, insertData.cep,
        insertData.email, insertData.telefone, insertData.profissao, insertData.observacoes,
        insertData.status, insertData.motivo, insertData.suspenso_ate, insertData.ultimo_conselho,
        insertData.instituicao_id, insertData.foto_path
    ).run();
    
    // Buscar o jurado criado
    const jurado = await env.DB.prepare(
        'SELECT j.*, i.nome as instituicao_nome FROM jurados j LEFT JOIN instituicoes i ON j.instituicao_id = i.id WHERE j.id = ?'
    ).bind(result.meta.last_row_id).first();
    
    return new Response(JSON.stringify(jurado), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

// Atualizar jurado
async function atualizarJurado(id, request, env, corsHeaders) {
    const data = await request.json();
    
    // Verificar se existe
    const existente = await env.DB.prepare('SELECT id FROM jurados WHERE id = ?').bind(id).first();
    if (!existente) {
        return new Response(JSON.stringify({ error: 'Jurado não encontrado' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    
    // Preparar dados de atualização
    const updates = [];
    const values = [];
    
    if (data.nome_completo !== undefined) {
        updates.push('nome_completo = ?');
        values.push(data.nome_completo.toUpperCase());
    }
    if (data.cpf !== undefined) {
        updates.push('cpf = ?');
        values.push(data.cpf);
    }
    if (data.sexo !== undefined) {
        updates.push('sexo = ?');
        values.push(data.sexo);
    }
    if (data.status !== undefined) {
        updates.push('status = ?');
        values.push(data.status);
    }
    // Adicionar outros campos conforme necessário...
    
    if (updates.length === 0) {
        return new Response(JSON.stringify({ error: 'Nenhum campo para atualizar' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    await env.DB.prepare(`
        UPDATE jurados SET ${updates.join(', ')} WHERE id = ?
    `).bind(...values).run();
    
    // Buscar atualizado
    const jurado = await env.DB.prepare(
        'SELECT j.*, i.nome as instituicao_nome FROM jurados j LEFT JOIN instituicoes i ON j.instituicao_id = i.id WHERE j.id = ?'
    ).bind(id).first();
    
    return new Response(JSON.stringify(jurado), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

// Excluir jurado
async function excluirJurado(id, env, corsHeaders) {
    const result = await env.DB.prepare('DELETE FROM jurados WHERE id = ?').bind(id).run();
    
    if (result.meta.changes === 0) {
        return new Response(JSON.stringify({ error: 'Jurado não encontrado' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    
    return new Response(null, {
        status: 204,
        headers: corsHeaders
    });
}

