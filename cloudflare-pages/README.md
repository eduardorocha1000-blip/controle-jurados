# Sistema de Controle de Jurados - Cloudflare Pages

Versão adaptada do sistema de controle de jurados para funcionar no Cloudflare Pages.

## 📁 Estrutura de Arquivos

```
cloudflare-pages/
├── dist/                      # Arquivos estáticos (HTML, CSS, JS)
│   ├── index.html            # Página de login
│   ├── jurados.html          # Lista de jurados
│   ├── css/                  # Estilos (copiar de public/css/)
│   ├── js/                   # JavaScript do frontend
│   │   ├── auth.js          # Autenticação
│   │   └── jurados.js       # Lógica de jurados
│   └── images/              # Imagens (copiar de public/images/)
├── functions/                # Cloudflare Functions (API)
│   └── api/
│       ├── auth.js          # API de autenticação
│       └── jurados.js       # API de jurados
├── schema.sql                # Schema do banco D1
├── wrangler.toml             # Configuração do Cloudflare
├── GUIA-MIGRACAO.md          # Guia completo de migração
└── README.md                 # Este arquivo
```

## 🚀 Início Rápido

1. **Leia o guia completo**: Abra `GUIA-MIGRACAO.md` para instruções detalhadas

2. **Criar banco D1**: 
   - Acesse o Cloudflare Dashboard
   - Crie um banco D1 chamado `controle-jurados-db`
   - Execute o `schema.sql` no banco

3. **Configurar projeto**:
   - Crie um projeto no Cloudflare Pages
   - Configure o binding do D1 (`DB`)
   - Faça deploy

## 📝 Próximos Passos

1. **Copiar arquivos estáticos**:
   - Copie `public/css/style.css` para `dist/css/`
   - Copie `public/images/` para `dist/images/`
   - Copie `public/favicon.ico` para `dist/`

2. **Converter todas as views**:
   - Converta todas as views EJS para HTML/JS
   - Siga o exemplo de `jurados.html` e `jurados.js`

3. **Migrar todas as rotas**:
   - Converta todas as rotas Express para Cloudflare Functions
   - Siga o exemplo de `functions/api/jurados.js`

4. **Implementar autenticação JWT**:
   - Complete a implementação de JWT em `functions/api/auth.js`
   - Use uma biblioteca JWT compatível com Workers

5. **Migrar dados**:
   - Exporte dados do SQLite
   - Importe no D1

## ⚠️ Importante

- O sistema original usa **Express.js** e **SQLite**
- A versão Cloudflare usa **Cloudflare Workers** e **D1**
- A autenticação muda de **sessões** para **JWT**
- As views **EJS** precisam ser convertidas para **HTML/JS**

## 🔧 Funcionalidades Implementadas

- ✅ Estrutura básica do projeto
- ✅ Schema do banco D1
- ✅ API de jurados (GET, POST, PUT, DELETE)
- ✅ Exemplo de frontend (HTML/JS)
- ✅ Sistema de autenticação básico (JWT)

## 📚 Funcionalidades a Implementar

- ⏳ Todas as outras rotas (juízes, instituições, sorteios, etc.)
- ⏳ Conversão de todas as views EJS
- ⏳ Upload de arquivos (fotos, PDFs)
- ⏳ Geração de relatórios
- ⏳ Sistema de emails
- ⏳ Backup/restore

## 🆘 Suporte

Consulte o `GUIA-MIGRACAO.md` para instruções detalhadas e troubleshooting.

## 📄 Licença

MIT - Mesma licença do projeto original

