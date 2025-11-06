# Sistema de Controle de Jurados - TJSC

Sistema web completo para controle de jurados da Comarca de Capivari de Baixo, desenvolvido para o Tribunal de Justiça de Santa Catarina (TJSC).

## 📋 Funcionalidades

### ✅ Principais Recursos
- **Gestão de Juízes**: Cadastro completo de juízes com informações detalhadas
- **Gestão de Jurados**: CRUD completo com validações e importação CSV
- **Gestão de Instituições**: Cadastro de instituições que indicam jurados
- **Sistema de Sorteios**: Criação e gerenciamento de sorteios para júris
- **Geração de Cédulas**: Impressão e exportação PDF de cédulas de sorteio
- **Editais RTF**: Geração automática de editais em formato RTF
- **Sistema de E-mails**: Envio de intimações para instituições
- **Relatórios**: Diversos relatórios com exportação CSV/PDF
- **Backup/Restore**: Sistema completo de backup e restauração
- **Auditoria**: Rastreamento de todas as operações do sistema

### 🎯 Características Técnicas
- **Interface Responsiva**: Funciona em desktop e mobile
- **Máscaras Automáticas**: CPF, telefone, CNPJ, CEP
- **Validações Robustas**: Server-side e client-side
- **Segurança**: Autenticação, rate limiting, sanitização
- **Acessibilidade**: Conforme padrões WCAG AA

## 🚀 Instalação e Configuração

### Pré-requisitos
- Node.js 20+
- npm ou yarn
- SQLite3

### 1. Clone o repositório
```bash
git clone <url-do-repositorio>
cd Controle-jurados
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente
```bash
cp env.example .env
```

Edite o arquivo `.env` com suas configurações:
```env
# Configurações do Banco de Dados
DB_CLIENT=sqlite3
DB_FILENAME=./database/controle_jurados.db

# Configurações da Aplicação
NODE_ENV=development
PORT=3000
SESSION_SECRET=sua_chave_secreta_aqui

# Configurações de E-mail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASS=sua_senha_app_gmail
SMTP_FROM=Vara Única <vara@tjsc.jus.br>

# URL da Aplicação
APP_URL=http://localhost:3000
```

### 4. Execute as migrações
```bash
npm run migrate
```

### 5. Execute os seeds (dados de exemplo)
```bash
npm run seed
```

### 6. Inicie o servidor
```bash
npm run dev
```

O sistema estará disponível em: `http://localhost:3000`

## 🔐 Acesso Inicial

**Usuário padrão:**
- Email: `admin@tjsc.jus.br`
- Senha: `password`

⚠️ **IMPORTANTE**: Altere a senha padrão após o primeiro acesso!

## 📁 Estrutura do Projeto

```
Controle-jurados/
├── config/
│   └── database.js          # Configuração do banco
├── database/
│   ├── migrations/          # Migrações do banco
│   └── seeds/              # Dados iniciais
├── models/                 # Modelos de dados
│   ├── Usuario.js
│   ├── Juiz.js
│   ├── Instituicao.js
│   ├── Jurado.js
│   ├── Sorteio.js
│   └── Edital.js
├── routes/                 # Rotas da aplicação
│   ├── auth.js
│   ├── dashboard.js
│   ├── juizes.js
│   ├── instituicoes.js
│   ├── jurados.js
│   ├── sorteios.js
│   ├── cedulas.js
│   ├── editais.js
│   ├── emails.js
│   ├── relatorios.js
│   ├── backup.js
│   └── api.js
├── services/              # Serviços
│   └── EmailService.js
├── views/                 # Templates EJS
│   ├── layout.ejs
│   ├── auth/
│   ├── dashboard/
│   ├── juizes/
│   ├── instituicoes/
│   ├── jurados/
│   ├── sorteios/
│   ├── cedulas/
│   ├── editais/
│   ├── emails/
│   ├── relatorios/
│   └── backup/
├── public/                # Arquivos estáticos
├── uploads/               # Uploads de arquivos
├── logs/                  # Logs do sistema
├── backups/               # Backups automáticos
├── package.json
├── knexfile.js
├── server.js
└── README.md
```

## 🎮 Como Usar

