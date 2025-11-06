exports.up = function(knex) {
  return knex.schema.createTable('password_resets', function(table) {
    table.increments('id').primary();
    table.integer('usuario_id').unsigned().notNullable().references('id').inTable('usuarios').onDelete('CASCADE');
    table.string('token', 128).notNullable().unique();
    table.timestamp('expires_at').notNullable();
    table.timestamp('used_at').nullable();
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('password_resets');
};
