# Segurança de E-mail - Recomendações

## ⚠️ IMPORTANTE: Segurança de Credenciais

**NUNCA compartilhe suas senhas ou credenciais publicamente!** 
Se você compartilhou senhas em um chat ou sistema, altere-as imediatamente.

## Configurações de Segurança Aplicadas

O sistema agora usa padrões modernos de segurança para envio de e-mails:

### ✅ TLS 1.2+
- Versão mínima: TLSv1.2 (suporta TLSv1.3 quando disponível)
- Ciphers seguros apenas (exclui algoritmos vulneráveis)

### ✅ STARTTLS
- Para porta 587: usa STARTTLS explícito
- Para porta 465: usa SSL/TLS direto

### ⚠️ Recomendações para Gmail

**Importante:** O Gmail pode bloquear tentativas de login de aplicações que não usam senhas de app ou OAuth2.

#### Opção 1: Senha de App (Recomendado para aplicações simples)

1. Acesse: https://myaccount.google.com/apppasswords
2. Ative a verificação em duas etapas (se ainda não estiver ativada)
3. Crie uma "Senha de App" específica para esta aplicação
4. Use essa senha de app no campo "Senha" (não sua senha normal)

**Configurações recomendadas:**
- Servidor SMTP: `smtp.gmail.com`
- Porta: `587`
- Seguro: `Não` (mas com TLS habilitado)
- Usuário: `eduardo.rocha1000@gmail.com`
- Senha: `[Sua senha de app gerada]`

#### Opção 2: OAuth2 (Mais seguro, mas requer configuração adicional)

Para maior segurança, considere implementar OAuth2. Isso requer:
- Credenciais do Google Cloud Console
- Configuração de tokens de acesso e refresh

**Nota:** A implementação atual usa autenticação básica (usuário/senha), que funciona com senhas de app do Gmail.

## Configurações para Outros Provedores

### Outlook/Hotmail
- Servidor: `smtp-mail.outlook.com`
- Porta: `587`
- Seguro: `Não` (com TLS)

### Office 365
- Servidor: `smtp.office365.com`
- Porta: `587`
- Seguro: `Não` (com TLS)

### Servidores Corporativos
- Consulte seu administrador de TI para as configurações SMTP
- Geralmente porta 587 com STARTTLS ou porta 465 com SSL

## Boas Práticas

1. ✅ Use senhas de app quando disponível
2. ✅ Nunca compartilhe senhas em logs ou mensagens
3. ✅ Altere senhas periodicamente
4. ✅ Use TLS/SSL sempre que possível
5. ✅ Mantenha o sistema atualizado

## Troubleshooting

### Erro: "Invalid login"
- Verifique se está usando senha de app (não senha normal do Gmail)
- Verifique se a verificação em duas etapas está ativada

### Erro: "Connection timeout"
- Verifique firewall/antivírus
- Verifique se a porta está acessível
- Tente porta 465 com SSL

### Erro: "Certificate error"
- Em desenvolvimento: `rejectUnauthorized: false` está habilitado
- Em produção: configure certificados válidos

## Atualização de Segurança

As configurações foram atualizadas para usar:
- TLS mínimo 1.2
- Ciphers seguros apenas
- Rejeição de certificados inválidos em produção

