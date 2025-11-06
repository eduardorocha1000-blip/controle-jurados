# ⚙️ Configuração do Cloudflare Pages

## 📋 Problema Resolvido

Os arquivos foram criados na raiz do projeto. Agora você precisa configurar o Cloudflare Pages corretamente.

## 🔧 Configuração no Cloudflare Dashboard

1. **Acesse o Cloudflare Dashboard**: https://dash.cloudflare.com/
2. **Vá em Workers & Pages > Pages**
3. **Selecione seu projeto** ou crie um novo
4. **Vá em Settings > Builds & deployments**
5. **Configure**:
   - **Build command**: *(deixe vazio)*
   - **Build output directory**: `dist` (sem o caminho completo, apenas `dist`)
   - **Root directory**: *(deixe vazio ou `/`)*

## 📁 Estrutura de Arquivos

Agora os arquivos estão na raiz do projeto:

```
Controle-jurados/
├── functions/              # ✅ Cloudflare Functions (API)
│   └── api/
│       ├── auth.js
│       ├── jurados.js
│       └── jurados/
│           └── [id].js
├── dist/                   # ✅ Arquivos estáticos (HTML, CSS, JS)
│   ├── index.html
│   ├── jurados.html
│   ├── js/
│   │   ├── auth.js
│   │   └── jurados.js
│   ├── css/               # ⚠️ Copie de public/css/
│   └── images/            # ⚠️ Copie de public/images/
├── public/                 # (seu projeto original)
└── ...
```

## ⚠️ Ações Necessárias

### 1. Copiar Arquivos Estáticos

Você precisa copiar os arquivos estáticos do projeto original:

```powershell
# No PowerShell, na raiz do projeto:
Copy-Item -Path "public\css\*" -Destination "dist\css\" -Recurse -Force
Copy-Item -Path "public\images\*" -Destination "dist\images\" -Recurse -Force
Copy-Item -Path "public\favicon.ico" -Destination "dist\" -Force
```

### 2. Criar Diretórios Faltantes

Se os diretórios não existirem:

```powershell
# Criar diretórios
New-Item -ItemType Directory -Path "dist\css" -Force
New-Item -ItemType Directory -Path "dist\js" -Force
New-Item -ItemType Directory -Path "dist\images" -Force
```

### 3. Configurar D1 Database

1. **Criar banco D1**:
   - Vá em **Workers & Pages > D1**
   - Clique em **Create database**
   - Nome: `controle-jurados-db`
   - **Copie o Database ID**

2. **Executar schema**:
   - Vá em **Workers & Pages > D1 > controle-jurados-db**
   - Clique em **Console**
   - Cole o conteúdo de `cloudflare-pages/schema.sql`
   - Execute

3. **Configurar binding**:
   - No projeto Pages, vá em **Settings > Functions**
   - Em **D1 Database Bindings**, clique em **Add binding**
   - **Variable name**: `DB` (exatamente assim)
   - **D1 database**: Selecione `controle-jurados-db`

## ✅ Verificação

Após configurar, verifique:

- ✅ Diretório `functions/` existe na raiz
- ✅ Diretório `dist/` existe na raiz
- ✅ Arquivos HTML estão em `dist/`
- ✅ Arquivos JS estão em `dist/js/`
- ✅ CSS e imagens foram copiados para `dist/`
- ✅ Build output directory está configurado como `dist`
- ✅ D1 Database foi criado e configurado
- ✅ Binding `DB` está configurado

## 🚀 Deploy

Após configurar tudo:

1. Faça commit e push:
```bash
git add .
git commit -m "Configuração Cloudflare Pages"
git push
```

2. O Cloudflare Pages fará deploy automaticamente

3. Verifique os logs no Dashboard se houver erros

## 🆘 Se Ainda Der Erro

Se ainda aparecer "Output directory not found":

1. Verifique se o diretório `dist/` existe na raiz do projeto
2. Verifique se há pelo menos um arquivo HTML em `dist/`
3. Verifique se o Build output directory está configurado como `dist` (sem caminho completo)
4. Tente fazer um novo deploy

