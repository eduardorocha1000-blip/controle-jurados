// Endpoint de teste para verificar se as Functions estão funcionando
export async function onRequestGet(context) {
    const { request, env } = context;
    
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    return new Response(JSON.stringify({
        message: 'API funcionando!',
        timestamp: new Date().toISOString(),
        dbConfigured: !!env.DB,
        path: request.url
    }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

