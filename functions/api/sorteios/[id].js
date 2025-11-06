// Handler para rotas específicas de sorteio (GET /api/sorteios/:id, PUT, DELETE)
export async function onRequestGet(context) {
    const { request, env, params } = context;
    const { id } = params;
    
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    try {
        const sorteio = await env.DB.prepare(`
            SELECT 
                s.*,
                j.nome_completo as juiz_nome
            FROM sorteios s
            LEFT JOIN juizes j ON s.juiz_responsavel_id = j.id
            WHERE s.id = ?
        `).bind(id).first();
        
        if (!sorteio) {
            return new Response(JSON.stringify({ error: 'Sorteio não encontrado' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        
        return new Response(JSON.stringify(sorteio), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Erro ao buscar sorteio:', error);
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
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

