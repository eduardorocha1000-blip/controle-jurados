// Handler para rotas específicas de edital (GET /api/editais/:id, PUT, DELETE)
export async function onRequestGet(context) {
    const { request, env, params } = context;
    const { id } = params;
    
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    try {
        const edital = await env.DB.prepare(`
            SELECT 
                e.*,
                j.nome as juiz_nome
            FROM editais e
            LEFT JOIN juizes j ON e.juiz_id = j.id
            WHERE e.id = ?
        `).bind(id).first();
        
        if (!edital) {
            return new Response(JSON.stringify({ error: 'Edital não encontrado' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        
        return new Response(JSON.stringify(edital), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Erro ao buscar edital:', error);
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
        const result = await env.DB.prepare('DELETE FROM editais WHERE id = ?').bind(id).run();
        
        if (result.meta.changes === 0) {
            return new Response(JSON.stringify({ error: 'Edital não encontrado' }), {
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

