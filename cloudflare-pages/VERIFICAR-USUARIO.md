# 👤 Verificar e Criar Usuário no Banco D1

## 🔍 Verificar se o Usuário Existe

No Console do D1, execute:

```sql
SELECT * FROM usuarios WHERE email = 'eduardo.rocha1000@gmail.com';
```

## ➕ Criar Usuário (se não existir)

Se não retornar nada, crie o usuário:

```sql
INSERT INTO usuarios (nome, email, senha_hash, perfil)
VALUES ('Administrador', 'eduardo.rocha1000@gmail.com', 'hash-temporario-123', 'Administrador');
```

## ✅ Verificar se Funcionou

Após criar, verifique novamente:

```sql
SELECT * FROM usuarios;
```

Você deve ver o usuário listado.

## 🧪 Testar Login

Após criar o usuário, teste o login no console do navegador:

```javascript
fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        email: 'eduardo.rocha1000@gmail.com',
        senha: 'qualquer-senha'
    })
})
.then(r => r.text())
.then(console.log)
.catch(console.error);
```

## ⚠️ Importante

Por enquanto, o sistema **não valida senha** (TODO no código). Use qualquer senha para testar. Em produção, você precisará implementar bcrypt.

