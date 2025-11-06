exports.up = async function(knex) {
  const has = await knex.schema.hasColumn('jurados', 'foto_path');
  if (!has) {
    await knex.schema.alterTable('jurados', function(table) {
      table.string('foto_path', 255);
    });
  }
};

exports.down = async function(knex) {
  const has = await knex.schema.hasColumn('jurados', 'foto_path');
  if (has) {
    await knex.schema.alterTable('jurados', function(table) {
      table.dropColumn('foto_path');
    });
  }
};


