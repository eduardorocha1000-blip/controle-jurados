exports.up = function(knex) {
  return knex.schema.alterTable('usuarios', function(table) {
    table.string('matricula', 20).nullable();
    table.string('telefone', 15).nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('usuarios', function(table) {
    table.dropColumn('matricula');
    table.dropColumn('telefone');
  });
};
