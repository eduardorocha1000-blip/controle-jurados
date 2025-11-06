exports.up = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('jurados', 'instituicao_id');
  if (!hasColumn) {
    await knex.schema.alterTable('jurados', function(table) {
      table.integer('instituicao_id').unsigned().references('id').inTable('instituicoes').onDelete('SET NULL');
    });
    // Opcional: criar índice para melhorar consultas por instituição
    await knex.schema.alterTable('jurados', function(table) {
      table.index(['instituicao_id'], 'idx_jurados_instituicao_id');
    });
  }
};

exports.down = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('jurados', 'instituicao_id');
  if (hasColumn) {
    await knex.schema.alterTable('jurados', function(table) {
      table.dropIndex(['instituicao_id'], 'idx_jurados_instituicao_id');
      table.dropColumn('instituicao_id');
    });
  }
};


