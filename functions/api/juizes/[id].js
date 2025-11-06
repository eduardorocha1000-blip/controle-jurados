// Handler para rotas específicas de juiz (GET /api/juizes/:id, PUT, DELETE)
export async function onRequestGet(context) {
    const { request, env, params } = context;
    const { id } = params;
    
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    try {
        const juiz = await env.DB.prepare(
            'SELECT * FROM juizes WHERE id = ?'
        ).bind(id).first();
        
        if (!juiz) {
            return new Response(JSON.stringify({ error: 'Juiz não encontrado' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        
        return new Response(JSON.stringify(juiz), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Erro ao buscar juiz:', error);
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
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

