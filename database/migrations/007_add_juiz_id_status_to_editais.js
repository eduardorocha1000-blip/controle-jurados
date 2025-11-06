exports.up = async function(knex) {
  // Adicionar coluna juiz_id e status à tabela editais, se não existirem
  const hasJuizId = await knex.schema.hasColumn('editais', 'juiz_id');
  if (!hasJuizId) {
    await knex.schema.alterTable('editais', function(table) {
      table.integer('juiz_id').unsigned().references('id').inTable('juizes').onDelete('SET NULL');
    });
  }

  const hasStatus = await knex.schema.hasColumn('editais', 'status');
  if (!hasStatus) {
    await knex.schema.alterTable('editais', function(table) {
      table.string('status', 20).defaultTo('Rascunho');
    });
  }
};

exports.down = async function(knex) {
  const hasJuizId = await knex.schema.hasColumn('editais', 'juiz_id');
  if (hasJuizId) {
    await knex.schema.alterTable('editais', function(table) {
      table.dropColumn('juiz_id');
    });
  }

  const hasStatus = await knex.schema.hasColumn('editais', 'status');
  if (hasStatus) {
    await knex.schema.alterTable('editais', function(table) {
      table.dropColumn('status');
    });
  }
};


