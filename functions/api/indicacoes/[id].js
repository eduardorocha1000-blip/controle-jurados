// Handler para rotas específicas de indicação (GET /api/indicacoes/:id, PUT, DELETE)
export async function onRequestGet(context) {
    const { request, env, params } = context;
    const { id } = params;
    
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    try {
        const indicacao = await env.DB.prepare(`
            SELECT 
                i.*,
                inst.nome as instituicao_nome
            FROM indicacoes i
            LEFT JOIN instituicoes inst ON i.instituicao_id = inst.id
            WHERE i.id = ?
        `).bind(id).first();
        
        if (!indicacao) {
            return new Response(JSON.stringify({ error: 'Indicação não encontrada' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        
        return new Response(JSON.stringify(indicacao), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Erro ao buscar indicação:', error);
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
        const result = await env.DB.prepare('DELETE FROM indicacoes WHERE id = ?').bind(id).run();
        
        if (result.meta.changes === 0) {
            return new Response(JSON.stringify({ error: 'Indicação não encontrada' }), {
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

