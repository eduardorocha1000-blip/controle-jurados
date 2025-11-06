# ✅ SISTEMA DE CONTROLE DE JURADOS - INSTALAÇÃO CONCLUÍDA

## 🎉 Status: FUNCIONANDO PERFEITAMENTE!

O sistema está rodando em: **http://localhost:3000**

## 🔐 Credenciais de Acesso
- **Email**: admin@tjsc.jus.br
- **Senha**: password

⚠️ **IMPORTANTE**: Altere a senha padrão após o primeiro acesso!

## 🚀 Próximos Passos

### 1. Configurar E-mail (Opcional)
Edite o arquivo `.env` e configure suas credenciais SMTP:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASS=sua_senha_app_gmail
```

### 2. Personalizar Logo
Substitua o arquivo `public/images/logo-tjsc.png` pela imagem real do TJSC.

### 3. Configurar Produção
Para produção, altere no `.env`:
```env
NODE_ENV=production
SESSION_SECRET=sua_chave_muito_segura_aqui
```

## 📋 Funcionalidades Disponíveis

✅ **Dashboard** - Visão geral do sistema
✅ **Juízes** - Cadastro e gestão de juízes
✅ **Instituições** - Cadastro de instituições indicadoras
✅ **Jurados** - CRUD completo com importação CSV
✅ **Sorteios** - Criação e gerenciamento de sorteios
✅ **Cédulas** - Geração e impressão de cédulas
✅ **Editais** - Geração de editais em RTF
✅ **E-mails** - Envio de intimações
✅ **Relatórios** - Diversos relatórios com exportação
✅ **Backup** - Sistema completo de backup/restore

## 🛠️ Comandos Úteis

```bash
# Desenvolvimento
npm run dev

# Produção
npm start

# Banco de dados
npm run migrate
npm run seed

# Parar servidor
Ctrl + C
```

## 📞 Suporte

Para dúvidas ou problemas, consulte o README.md ou entre em contato através dos canais oficiais do TJSC.

---
**Sistema desenvolvido para o Tribunal de Justiça de Santa Catarina - Comarca de Capivari de Baixo**
