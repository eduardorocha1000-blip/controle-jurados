// Handler para rotas específicas de jurado (GET /api/jurados/:id, PUT, DELETE)
export async function onRequestGet(context) {
    const { request, env, params } = context;
    const { id } = params;
    
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    try {
        const jurado = await env.DB.prepare(
            'SELECT j.*, i.nome as instituicao_nome FROM jurados j LEFT JOIN instituicoes i ON j.instituicao_id = i.id WHERE j.id = ?'
        ).bind(id).first();
        
        if (!jurado) {
            return new Response(JSON.stringify({ error: 'Jurado não encontrado' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        
        return new Response(JSON.stringify(jurado), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Erro ao buscar jurado:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

export async function onRequestPut(context) {
    const { request, env, params } = context;
    const { id } = params;
    const data = await request.json();
    
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    try {
        // Implementar atualização similar ao arquivo jurados.js
        // Por enquanto, redirecionar para o handler principal
        return new Response(JSON.stringify({ message: 'Use PUT /api/jurados/:id via jurados.js' }), {
            status: 501,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

export async function onRequestDelete(context) {
    const { request, env, params } = context;
    const { id } = params;
    
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    try {
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
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

