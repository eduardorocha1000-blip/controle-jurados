// API de Instituições para Cloudflare Pages
// Substitui routes/instituicoes.js

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
        // GET - Listar instituições
        if (method === 'GET') {
            return await listarInstituicoes(request, env, corsHeaders);
        }
        
        // POST - Criar instituição
        if (method === 'POST') {
            return await criarInstituicao(request, env, corsHeaders);
        }
        
        // PUT - Atualizar instituição
        if (method === 'PUT') {
            const id = url.pathname.split('/').pop();
            return await atualizarInstituicao(id, request, env, corsHeaders);
        }
        
        // DELETE - Excluir instituição
        if (method === 'DELETE') {
            const id = url.pathname.split('/').pop();
            return await excluirInstituicao(id, env, corsHeaders);
        }
        
        return new Response('Method not allowed', { 
            status: 405,
            headers: corsHeaders 
        });
    } catch (error) {
        console.error('Erro na API de instituições:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

// Listar instituições com filtros
async function listarInstituicoes(request, env, corsHeaders) {
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
        const busca = url.searchParams.get('busca');
        
        let query = 'SELECT * FROM instituicoes WHERE 1=1';
        const params = [];
        
        if (busca) {
            query += ' AND (nome LIKE ? OR cnpj LIKE ? OR email LIKE ?)';
            const buscaParam = `%${busca}%`;
            params.push(buscaParam, buscaParam, buscaParam);
        }
        
        query += ' ORDER BY nome';
        
        console.log('Executando query:', query);
        console.log('Parâmetros:', params);
        
        const result = await env.DB.prepare(query).bind(...params).all();
        
        console.log('Resultado:', result.results?.length || 0, 'instituições encontradas');
        
        return new Response(JSON.stringify(result.results || []), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Erro ao listar instituições:', error);
        console.error('Stack:', error.stack);
        return new Response(JSON.stringify({ 
            error: 'Erro ao buscar instituições no banco de dados',
            details: error.message,
            type: error.name
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

// Criar nova instituição
async function criarInstituicao(request, env, corsHeaders) {
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
        cnpj: data.cnpj || null,
        telefone: data.telefone || null,
        email: data.email ? data.email.toLowerCase() : null,
        endereco: data.endereco ? data.endereco.toUpperCase() : null,
        numero: data.numero || null,
        complemento: data.complemento ? data.complemento.toUpperCase() : null,
        bairro: data.bairro ? data.bairro.toUpperCase() : null,
        cidade: data.cidade ? data.cidade.toUpperCase() : null,
        uf: data.uf ? data.uf.toUpperCase() : null,
        cep: data.cep || null,
        observacoes: data.observacoes ? data.observacoes.toUpperCase() : null
    };
    
    // Inserir
    const result = await env.DB.prepare(`
        INSERT INTO instituicoes (
            nome, cnpj, telefone, email, endereco, numero, complemento,
            bairro, cidade, uf, cep, observacoes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        insertData.nome, insertData.cnpj, insertData.telefone, insertData.email,
        insertData.endereco, insertData.numero, insertData.complemento,
        insertData.bairro, insertData.cidade, insertData.uf, insertData.cep,
        insertData.observacoes
    ).run();
    
    // Buscar a instituição criada
    const instituicao = await env.DB.prepare(
        'SELECT * FROM instituicoes WHERE id = ?'
    ).bind(result.meta.last_row_id).first();
    
    return new Response(JSON.stringify(instituicao), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

// Atualizar instituição
async function atualizarInstituicao(id, request, env, corsHeaders) {
    const data = await request.json();
    
    // Verificar se existe
    const existente = await env.DB.prepare('SELECT id FROM instituicoes WHERE id = ?').bind(id).first();
    if (!existente) {
        return new Response(JSON.stringify({ error: 'Instituição não encontrada' }), {
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
    if (data.cnpj !== undefined) {
        updates.push('cnpj = ?');
        values.push(data.cnpj || null);
    }
    if (data.telefone !== undefined) {
        updates.push('telefone = ?');
        values.push(data.telefone || null);
    }
    if (data.email !== undefined) {
        updates.push('email = ?');
        values.push(data.email ? data.email.toLowerCase() : null);
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
        UPDATE instituicoes SET ${updates.join(', ')} WHERE id = ?
    `).bind(...values).run();
    
    // Buscar atualizada
    const instituicao = await env.DB.prepare(
        'SELECT * FROM instituicoes WHERE id = ?'
    ).bind(id).first();
    
    return new Response(JSON.stringify(instituicao), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

// Excluir instituição
async function excluirInstituicao(id, env, corsHeaders) {
    const result = await env.DB.prepare('DELETE FROM instituicoes WHERE id = ?').bind(id).run();
    
    if (result.meta.changes === 0) {
        return new Response(JSON.stringify({ error: 'Instituição não encontrada' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    
    return new Response(null, {
        status: 204,
        headers: corsHeaders
    });
}

