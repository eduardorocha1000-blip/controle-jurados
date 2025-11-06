# Variáveis Disponíveis para Templates de E-mail

Ao criar ou editar templates de e-mail (Intimação ou Confirmação), você pode usar as seguintes variáveis (placeholders) que serão automaticamente substituídas pelos valores reais quando o e-mail for enviado:

## Variáveis de Instituição

### `{NOME}`
- **Descrição**: Nome do contato responsável pela instituição
- **Exemplo**: "João Silva Santos"
- **Campo do banco**: `instituicao.contato_nome`

### `{INSTITUICAO}`
- **Descrição**: Nome completo da instituição
- **Exemplo**: "Conselho da Comunidade de Capivari de Baixo"
- **Campo do banco**: `instituicao.nome`

## Variáveis de Dados do Envio

### `{ANO}`
- **Descrição**: Ano de referência selecionado no formulário
- **Exemplo**: "2025"
- **Fonte**: Campo "Ano de Referência" do formulário

### `{QUANTIDADE}`
- **Descrição**: Quantidade de nomes solicitados
- **Exemplo**: "10"
- **Prioridade**: Valor do formulário ou quantidade padrão da instituição

### `{PRAZO}`
- **Descrição**: Prazo para envio da lista
- **Exemplo**: "30 dias"
- **Valor padrão**: "30 dias"

### `{LINK_UPLOAD}`
- **Descrição**: Link para upload da lista de indicações
- **Exemplo**: "http://localhost:3000/indicacoes/upload"
- **Fonte**: Configurado automaticamente pelo sistema

### `{JUIZ_TITULAR}`
- **Descrição**: Nome completo do Juiz Titular (marcado como Titular = "Sim" na lista de juízes)
- **Exemplo**: "DR. JOÃO SILVA SANTOS"
- **Fonte**: Tabela `juizes` (campo `nome_completo`) via `Juiz.buscarTitular()`

### `{MENSAGEM}`
- **Descrição**: Mensagem personalizada (se fornecida)
- **Exemplo**: Texto personalizado fornecido pelo usuário
- **Nota**: Atualmente não está sendo usado, pois o campo foi removido do formulário

## Como Usar as Variáveis

### Exemplo de Template HTML:

```html
<p>Prezado(a) <strong>{NOME}</strong>,</p>

<p>Em nome da Vara Única da Comarca de Capivari de Baixo, 
vimos solicitar a indicação de cidadãos exemplares para 
comporem o corpo de jurados no ano de <strong>{ANO}</strong>.</p>

<p>A instituição <strong>{INSTITUICAO}</strong> está sendo 
intimada a indicar <strong>{QUANTIDADE}</strong> nomes.</p>

<p>O prazo para envio é de <strong>{PRAZO}</strong>.</p>

<p>Para enviar a lista, acesse: <a href="{LINK_UPLOAD}">Upload de Lista</a></p>
```

### Exemplo de Template de Texto:

```
Prezado(a) {NOME},

Em nome da Vara Única da Comarca de Capivari de Baixo, 
vimos solicitar a indicação de cidadãos exemplares para 
comporem o corpo de jurados no ano de {ANO}.

A instituição {INSTITUICAO} está sendo intimada a indicar 
{QUANTIDADE} nomes.

O prazo para envio é de {PRAZO}.

Para enviar a lista, acesse: {LINK_UPLOAD}
```

## Observações Importantes

1. **Case-sensitive**: As variáveis são case-sensitive. Use exatamente como mostrado: `{NOME}`, não `{nome}` ou `{Nome}`.

2. **Substituição Automática**: Quando você clicar em "Atualizar Corpo do Texto", os placeholders serão substituídos por valores de exemplo para você visualizar como ficará.

3. **Valores Reais**: No momento do envio, os valores reais serão substituídos automaticamente.

4. **Valores Vazios**: Se uma variável não tiver valor disponível, será substituída por uma string vazia ("").

5. **HTML vs Texto**: 
   - No campo "Corpo HTML", você pode usar tags HTML normalmente
   - No campo "Corpo Texto", use apenas texto simples (versão planilha)

## Dicas de Uso

- Use `{NOME}` para personalizar a saudação
- Use `{INSTITUICAO}` para referenciar a instituição no texto
- Use `{ANO}`, `{QUANTIDADE}` e `{PRAZO}` para informações específicas do envio
- Use `{LINK_UPLOAD}` para incluir o link de upload da lista

## Suporte a Novas Variáveis

Se precisar de novas variáveis, informe ao desenvolvedor quais campos adicionais você gostaria de usar no template.

