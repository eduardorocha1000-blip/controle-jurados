# ✅ Próximos Passos Após Criar o Schema

## 1️⃣ Verificar se as Tabelas Foram Criadas

No Console do D1, execute:

```sql
SELECT name FROM sqlite_master WHERE type='table';
```

Você deve ver todas as tabelas listadas:
- usuarios
- juizes
- instituicoes
- jurados
- indicacoes
- sorteios
- sorteio_jurados
- cedulas
- editais
- notificacoes_email
- ultimo_conselho
- auditoria

## 2️⃣ Criar Primeiro Usuário

No Console do D1, execute:

```sql
INSERT INTO usuarios (nome, email, senha_hash, perfil)
VALUES ('Administrador', 'eduardo.rocha1000@gmail.com', 'hash-temporario-123', 'Administrador');
```

**⚠️ IMPORTANTE**: Por enquanto, o sistema não valida senha (TODO no código). Use qualquer hash temporariamente para testar. Em produção, você precisará implementar bcrypt.

## 3️⃣ Configurar Binding DB no Cloudflare Pages

1. Acesse: https://dash.cloudflare.com/
2. Vá em **Workers & Pages > Pages**
3. Clique no seu projeto
4. Vá em **Settings > Functions**
5. Em **D1 Database Bindings**, clique em **Add binding**:
   - **Variable name**: `DB` (exatamente assim, maiúsculo)
   - **D1 database**: Selecione seu banco D1 (`controle-jurados-db` ou o nome que você usou)
6. Clique em **Save**

## 4️⃣ Fazer Deploy Novamente

Após configurar o binding:

1. No projeto Pages, vá em **Deployments**
2. Clique em **Retry deployment** no último deployment
3. Ou faça um novo commit e push (o deploy será automático)

## 5️⃣ Testar o Login

1. Acesse a URL do seu projeto Pages (ex: `https://controle-jurados.pages.dev`)
2. Tente fazer login com:
   - **Email**: `eduardo.rocha1000@gmail.com` (ou o email que você usou)
   - **Senha**: Qualquer senha (por enquanto não valida)

## 6️⃣ Verificar Logs (se houver erro)

Se o login não funcionar:

1. No Cloudflare Dashboard, vá em **Workers & Pages > Pages > Seu Projeto**
2. Clique em **Deployments**
3. Clique no último deployment
4. Vá em **Functions > Logs**
5. Verifique os erros

## 📋 Checklist Final

- [ ] Tabelas criadas e verificadas
- [ ] Primeiro usuário criado no banco
- [ ] Binding `DB` configurado no Cloudflare Pages
- [ ] Deploy feito novamente
- [ ] Login testado
- [ ] Logs verificados (se necessário)

## 🆘 Se o Login Ainda Não Funcionar

1. Verifique se o binding `DB` está configurado corretamente
2. Verifique se o usuário existe no banco:
   ```sql
   SELECT * FROM usuarios WHERE email = 'seu-email@exemplo.com';
   ```
3. Verifique os logs no Cloudflare Dashboard
4. Verifique se o deploy foi feito após configurar o binding

## 💡 Dica

Se você mudar algo no código ou configuração, sempre faça um novo deploy para que as mudanças sejam aplicadas.

