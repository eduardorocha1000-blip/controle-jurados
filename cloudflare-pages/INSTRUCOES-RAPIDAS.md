# 🚀 Instruções Rápidas - Executar Schema no D1

## ⚠️ Problema: Console do D1 não aceita múltiplas queries

O Console do D1 no Cloudflare Dashboard só aceita **UMA query por vez**.

## ✅ Solução: Executar Manualmente no Console

### Passo 1: Acessar o Console do D1

1. Acesse: https://dash.cloudflare.com/
2. Vá em **Workers & Pages > D1**
3. Clique no seu banco (ou crie um novo chamado `controle-jurados-db`)
4. Clique em **Console**

### Passo 2: Executar Comandos Separadamente

Abra o arquivo: `cloudflare-pages/schema-comandos-individuais.sql`

**Execute CADA comando separadamente**, copiando e colando um por vez:

#### Comando 1: Tabela de usuários
```sql
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

#### Comando 2: Tabela de juízes
```sql
CREATE TABLE IF NOT EXISTS juizes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome_completo TEXT NOT NULL,
    matricula TEXT,
    sexo TEXT NOT NULL CHECK(sexo IN ('Masculino', 'Feminino')),
    vara TEXT DEFAULT 'Vara Única',
    comarca TEXT DEFAULT 'Capivari de Baixo',
    email TEXT,
    titular TEXT DEFAULT 'Não' CHECK(titular IN ('Sim', 'Não')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Comando 3: Tabela de instituições
```sql
CREATE TABLE IF NOT EXISTS instituicoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cnpj TEXT,
    contato_nome TEXT DEFAULT 'Sr.(a). Diretor' NOT NULL,
    contato_email TEXT NOT NULL,
    contato_telefone TEXT,
    endereco TEXT,
    cidade TEXT DEFAULT 'Capivari de Baixo',
    uf TEXT DEFAULT 'SC',
    cep TEXT DEFAULT '88745-000',
    ativo TEXT DEFAULT 'Sim' NOT NULL CHECK(ativo IN ('Sim', 'Não')),
    quantidade INTEGER DEFAULT 10 CHECK(quantidade >= 1 AND quantidade <= 99),
    observacoes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Continue com os outros comandos do arquivo `schema-comandos-individuais.sql`.

### Passo 3: Criar Primeiro Usuário

Após criar todas as tabelas, crie um usuário para testar:

```sql
INSERT INTO usuarios (nome, email, senha_hash, perfil)
VALUES ('Administrador', 'seu-email@exemplo.com', 'hash-temporario', 'Administrador');
```

**⚠️ IMPORTANTE**: Por enquanto, o sistema não valida senha (TODO no código). Use qualquer hash temporariamente para testar.

### Passo 4: Verificar se Funcionou

Execute no Console do D1:

```sql
SELECT name FROM sqlite_master WHERE type='table';
```

Você deve ver todas as tabelas listadas.

## 🔧 Alternativa: Usar Wrangler CLI

Se você tem o Wrangler CLI instalado e configurado:

```powershell
# Fazer login
wrangler login

# Executar schema (use --remote para banco remoto)
wrangler d1 execute controle-jurados-db --remote --file=./cloudflare-pages/schema-d1.sql
```

**Substitua `controle-jurados-db` pelo nome do seu banco D1.**

## 📋 Checklist

- [ ] Banco D1 criado no Cloudflare Dashboard
- [ ] Console do D1 aberto
- [ ] Tabela `usuarios` criada
- [ ] Tabela `juizes` criada
- [ ] Tabela `instituicoes` criada
- [ ] Tabela `jurados` criada
- [ ] Todas as outras tabelas criadas
- [ ] Índices criados
- [ ] Primeiro usuário criado
- [ ] Tabelas verificadas com `SELECT name FROM sqlite_master WHERE type='table';`

## 🆘 Problemas Comuns

### Erro: "no such table"
- Verifique se executou as tabelas na ordem correta
- Verifique se não esqueceu de executar alguma tabela

### Erro: "FOREIGN KEY constraint failed"
- Você está tentando criar uma tabela que depende de outra que ainda não existe
- Execute na ordem: usuarios, juizes, instituicoes, depois as outras

### Erro: "UNIQUE constraint failed"
- A tabela já existe, isso é normal se você executar novamente
- Use `CREATE TABLE IF NOT EXISTS` (já está no schema)

