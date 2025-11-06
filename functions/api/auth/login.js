// Handler para /api/auth/login
// Cloudflare Pages Functions mapeia /api/auth/login para functions/api/auth/login.js

export async function onRequestPost(context) {
    const { request, env } = context;
    
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    // Handle OPTIONS
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }
    
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
            console.error('Erro detalhado:', dbError.message, dbError.stack);
            return new Response(JSON.stringify({ 
                error: 'Erro ao acessar banco de dados. Verifique se o schema foi criado corretamente.',
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
        
        // Gerar token JWT (simplificado)
        console.log('Usuário encontrado:', { id: usuario.id, email: usuario.email });
        
        const payload = {
            id: usuario.id,
            email: usuario.email,
            perfil: usuario.perfil,
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 horas
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
        console.error('DB disponível?', !!env.DB);
        
        // Sempre retornar uma resposta válida JSON
        const errorResponse = {
            error: error.message || 'Erro interno do servidor',
            type: error.name || 'UnknownError'
        };
        
        if (error.stack) {
            errorResponse.stack = error.stack;
        }
        
        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

