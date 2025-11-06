# 🧪 Teste do Endpoint de Login

## ✅ Status Atual

- ✅ API funcionando (`/api/test` retorna resposta válida)
- ✅ Binding DB configurado (`dbConfigured: true`)

## 🔍 Próximo Passo: Testar Login

Execute no console do navegador (F12):

```javascript
fetch('/api/auth/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
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
    console.log('Resposta completa:', text);
    try {
        const json = JSON.parse(text);
        console.log('JSON parseado:', json);
    } catch (e) {
        console.error('Erro ao parsear JSON:', e);
        console.error('Texto recebido:', text);
    }
})
.catch(error => {
    console.error('Erro na requisição:', error);
});
```

## 🔍 Verificar Usuário no Banco

No Console do D1, execute:

```sql
SELECT * FROM usuarios WHERE email = 'eduardo.rocha1000@gmail.com';
```

Se não retornar nada, crie o usuário:

```sql
INSERT INTO usuarios (nome, email, senha_hash, perfil)
VALUES ('Administrador', 'eduardo.rocha1000@gmail.com', 'hash-temporario-123', 'Administrador');
```

## 🔍 Verificar Logs

1. Acesse: https://dash.cloudflare.com/
2. Vá em **Workers & Pages > Pages > controle-jurados**
3. Clique em **Deployments**
4. Clique no último deployment
5. Vá em **Functions > Logs**
6. Procure por erros relacionados ao login

## 📋 Possíveis Resultados

### Se retornar erro 404:
- A rota `/api/auth/login` não está sendo encontrada
- Verifique se o arquivo `functions/api/auth/login.js` existe

### Se retornar erro 500:
- Verifique os logs no Cloudflare Dashboard
- Pode ser erro ao consultar o banco

### Se retornar erro 401:
- Usuário não encontrado no banco
- Crie o usuário no banco D1

### Se retornar resposta vazia:
- Verifique os logs
- Pode ser erro não tratado na função

