# 🔍 Diagnóstico: Erro "Unexpected end of JSON input"

## ⚠️ Problema

O erro "Failed to execute 'json' on 'Response': Unexpected end of JSON input" indica que a API está retornando uma resposta vazia ou inválida.

## 🔧 Verificações Necessárias

### 1. Verificar se o Binding DB está Configurado

**No Cloudflare Dashboard:**
1. Acesse: https://dash.cloudflare.com/
2. Vá em **Workers & Pages > Pages > Seu Projeto**
3. Vá em **Settings > Functions**
4. Verifique se há um binding chamado **`DB`** (exatamente assim, maiúsculo)
5. Se não houver, clique em **Add binding**:
   - **Variable name**: `DB`
   - **D1 database**: Selecione seu banco D1

### 2. Verificar se o Usuário Existe no Banco

No Console do D1, execute:

```sql
SELECT * FROM usuarios WHERE email = 'eduardo.rocha1000@gmail.com';
```

Se não retornar nada, crie o usuário:

```sql
INSERT INTO usuarios (nome, email, senha_hash, perfil)
VALUES ('Administrador', 'eduardo.rocha1000@gmail.com', 'hash-temporario-123', 'Administrador');
```

### 3. Testar a API Diretamente

Abra o console do navegador (F12) e execute:

```javascript
// Testar endpoint de teste
fetch('/api/test')
    .then(r => r.text())
    .then(console.log)
    .catch(console.error);

// Testar endpoint de login
fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        email: 'eduardo.rocha1000@gmail.com',
        senha: 'qualquer-senha'
    })
})
.then(r => {
    console.log('Status:', r.status);
    console.log('Headers:', [...r.headers.entries()]);
    return r.text(); // Use .text() primeiro para ver a resposta
})
.then(text => {
    console.log('Resposta:', text);
    try {
        const json = JSON.parse(text);
        console.log('JSON:', json);
    } catch (e) {
        console.error('Erro ao parsear JSON:', e);
    }
})
.catch(console.error);
```

### 4. Verificar Logs no Cloudflare

1. Acesse o Cloudflare Dashboard
2. Vá em **Workers & Pages > Pages > Seu Projeto**
3. Clique em **Deployments**
4. Clique no último deployment
5. Vá em **Functions > Logs**
6. Procure por erros relacionados ao login

### 5. Verificar Estrutura de Arquivos

A estrutura deve estar assim:

```
functions/
└── api/
    ├── auth/
    │   └── login.js    ✅ Deve existir
    ├── auth.js         ⚠️ Pode causar conflito
    └── test.js         ✅ Criado para teste
```

Se `auth.js` estiver causando conflito, você pode removê-lo ou renomeá-lo.

## 🚀 Soluções

### Solução 1: Verificar Binding DB

O problema mais comum é o binding DB não estar configurado. Verifique isso primeiro.

### Solução 2: Fazer Deploy Novamente

Após configurar o binding:
1. Vá em **Deployments**
2. Clique em **Retry deployment**
3. Aguarde o deploy terminar
4. Teste novamente

### Solução 3: Verificar Logs

Os logs mostrarão o erro exato. Verifique:
- Se o binding DB está disponível
- Se há erros ao consultar o banco
- Se há erros de sintaxe na função

### Solução 4: Testar Endpoint de Teste

Acesse: `https://seu-projeto.pages.dev/api/test`

Você deve ver:
```json
{
    "message": "API funcionando!",
    "timestamp": "...",
    "dbConfigured": true,
    "path": "..."
}
```

Se `dbConfigured` for `false`, o binding DB não está configurado.

## 📋 Checklist de Diagnóstico

- [ ] Binding `DB` configurado no Cloudflare Pages
- [ ] Deploy feito após configurar o binding
- [ ] Usuário existe no banco D1
- [ ] Endpoint `/api/test` retorna resposta válida
- [ ] Logs verificados no Cloudflare Dashboard
- [ ] Estrutura de arquivos correta

## 🆘 Se Nada Funcionar

1. Verifique os logs no Cloudflare Dashboard
2. Teste o endpoint `/api/test` para ver se as Functions estão funcionando
3. Verifique se o binding DB está configurado corretamente
4. Verifique se o usuário existe no banco
5. Tente fazer um novo deploy

## 💡 Dica

O erro "Unexpected end of JSON input" geralmente significa que:
- A API retornou uma resposta vazia
- A API retornou HTML em vez de JSON (erro 404/500)
- A API não está sendo encontrada (rota errada)

Use o endpoint `/api/test` para verificar se as Functions estão funcionando antes de testar o login.

