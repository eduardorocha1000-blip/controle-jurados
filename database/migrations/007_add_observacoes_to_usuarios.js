exports.up = function(knex) {
  return knex.schema.alterTable('usuarios', function(table) {
    table.text('observacoes').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('usuarios', function(table) {
    table.dropColumn('observacoes');
  });
};


