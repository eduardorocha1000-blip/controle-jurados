exports.up = function(knex) {
  return knex.schema
    .createTable('usuarios', function(table) {
      table.increments('id').primary();
      table.string('nome', 100).notNullable();
      table.string('email', 100).notNullable().unique();
      table.string('senha_hash', 255).notNullable();
      table.string('perfil', 20).defaultTo('servidor');
      table.timestamps(true, true);
    })
    .createTable('juizes', function(table) {
      table.increments('id').primary();
      table.string('nome_completo', 45).notNullable();
      table.string('matricula', 7);
      table.enum('sexo', ['Masculino', 'Feminino']).notNullable();
      table.string('vara', 45).defaultTo('Vara Única');
      table.string('comarca', 45).defaultTo('Capivari de Baixo');
      table.string('email', 45);
      table.enum('titular', ['Sim', 'Não']).defaultTo('Não');
      table.timestamps(true, true);
    })
    .createTable('instituicoes', function(table) {
      table.increments('id').primary();
      table.string('nome', 60).notNullable();
      table.string('cnpj', 18);
      table.string('contato_nome', 45).defaultTo('Sr.(a). Diretor').notNullable();
      table.string('contato_email', 45).notNullable();
      table.string('contato_telefone', 15);
      table.string('endereco', 60);
      table.string('cidade', 45).defaultTo('Capivari de Baixo');
      table.string('uf', 2).defaultTo('SC');
      table.string('cep', 9).defaultTo('88745-000');
      table.enum('ativo', ['Sim', 'Não']).defaultTo('Sim').notNullable();
      table.integer('quantidade').defaultTo(10).checkBetween([1, 99]);
      table.timestamps(true, true);
    })
    .createTable('jurados', function(table) {
      table.increments('id').primary();
      table.string('nome_completo', 45).notNullable();
      table.string('cpf', 14).notNullable().unique();
      table.string('rg', 15);
      table.date('data_nascimento');
      table.enum('sexo', ['Masculino', 'Feminino']).notNullable();
      table.string('endereco', 45).notNullable();
      table.string('numero', 5).notNullable();
      table.string('complemento', 20);
      table.string('bairro', 30).notNullable();
      table.string('cidade', 45).defaultTo('Capivari de Baixo').notNullable();
      table.string('uf', 2).defaultTo('SC').notNullable();
      table.string('cep', 9).defaultTo('88745-000').notNullable();
      table.string('email', 45);
      table.string('telefone', 15);
      table.string('profissao', 25).notNullable();
      table.string('observacoes', 100);
      table.enum('status', ['Ativo', 'Inativo']).defaultTo('Ativo');
      table.enum('motivo', ['Outra Comarca', 'Falecido', 'Incapacitado', '12 meses', 'Impedimento', 'Idade', 'Temporário']);
      table.date('suspenso_ate');
      table.date('ultimo_conselho');
      table.timestamps(true, true);
    })
    .createTable('indicacoes', function(table) {
      table.increments('id').primary();
      table.integer('instituicao_id').unsigned().references('id').inTable('instituicoes').onDelete('CASCADE');
      table.integer('ano_referencia').notNullable();
      table.string('arquivo_lista', 255);
      table.enum('status', ['pendente', 'recebida', 'validada']).defaultTo('pendente');
      table.text('observacoes');
      table.timestamps(true, true);
    })
    .createTable('sorteios', function(table) {
      table.increments('id').primary();
      table.integer('ano_referencia').notNullable();
      table.date('data_realizacao').notNullable();
      table.integer('juiz_responsavel_id').unsigned().references('id').inTable('juizes').onDelete('SET NULL');
      table.date('data_juri').notNullable();
      table.time('hora_juri').notNullable();
      table.text('observacoes');
      table.timestamps(true, true);
    })
    .createTable('sorteio_jurados', function(table) {
      table.increments('id').primary();
      table.integer('sorteio_id').unsigned().references('id').inTable('sorteios').onDelete('CASCADE');
      table.integer('jurado_id').unsigned().references('id').inTable('jurados').onDelete('CASCADE');
      table.enum('status', ['titular', 'suplente']).notNullable();
      table.timestamps(true, true);
    })
    .createTable('cedulas', function(table) {
      table.increments('id').primary();
      table.integer('sorteio_id').unsigned().references('id').inTable('sorteios').onDelete('CASCADE');
      table.integer('jurado_id').unsigned().references('id').inTable('jurados').onDelete('CASCADE');
      table.string('codigo_barras', 255);
      table.integer('numero_sequencial').notNullable();
      table.timestamps(true, true);
    })
    .createTable('editais', function(table) {
      table.increments('id').primary();
      table.integer('ano_referencia').notNullable();
      table.string('numero', 20).notNullable();
      table.string('titulo', 100).notNullable();
      table.text('corpo_rtf');
      table.date('data_publicacao_prevista');
      table.date('data_publicacao_real');
      table.string('arquivo_rtf_gerado', 255);
      table.timestamps(true, true);
    })
    .createTable('notificacoes_email', function(table) {
      table.increments('id').primary();
      table.integer('instituicao_id').unsigned().references('id').inTable('instituicoes').onDelete('CASCADE');
      table.string('assunto', 200).notNullable();
      table.text('corpo_html');
      table.text('corpo_texto');
      table.timestamp('enviado_em');
      table.enum('status', ['enviado', 'erro']).defaultTo('enviado');
      table.text('resposta_servidor');
      table.timestamps(true, true);
    })
    .createTable('ultimo_conselho', function(table) {
      table.increments('id').primary();
      table.integer('sorteio_id').unsigned().references('id').inTable('sorteios').onDelete('CASCADE');
      table.integer('jurado_id').unsigned().references('id').inTable('jurados').onDelete('CASCADE');
      table.timestamps(true, true);
    })
    .createTable('auditoria', function(table) {
      table.increments('id').primary();
      table.integer('usuario_id').unsigned().references('id').inTable('usuarios').onDelete('SET NULL');
      table.string('tabela', 50).notNullable();
      table.string('acao', 20).notNullable();
      table.integer('registro_id').unsigned();
      table.text('dados_anteriores');
      table.text('dados_novos');
      table.string('ip', 45);
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('auditoria')
    .dropTableIfExists('ultimo_conselho')
    .dropTableIfExists('notificacoes_email')
    .dropTableIfExists('editais')
    .dropTableIfExists('cedulas')
    .dropTableIfExists('sorteio_jurados')
    .dropTableIfExists('sorteios')
    .dropTableIfExists('indicacoes')
    .dropTableIfExists('jurados')
    .dropTableIfExists('instituicoes')
    .dropTableIfExists('juizes')
    .dropTableIfExists('usuarios');
};
