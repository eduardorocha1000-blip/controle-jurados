# 📝 Como Executar o Schema no Cloudflare D1

## ⚠️ Problema

O Console do D1 não aceita múltiplas queries de uma vez. Você precisa executar cada comando separadamente.

## ✅ Solução 1: Executar no Console (Manual)

1. Acesse o **Cloudflare Dashboard**
2. Vá em **Workers & Pages > D1 > Seu Banco**
3. Clique em **Console**
4. Execute **UMA query por vez**, copiando e colando cada comando do arquivo `schema-d1.sql`

**Exemplo:**
```sql
-- Cole e execute este primeiro:
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL,
    perfil TEXT DEFAULT 'servidor',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Depois execute o próximo, e assim por diante.

## ✅ Solução 2: Usar Wrangler CLI (Recomendado)

Se você tem o Wrangler CLI instalado, pode executar tudo de uma vez:

```powershell
# Instalar Wrangler (se ainda não tiver)
npm install -g wrangler

# Fazer login no Cloudflare
wrangler login

# Executar o schema
wrangler d1 execute controle-jurados-db --file=./cloudflare-pages/schema-d1.sql
```

**Substitua `controle-jurados-db` pelo nome do seu banco D1.**

## ✅ Solução 3: Script PowerShell (Automático)

Criei um script que executa cada comando separadamente. Execute:

```powershell
cd "C:\Users\cliente\Desktop\Controle-jurados-Server\Controle-jurados"
.\cloudflare-pages\executar-schema.ps1
```

## 📋 Ordem de Execução

Execute as tabelas nesta ordem (devido às foreign keys):

1. ✅ `usuarios`
2. ✅ `juizes`
3. ✅ `instituicoes`
4. ✅ `jurados` (depende de `instituicoes`)
5. ✅ `indicacoes` (depende de `instituicoes`)
6. ✅ `sorteios` (depende de `juizes`)
7. ✅ `sorteio_jurados` (depende de `sorteios` e `jurados`)
8. ✅ `cedulas` (depende de `sorteios` e `jurados`)
9. ✅ `editais`
10. ✅ `notificacoes_email` (depende de `instituicoes`)
11. ✅ `ultimo_conselho` (depende de `sorteios` e `jurados`)
12. ✅ `auditoria` (depende de `usuarios`)
13. ✅ Índices (pode executar todos juntos)

## 🧪 Verificar se Funcionou

Após executar, verifique se as tabelas foram criadas:

```sql
-- No Console do D1, execute:
SELECT name FROM sqlite_master WHERE type='table';
```

Você deve ver todas as tabelas listadas.

## 👤 Criar Primeiro Usuário

Após criar as tabelas, crie um usuário para testar o login:

```sql
-- No Console do D1, execute:
INSERT INTO usuarios (nome, email, senha_hash, perfil)
VALUES ('Administrador', 'seu-email@exemplo.com', 'hash-temporario', 'Administrador');
```

**⚠️ IMPORTANTE**: Por enquanto, o sistema não valida senha (TODO no código). Use qualquer hash temporariamente para testar. Em produção, você precisará implementar bcrypt.

## 🆘 Problemas Comuns

### Erro: "no such table"
- Verifique se executou as tabelas na ordem correta
- Verifique se não esqueceu de executar alguma tabela

### Erro: "UNIQUE constraint failed"
- A tabela já existe, isso é normal se você executar novamente
- Use `CREATE TABLE IF NOT EXISTS` (já está no schema)

### Erro: "FOREIGN KEY constraint failed"
- Você está tentando criar uma tabela que depende de outra que ainda não existe
- Execute na ordem correta

