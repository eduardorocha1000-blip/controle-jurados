// Handler genérico para /api/auth
// Lida com /api/auth/login diretamente

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
    
    // Se for login, processar diretamente
    if (path === 'login' && request.method === 'POST') {
        return await fazerLogin(request, env, corsHeaders);
    }
    
    return new Response(JSON.stringify({ error: 'Rota não encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

// Fazer login
async function fazerLogin(request, env, corsHeaders) {
    try {
        // Verificar se o banco está disponível
        if (!env.DB) {
            return new Response(JSON.stringify({ 
                error: 'Banco de dados não configurado. Configure o binding DB no Cloudflare Pages.' 
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        
        // Verificar se o body pode ser parseado
        let email, senha;
        try {
            const body = await request.json();
            email = body.email;
            senha = body.senha;
        } catch (parseError) {
            console.error('Erro ao parsear JSON:', parseError);
            return new Response(JSON.stringify({ 
                error: 'Formato de requisição inválido. Envie JSON válido.' 
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        
        if (!email || !senha) {
            return new Response(JSON.stringify({ error: 'Email e senha são obrigatórios' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        
        // Buscar usuário no banco
        console.log('Buscando usuário no banco:', email);
        let usuario;
        try {
            const result = await env.DB.prepare(
                'SELECT * FROM usuarios WHERE email = ?'
            ).bind(email).first();
            
            usuario = result;
            console.log('Resultado da consulta:', usuario ? 'Usuário encontrado' : 'Usuário não encontrado');
        } catch (dbError) {
            console.error('Erro ao consultar banco:', dbError);
            return new Response(JSON.stringify({ 
                error: 'Erro ao acessar banco de dados.',
                details: dbError.message
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        
        if (!usuario) {
            console.log('Usuário não encontrado para email:', email);
            return new Response(JSON.stringify({ error: 'Email ou senha inválidos' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        
        // Gerar token
        console.log('Usuário encontrado:', { id: usuario.id, email: usuario.email });
        
        const payload = {
            id: usuario.id,
            email: usuario.email,
            perfil: usuario.perfil,
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
        };
        
        const jsonString = JSON.stringify(payload);
        const token = btoa(jsonString);
        
        console.log('Token gerado com sucesso');
        
        // Retornar token e dados do usuário
        const responseData = {
            token,
            user: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                perfil: usuario.perfil
            }
        };
        
        console.log('Retornando resposta de sucesso');
        
        return new Response(JSON.stringify(responseData), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Erro no login:', error);
        console.error('Stack:', error.stack);
        
        return new Response(JSON.stringify({
            error: error.message || 'Erro interno do servidor',
            type: error.name || 'UnknownError'
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}


