exports.up = function(knex) {
  return knex.schema.table('juizes', function(table) {
    // Adicionar campos faltantes
    table.string('telefone', 20).nullable();
    table.string('status', 20).notNullable().defaultTo('Ativo');
    table.text('observacoes').nullable();
    
    // Tornar matricula opcional (remover notNull se existir)
    table.string('matricula', 20).nullable().alter();
  });
};

exports.down = function(knex) {
  return knex.schema.table('juizes', function(table) {
    // Remover campos adicionados
    table.dropColumn('telefone');
    table.dropColumn('status');
    table.dropColumn('observacoes');
    
    // Restaurar matricula como obrigatória
    table.string('matricula', 20).notNullable().alter();
  });
};
