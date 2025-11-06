exports.up = function(knex) {
  return knex.schema.alterTable('indicacoes', function(table) {
    table.integer('quantidade').nullable();
    table.date('prazo_envio').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('indicacoes', function(table) {
    table.dropColumn('quantidade');
    table.dropColumn('prazo_envio');
  });
};
