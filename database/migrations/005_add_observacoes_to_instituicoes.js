exports.up = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('instituicoes', 'observacoes');
  if (!hasColumn) {
    await knex.schema.alterTable('instituicoes', function(table) {
      table.text('observacoes').nullable();
    });
  }
};

exports.down = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('instituicoes', 'observacoes');
  if (hasColumn) {
    await knex.schema.alterTable('instituicoes', function(table) {
      table.dropColumn('observacoes');
    });
  }
};
