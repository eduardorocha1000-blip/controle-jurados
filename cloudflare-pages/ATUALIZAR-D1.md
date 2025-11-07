# Atualizar o banco D1 para a mesma estrutura do projeto original

O ambiente Cloudflare utiliza o banco D1 (compatível com SQLite). Para que todas as APIs funcionem igual ao projeto Express que roda no seu PC, o schema do D1 precisa seguir exatamente as tabelas/colunas definidas em `database/migrations`.

## 1. Instale/atualize o Wrangler

```powershell
npm install -g wrangler@latest
```

## 2. Faça login no Cloudflare

```powershell
wrangler login
```

## 3. Execute o script de reset do schema

> ⚠️ **Atenção:** o arquivo recria TODAS as tabelas. Todos os dados do D1 serão apagados. Faça backup antes se precisar.

```powershell
wrangler d1 execute <NOME_DO_BANCO_D1> \
  --remote \
  --file ./cloudflare-pages/d1-reset-schema.sql
```

Substitua `<NOME_DO_BANCO_D1>` pelo identificador configurado em `wrangler.toml` (por exemplo `controle_jurados_db`).

## 4. Popular dados (opcional)

Se quiser carregar dados de exemplo, execute os scripts que você usava localmente (por exemplo os seeds do projeto original) adaptando-os para o D1.

## 5. Reimplante o projeto (Pages)

Depois que o schema estiver alinhado, faça um novo deploy das Pages para garantir que as funções usem as colunas corretas:

```powershell
wrangler pages deploy dist --project-name=<NOME_DO_PROJECT>
```

## Resultado esperado

Após a execução, as tabelas `juizes`, `editais`, `sorteios`, `cedulas` (e demais) passam a ter as mesmas colunas do projeto original (`nome_completo`, `titulo`, `data_publicacao_prevista` etc.), resolvendo erros 500 do tipo `no such column`.

