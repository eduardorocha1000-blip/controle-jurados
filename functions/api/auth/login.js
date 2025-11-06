// Handler específico para /api/auth/login
// Cloudflare Pages Functions usa estrutura de pastas para rotas

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
        console.log('Usuário encontrado:', { id: usuario.id, email: usuario.email });
        
        let token;
        try {
            token = await gerarToken(usuario, env);
            console.log('Token gerado com sucesso');
        } catch (tokenError) {
            console.error('Erro ao gerar token:', tokenError);
            throw new Error('Erro ao gerar token de autenticação');
        }
        
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
        
        // Adicionar detalhes apenas em desenvolvimento
        if (error.stack) {
            errorResponse.stack = error.stack;
        }
        
        return new Response(JSON.stringify(errorResponse), {
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
    // btoa pode não estar disponível no Cloudflare Workers, usar alternativa
    try {
        const jsonString = JSON.stringify(payload);
        // Usar TextEncoder/TextDecoder ou método compatível com Workers
        const tokenData = btoa ? btoa(jsonString) : Buffer.from(jsonString).toString('base64');
        return tokenData;
    } catch (e) {
        // Fallback: usar método manual de base64
        const jsonString = JSON.stringify(payload);
        const base64 = Buffer ? Buffer.from(jsonString).toString('base64') : 
            btoa ? btoa(jsonString) : 
            jsonString; // Se nada funcionar, retornar o JSON direto
        return base64;
    }
}

