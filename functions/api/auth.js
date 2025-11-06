// Handler genérico para /api/auth
// Redireciona para /api/auth/login se o path for 'login'

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname.split('/').pop();
    
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    // Handle OPTIONS
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }
    
    // Se for login, redirecionar para o handler específico
    if (path === 'login' && request.method === 'POST') {
        // Importar e chamar o handler de login
        const loginHandler = await import('./auth/login.js');
        return await loginHandler.onRequestPost(context);
    }
    
    return new Response(JSON.stringify({ error: 'Rota não encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

