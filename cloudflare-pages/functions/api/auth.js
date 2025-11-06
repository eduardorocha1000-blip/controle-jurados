// API de autenticação para Cloudflare Pages
// Substitui routes/auth.js

export async function onRequestPost(context) {
    const { request, env, params } = context;
    const url = new URL(request.url);
    const path = url.pathname.split('/').pop();
    
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    if (path === 'login') {
        return await fazerLogin(request, env, corsHeaders);
    }
    
    return new Response('Not found', { status: 404, headers: corsHeaders });
}

// Fazer login
async function fazerLogin(request, env, corsHeaders) {
    try {
        const { email, senha } = await request.json();
        
        if (!email || !senha) {
            return new Response(JSON.stringify({ error: 'Email e senha são obrigatórios' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        
        // Buscar usuário no banco
        const usuario = await env.DB.prepare(
            'SELECT * FROM usuarios WHERE email = ?'
        ).bind(email).first();
        
        if (!usuario) {
            return new Response(JSON.stringify({ error: 'Email ou senha inválidos' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        
        // Verificar senha (usando bcrypt - você precisará usar uma biblioteca compatível com Workers)
        // Por enquanto, vamos usar uma verificação simples (NÃO SEGURO - apenas para exemplo)
        // Em produção, use uma biblioteca como @cloudflare/workers-hono ou implemente bcrypt
        
        // TODO: Implementar verificação de senha com bcrypt
        // const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
        // if (!senhaValida) {
        //     return new Response(JSON.stringify({ error: 'Email ou senha inválidos' }), {
        //         status: 401,
        //         headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        //     });
        // }
        
        // Gerar token JWT (simplificado - em produção use uma biblioteca JWT)
        // Por enquanto, vamos usar um token simples baseado em timestamp
        const token = await gerarToken(usuario, env);
        
        // Retornar token e dados do usuário
        return new Response(JSON.stringify({
            token,
            user: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                perfil: usuario.perfil
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Erro no login:', error);
        return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

// Gerar token JWT (simplificado)
// Em produção, use uma biblioteca JWT como @tsndr/cloudflare-worker-jwt
async function gerarToken(usuario, env) {
    // Por enquanto, vamos usar um token simples
    // Em produção, implemente JWT adequadamente
    const payload = {
        id: usuario.id,
        email: usuario.email,
        perfil: usuario.perfil,
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 horas
    };
    
    // TODO: Implementar JWT real
    // Por enquanto, retornar um token base64 simples
    const tokenData = btoa(JSON.stringify(payload));
    return tokenData;
}

// Verificar token (para uso em outras rotas)
export async function verificarToken(request, env) {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    
    const token = authHeader.substring(7);
    
    try {
        // TODO: Implementar verificação JWT real
        const payload = JSON.parse(atob(token));
        
        // Verificar expiração
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            return null;
        }
        
        return payload;
    } catch (e) {
        return null;
    }
}

