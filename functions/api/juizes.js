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
        const status = url.searchParams.get('status');
        const titular = url.searchParams.get('titular');
        const busca = url.searchParams.get('busca');

        let query = `
            SELECT
                j.id,
                j.nome_completo,
                j.matricula,
                j.sexo,
                j.vara,
                j.comarca,
                j.email,
                j.titular,
                j.telefone,
                j.status,
                j.observacoes,
                j.created_at,
                j.updated_at,
                j.nome_completo AS nome,
                j.vara AS cargo
            FROM juizes j
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += ' AND j.status = ?';
            params.push(status);
        }

        if (titular) {
            query += ' AND j.titular = ?';
            params.push(titular);
        }

        if (busca) {
            query += `
                AND (
                    j.nome_completo LIKE ?
                    OR j.email LIKE ?
                    OR j.comarca LIKE ?
                    OR j.vara LIKE ?
                    OR j.matricula LIKE ?
                )
            `;
            const buscaParam = `%${busca}%`;
            params.push(buscaParam, buscaParam, buscaParam, buscaParam, buscaParam);
        }

        query += ' ORDER BY j.nome_completo';

        console.log('[juizes] Executando query:', query, 'Params:', params);

        const result = await env.DB.prepare(query).bind(...params).all();
        const juizes = (result.results || []).map(mapearJuiz);

        return new Response(JSON.stringify(juizes), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Erro ao listar juízes:', error);
        return new Response(JSON.stringify({
            error: 'Erro ao buscar juízes no banco de dados',
            details: error.message || 'Erro desconhecido',
            type: error.name
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

// Criar novo juiz
async function criarJuiz(request, env, corsHeaders) {
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

    const payload = data.value || {};
    const nomeBruto = payload.nome || payload.nome_completo;

    if (!nomeBruto) {
        return new Response(JSON.stringify({ error: 'Nome completo é obrigatório' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    if (!payload.sexo) {
        return new Response(JSON.stringify({ error: 'Sexo é obrigatório' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    const insertData = {
        nome_completo: nomeBruto.toUpperCase(),
        matricula: payload.matricula || null,
        sexo: payload.sexo,
        vara: (payload.vara || payload.cargo || 'Vara Única').toUpperCase(),
        comarca: (payload.comarca || 'Capivari de Baixo').toUpperCase(),
        email: payload.email ? payload.email.toLowerCase() : null,
        titular: payload.titular || 'Não',
        telefone: payload.telefone || null,
        status: payload.status || 'Ativo',
        observacoes: payload.observacoes ? payload.observacoes.toUpperCase() : null
    };

    const result = await env.DB.prepare(`
        INSERT INTO juizes (
            nome_completo,
            matricula,
            sexo,
            vara,
            comarca,
            email,
            titular,
            telefone,
            status,
            observacoes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        insertData.nome_completo,
        insertData.matricula,
        insertData.sexo,
        insertData.vara,
        insertData.comarca,
        insertData.email,
        insertData.titular,
        insertData.telefone,
        insertData.status,
        insertData.observacoes
    ).run();

    const juiz = await env.DB.prepare(`
        SELECT
            j.*,
            j.nome_completo as nome,
            j.vara as cargo
        FROM juizes j
        WHERE j.id = ?
    `).bind(result.meta.last_row_id).first();

    return new Response(JSON.stringify(mapearJuiz(juiz)), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

// Atualizar juiz
async function atualizarJuiz(id, request, env, corsHeaders) {
    if (!env.DB) {
        return new Response(JSON.stringify({
            error: 'Banco de dados não configurado',
            details: 'Configure o binding DB no projeto do Cloudflare Pages.'
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    const existente = await env.DB.prepare('SELECT id FROM juizes WHERE id = ?').bind(id).first();
    if (!existente) {
        return new Response(JSON.stringify({ error: 'Juiz não encontrado' }), {
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

    const payload = data.value || {};
    const updates = [];
    const values = [];

    if (payload.nome !== undefined || payload.nome_completo !== undefined) {
        updates.push('nome_completo = ?');
        const nomeAtualizado = (payload.nome || payload.nome_completo || '').toString().toUpperCase();
        values.push(nomeAtualizado);
    }
    if (payload.matricula !== undefined) {
        updates.push('matricula = ?');
        values.push(payload.matricula || null);
    }
    if (payload.sexo !== undefined) {
        updates.push('sexo = ?');
        values.push(payload.sexo || null);
    }
    if (payload.vara !== undefined || payload.cargo !== undefined) {
        updates.push('vara = ?');
        const varaAtualizada = (payload.vara || payload.cargo || '').toString().toUpperCase();
        values.push(varaAtualizada || 'VARA ÚNICA');
    }
    if (payload.comarca !== undefined) {
        updates.push('comarca = ?');
        values.push(payload.comarca ? payload.comarca.toUpperCase() : 'CAPIVARI DE BAIXO');
    }
    if (payload.email !== undefined) {
        updates.push('email = ?');
        values.push(payload.email ? payload.email.toLowerCase() : null);
    }
    if (payload.titular !== undefined) {
        updates.push('titular = ?');
        values.push(payload.titular);
    }
    if (payload.telefone !== undefined) {
        updates.push('telefone = ?');
        values.push(payload.telefone || null);
    }
    if (payload.status !== undefined) {
        updates.push('status = ?');
        values.push(payload.status);
    }
    if (payload.observacoes !== undefined) {
        updates.push('observacoes = ?');
        values.push(payload.observacoes ? payload.observacoes.toUpperCase() : null);
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

    const juiz = await env.DB.prepare(`
        SELECT 
            j.*,
            j.nome_completo AS nome,
            j.vara AS cargo
        FROM juizes j
        WHERE j.id = ?
    `).bind(id).first();

    return new Response(JSON.stringify(mapearJuiz(juiz)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

// Excluir juiz
async function excluirJuiz(id, env, corsHeaders) {
    if (!env.DB) {
        return new Response(JSON.stringify({
            error: 'Banco de dados não configurado',
            details: 'Configure o binding DB no projeto do Cloudflare Pages.'
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

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

function mapearJuiz(juiz) {
    if (!juiz) return juiz;
    return {
        ...juiz,
        nome: juiz.nome || juiz.nome_completo || null,
        cargo: juiz.cargo || juiz.vara || null
    };
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

