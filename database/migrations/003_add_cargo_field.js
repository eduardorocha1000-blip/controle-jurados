exports.up = function(knex) {
  return knex.schema.alterTable('usuarios', function(table) {
    table.string('cargo', 50).nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('usuarios', function(table) {
    table.dropColumn('cargo');
  });
};