### 1. Cadastro de Juízes
- Acesse **Juízes** → **Novo Juiz**
- Preencha os dados obrigatórios
- Apenas um juiz pode ser marcado como "Titular"

### 2. Cadastro de Instituições
- Acesse **Instituições** → **Nova Instituição**
- Configure a quantidade de nomes solicitados
- Instituições ativas recebem intimações por e-mail

### 3. Cadastro de Jurados
- Acesse **Jurados** → **Novo Jurado**
- Todos os campos de texto são convertidos para maiúsculo
- CPF é validado automaticamente
- Idade é calculada automaticamente

### 4. Importação em Massa
- Acesse **Jurados** → **Importar CSV**
- Use separador `;` (ponto e vírgula)
- Campos obrigatórios: nome_completo, cpf, sexo, endereco, numero, bairro, profissao

### 5. Criação de Sorteios
- Acesse **Sorteios** → **Novo Sorteio**
- Configure data do júri e juiz responsável
- Adicione jurados titulares e suplentes manualmente
- Gere cédulas para impressão

### 6. Geração de Editais
- Acesse **Editais** → **Novo Edital**
- Preencha os dados do edital
- Gere o arquivo RTF para publicação

### 7. Envio de E-mails
- Acesse **E-mails** → **Envio em Lote**
- Selecione as instituições ativas
- Configure ano e quantidade de nomes
- Envie intimações automaticamente

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev          # Inicia servidor com nodemon

# Produção
npm start           # Inicia servidor em produção

# Banco de dados
npm run migrate     # Executa migrações
npm run seed        # Executa seeds

# Testes
npm test           # Executa testes
```

## 📊 Relatórios Disponíveis

1. **Jurados por Situação**: Lista jurados ativos/inativos
2. **Quantitativo por Instituição**: Estatísticas de indicações
3. **Sorteios**: Relatório completo de sorteios
4. **Editais**: Histórico de editais gerados

Todos os relatórios podem ser exportados em CSV.

## 🔒 Segurança

- **Autenticação**: Sistema de login com sessões
- **Rate Limiting**: Proteção contra ataques de força bruta
- **Sanitização**: Proteção contra XSS e SQL Injection
- **Validação**: Validação server-side de todos os dados
- **CORS**: Configuração adequada de CORS
- **Helmet**: Headers de segurança

## 📧 Configuração de E-mail

Para configurar o envio de e-mails:

1. **Gmail**: Use senha de aplicativo
2. **Outlook**: Configure SMTP do Office 365
3. **Servidor próprio**: Configure SMTP interno

### Exemplo Gmail:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASS=sua_senha_de_aplicativo
```

## 🗄️ Backup e Restauração

### Fazer Backup
1. Acesse **Backup** → **Fazer Backup**
2. Escolha nome e local do arquivo
3. O sistema criará um ZIP com todos os dados

### Restaurar Backup
1. Acesse **Backup** → **Restaurar Backup**
2. Selecione o arquivo de backup
3. Confirme a restauração

⚠️ **ATENÇÃO**: A restauração substitui todos os dados atuais!

## 🐛 Solução de Problemas

### Erro de conexão com banco
```bash
# Verifique se o arquivo .env está configurado
# Execute as migrações novamente
npm run migrate
```

### Erro de e-mail
```bash
# Verifique as credenciais SMTP
# Teste com um e-mail simples primeiro
```

### Problemas de permissão
```bash
# No Linux/Mac, ajuste permissões
chmod 755 uploads/
chmod 755 backups/
chmod 755 logs/
```

## 📝 Logs

Os logs são salvos em:
- `logs/app.log` - Logs gerais da aplicação
- Console - Logs em tempo real durante desenvolvimento

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 👨‍💻 Desenvolvedor

**Eduardo Motta Rocha da Silva**
- Vara Única da Comarca de Capivari de Baixo
- Tribunal de Justiça de Santa Catarina

## 📞 Suporte

Para suporte técnico ou dúvidas sobre o sistema, entre em contato através dos canais oficiais do TJSC.

---

**Sistema desenvolvido especificamente para o Tribunal de Justiça de Santa Catarina - Comarca de Capivari de Baixo**
