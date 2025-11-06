# ✅ CORREÇÃO: Campos de E-mail e Senha

## 🔧 Problema Identificado

Os campos de **e-mail** e **senha** estavam sendo convertidos automaticamente para **MAIÚSCULAS** devido a:

1. **CSS**: `text-transform: uppercase` aplicado a todos os campos
2. **JavaScript**: Conversão automática para maiúsculas em todos os inputs de texto

## ✅ Soluções Aplicadas

### 1. **Correção no CSS** (`public/css/style.css`)

```css
/* Formulários */
.form-control, .form-select {
    text-transform: uppercase;
}

/* Campos que devem manter minúsculas */
.form-control[type="email"],
.form-control[type="password"],
.form-control[type="tel"],
.form-control[type="url"],
.form-control[name*="email"],
.form-control[name*="senha"],
.form-control[name*="password"] {
    text-transform: none;
}
```

### 2. **Correção no JavaScript** (`views/dashboard/index.ejs`)

```javascript
// Converter campos para maiúsculo (exceto email, senha, telefone, etc.)
const textInputs = document.querySelectorAll('input[type="text"]:not([name*="email"]):not([name*="senha"]):not([name*="password"]):not([name*="telefone"]):not([name*="cpf"]):not([name*="cnpj"]):not([name*="cep"])');
textInputs.forEach(input => {
    input.addEventListener('input', function(e) {
        e.target.value = e.target.value.toUpperCase();
    });
});
```

## 🎯 Campos Afetados

### ✅ **Mantêm minúsculas** (corrigidos):
- `type="email"` - Campos de e-mail
- `type="password"` - Campos de senha
- `type="tel"` - Campos de telefone
- `type="url"` - Campos de URL
- `name*="email"` - Campos com nome contendo "email"
- `name*="senha"` - Campos com nome contendo "senha"
- `name*="password"` - Campos com nome contendo "password"

### ✅ **Convertem para maiúsculas** (mantido):
- Nome completo
- Endereço
- Bairro
- Cidade
- Profissão
- Observações
- Todos os outros campos de texto

## 🧪 Como Testar

1. **Acesse**: http://localhost:3000
2. **Faça login**: 
   - E-mail: `admin@tjsc.jus.br` (deve aceitar minúsculas)
   - Senha: `password` (deve aceitar minúsculas)
3. **Teste outros formulários**:
   - Campos de e-mail devem aceitar minúsculas
   - Campos de senha devem aceitar minúsculas
   - Campos de nome/endereço devem converter para maiúsculas

## 📝 Observações

- **E-mails**: Agora aceitam minúsculas normalmente
- **Senhas**: Agora aceitam minúsculas normalmente
- **Outros campos**: Continuam convertendo para maiúsculas conforme especificado
- **Compatibilidade**: Funciona em todos os navegadores modernos

---
**Problema resolvido! Agora você pode digitar e-mail e senha em minúsculas normalmente.** ✅
