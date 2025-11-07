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

        const colunasJuizes = await getTableColumns(env, 'juizes');

        const nomeCol = colunasJuizes.has('nome_completo')
            ? 'nome_completo'
            : (colunasJuizes.has('nome') ? 'nome' : null);
        const matriculaCol = colunasJuizes.has('matricula');
        const varaCol = colunasJuizes.has('vara');
        const comarcaCol = colunasJuizes.has('comarca');
        const sexoCol = colunasJuizes.has('sexo');
        const titularCol = colunasJuizes.has('titular');
        const telefoneCol = colunasJuizes.has('telefone');
        const emailCol = colunasJuizes.has('email');
        const statusCol = colunasJuizes.has('status');
        const observacoesCol = colunasJuizes.has('observacoes');
        const createdCol = colunasJuizes.has('created_at');
        const updatedCol = colunasJuizes.has('updated_at');

        const url = new URL(request.url);
        const status = url.searchParams.get('status');
        const titular = url.searchParams.get('titular');
        const busca = url.searchParams.get('busca');

        const selectCampos = [
            'j.id',
            nomeCol ? `j.${nomeCol} AS nome` : 'NULL AS nome',
            nomeCol ? `j.${nomeCol} AS nome_completo` : 'NULL AS nome_completo',
            matriculaCol ? 'j.matricula' : 'NULL AS matricula',
            sexoCol ? 'j.sexo' : 'NULL AS sexo',
            varaCol ? 'j.vara' : 'NULL AS vara',
            comarcaCol ? 'j.comarca' : 'NULL AS comarca',
            emailCol ? 'j.email' : 'NULL AS email',
            titularCol ? 'j.titular' : 'NULL AS titular',
            telefoneCol ? 'j.telefone' : 'NULL AS telefone',
            statusCol ? 'j.status' : 'NULL AS status',
            observacoesCol ? 'j.observacoes' : 'NULL AS observacoes',
            createdCol ? 'j.created_at' : 'NULL AS created_at',
            updatedCol ? 'j.updated_at' : 'NULL AS updated_at',
            varaCol ? 'j.vara AS cargo' : (colunasJuizes.has('cargo') ? 'j.cargo' : 'NULL AS cargo')
        ];

        let query = `
            SELECT
                ${selectCampos.join(',\n                ')}
            FROM juizes j
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            if (statusCol) {
                query += ' AND j.status = ?';
                params.push(status);
            }
        }

        if (titular) {
            if (titularCol) {
                query += ' AND j.titular = ?';
                params.push(titular);
            }
        }

        if (busca) {
            const camposBusca = [];
            const buscaParam = `%${busca}%`;
            if (nomeCol) {
                camposBusca.push(`j.${nomeCol} LIKE ?`);
                params.push(buscaParam);
            }
            if (emailCol) {
                camposBusca.push('j.email LIKE ?');
                params.push(buscaParam);
            }
            if (comarcaCol) {
                camposBusca.push('j.comarca LIKE ?');
                params.push(buscaParam);
            }
            if (varaCol) {
                camposBusca.push('j.vara LIKE ?');
                params.push(buscaParam);
            }
            if (matriculaCol) {
                camposBusca.push('j.matricula LIKE ?');
                params.push(buscaParam);
            }

            if (camposBusca.length > 0) {
                query += ` AND (${camposBusca.join(' OR ')})`;
            }
        }

        const colunaOrdenacao = nomeCol ? `j.${nomeCol}` : 'j.id';
        query += ` ORDER BY ${colunaOrdenacao}`;

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

    const colunasJuizes = await getTableColumns(env, 'juizes');

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
        matricula: colunasJuizes.has('matricula') ? (payload.matricula || null) : undefined,
        sexo: colunasJuizes.has('sexo') ? payload.sexo : undefined,
        vara: colunasJuizes.has('vara') ? (payload.vara || payload.cargo || 'Vara Única').toUpperCase() : undefined,
        comarca: colunasJuizes.has('comarca') ? (payload.comarca || 'Capivari de Baixo').toUpperCase() : undefined,
        email: colunasJuizes.has('email') ? (payload.email ? payload.email.toLowerCase() : null) : undefined,
        titular: colunasJuizes.has('titular') ? (payload.titular || 'Não') : undefined,
        telefone: colunasJuizes.has('telefone') ? (payload.telefone || null) : undefined,
        status: colunasJuizes.has('status') ? (payload.status || 'Ativo') : undefined,
        observacoes: colunasJuizes.has('observacoes') ? (payload.observacoes ? payload.observacoes.toUpperCase() : null) : undefined
    };

    const campos = ['nome_completo'];
    const placeholders = ['?'];
    const valores = [insertData.nome_completo];

    const possiveisCampos = ['matricula', 'sexo', 'vara', 'comarca', 'email', 'titular', 'telefone', 'status', 'observacoes'];
    for (const campo of possiveisCampos) {
        if (insertData[campo] !== undefined) {
            campos.push(campo);
            placeholders.push('?');
            valores.push(insertData[campo]);
        }
    }

    const result = await env.DB.prepare(`
        INSERT INTO juizes (${campos.join(', ')}) VALUES (${placeholders.join(', ')})
    `).bind(...valores).run();

    const juiz = await env.DB.prepare('SELECT * FROM juizes WHERE id = ?').bind(result.meta.last_row_id).first();

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

    const colunasJuizes = await getTableColumns(env, 'juizes');

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
        const nomeAtualizado = (payload.nome || payload.nome_completo || '').toString().toUpperCase();
        updates.push('nome_completo = ?');
        values.push(nomeAtualizado);
    }
    if (payload.matricula !== undefined && colunasJuizes.has('matricula')) {
        updates.push('matricula = ?');
        values.push(payload.matricula || null);
    }
    if (payload.sexo !== undefined && colunasJuizes.has('sexo')) {
        updates.push('sexo = ?');
        values.push(payload.sexo || null);
    }
    if ((payload.vara !== undefined || payload.cargo !== undefined) && colunasJuizes.has('vara')) {
        updates.push('vara = ?');
        const varaAtualizada = (payload.vara || payload.cargo || '').toString().toUpperCase();
        values.push(varaAtualizada || 'VARA ÚNICA');
    }
    if (payload.comarca !== undefined && colunasJuizes.has('comarca')) {
        updates.push('comarca = ?');
        values.push(payload.comarca ? payload.comarca.toUpperCase() : 'CAPIVARI DE BAIXO');
    }
    if (payload.email !== undefined && colunasJuizes.has('email')) {
        updates.push('email = ?');
        values.push(payload.email ? payload.email.toLowerCase() : null);
    }
    if (payload.titular !== undefined && colunasJuizes.has('titular')) {
        updates.push('titular = ?');
        values.push(payload.titular);
    }
    if (payload.telefone !== undefined && colunasJuizes.has('telefone')) {
        updates.push('telefone = ?');
        values.push(payload.telefone || null);
    }
    if (payload.status !== undefined && colunasJuizes.has('status')) {
        updates.push('status = ?');
        values.push(payload.status);
    }
    if (payload.observacoes !== undefined && colunasJuizes.has('observacoes')) {
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

    const juiz = await env.DB.prepare('SELECT * FROM juizes WHERE id = ?').bind(id).first();

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
        nome: juiz.nome ?? juiz.nome_completo ?? null,
        nome_completo: juiz.nome_completo ?? juiz.nome ?? null,
        cargo: juiz.cargo ?? juiz.vara ?? null
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

