exports.up = async function(knex) {
  // Tabela de configurações de e-mail
  const hasConfiguracoes = await knex.schema.hasTable('configuracoes');
  if (!hasConfiguracoes) {
    await knex.schema.createTable('configuracoes', (table) => {
      table.increments('id').primary();
      table.string('chave').notNullable().unique();
      table.text('valor').notNullable();
      table.timestamp('atualizado_em').defaultTo(knex.fn.now());
    });
  }

  // Tabela de histórico de notificações de e-mail
  const hasNotificacoes = await knex.schema.hasTable('notificacoes_email');
  if (!hasNotificacoes) {
    await knex.schema.createTable('notificacoes_email', (table) => {
      table.increments('id').primary();
      table.integer('instituicao_id').index();
      table.string('assunto');
      table.text('corpo_html');
      table.text('corpo_texto');
      table.timestamp('enviado_em');
      table.string('status').index(); // 'enviado', 'erro', 'pendente'
      table.text('resposta_servidor');
    });
  }

  // Tabela de templates de e-mail
  const hasTemplates = await knex.schema.hasTable('templates_email');
  if (!hasTemplates) {
    await knex.schema.createTable('templates_email', (table) => {
      table.increments('id').primary();
      table.string('tipo').notNullable().unique(); // ex: 'intimacao', 'confirmacao'
      table.string('assunto');
      table.text('corpo_html');
      table.text('corpo_texto');
      table.timestamp('atualizado_em').defaultTo(knex.fn.now());
    });
  }
};

exports.down = async function(knex) {
  // Reverte na ordem inversa para evitar dependências
  const hasTemplates = await knex.schema.hasTable('templates_email');
  if (hasTemplates) {
    await knex.schema.dropTable('templates_email');
  }

  const hasNotificacoes = await knex.schema.hasTable('notificacoes_email');
  if (hasNotificacoes) {
    await knex.schema.dropTable('notificacoes_email');
  }

  const hasConfiguracoes = await knex.schema.hasTable('configuracoes');
  if (hasConfiguracoes) {
    await knex.schema.dropTable('configuracoes');
  }
};

