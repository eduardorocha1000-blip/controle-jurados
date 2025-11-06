const db = require('../config/database');

class Sorteio {
  static async criar(dados) {
    // Campos permitidos para criação
    const camposPermitidos = [
      'ano_referencia', 'data_realizacao', 'data_juri', 'hora_juri',
      'juiz_responsavel_id', 'local_sorteio', 'numero_processo', 
      'status', 'observacoes'
    ];
    
    // Filtrar apenas campos permitidos
    const dadosLimpos = {};
    camposPermitidos.forEach(campo => {
      if (dados[campo] !== undefined) {
        dadosLimpos[campo] = dados[campo];
      }
    });
    
    const [sorteio] = await db('sorteios')
      .insert(dadosLimpos)
      .returning('*');
    
    return sorteio;
  }

  static async listar(filtros = {}) {
    let query = db('sorteios')
      .leftJoin('juizes', 'sorteios.juiz_responsavel_id', 'juizes.id')
      .select(
        'sorteios.*',
        'juizes.nome_completo as juiz_nome'
      );
    
    if (filtros.ano_referencia) {
      query = query.where('sorteios.ano_referencia', filtros.ano_referencia);
    }
    
    if (filtros.busca) {
      query = query.where(function() {
        this.where('sorteios.numero_processo', 'like', `%${filtros.busca}%`)
            .orWhere('juizes.nome_completo', 'like', `%${filtros.busca}%`)
            .orWhere('sorteios.local_sorteio', 'like', `%${filtros.busca}%`)
            .orWhere('sorteios.status', 'like', `%${filtros.busca}%`);
      });
    }
    
    return await query.orderBy('sorteios.data_juri', 'desc');
  }

  static async buscarPorId(id) {
    return await db('sorteios')
      .leftJoin('juizes', 'sorteios.juiz_responsavel_id', 'juizes.id')
      .select(
        'sorteios.*',
        'juizes.nome_completo as juiz_nome'
      )
      .where('sorteios.id', id)
      .first();
  }

  static async atualizar(id, dados) {
    // Campos permitidos para atualização
    const camposPermitidos = [
      'ano_referencia', 'data_realizacao', 'data_juri', 'hora_juri',
      'juiz_responsavel_id', 'local_sorteio', 'numero_processo', 
      'status', 'observacoes'
    ];
    
    // Filtrar apenas campos permitidos
    const dadosLimpos = {};
    camposPermitidos.forEach(campo => {
      if (dados[campo] !== undefined) {
        dadosLimpos[campo] = dados[campo];
      }
    });
    
    const [sorteio] = await db('sorteios')
      .where('id', id)
      .update(dadosLimpos)
      .returning('*');
    
    return sorteio;
  }

  static async excluir(id) {
    return await db('sorteios')
      .where('id', id)
      .del();
  }

  static async adicionarJurado(sorteioId, juradoId, status) {
    // Verificar se o jurado já está no sorteio
    const juradoExistente = await db('sorteio_jurados')
      .where({
        sorteio_id: sorteioId,
        jurado_id: juradoId
      })
      .first();
    
    if (juradoExistente) {
      throw new Error('Este jurado já está cadastrado neste sorteio');
    }
    
    return await db('sorteio_jurados')
      .insert({
        sorteio_id: sorteioId,
        jurado_id: juradoId,
        status
      });
  }

  static async removerJurado(sorteioId, juradoId) {
    return await db('sorteio_jurados')
      .where({
        sorteio_id: sorteioId,
        jurado_id: juradoId
      })
      .del();
  }

  static async listarJurados(sorteioId) {
    return await db('sorteio_jurados')
      .leftJoin('jurados', 'sorteio_jurados.jurado_id', 'jurados.id')
      .select(
        'sorteio_jurados.*',
        'jurados.nome_completo',
        'jurados.cpf',
        'jurados.profissao'
      )
      .where('sorteio_jurados.sorteio_id', sorteioId)
      .orderBy('sorteio_jurados.status', 'desc')
      .orderBy('jurados.nome_completo');
  }

  static async gerarCedulas(sorteioId) {
    const jurados = await this.listarJurados(sorteioId);
    
    // Limpar cédulas existentes
    await db('cedulas').where('sorteio_id', sorteioId).del();
    
    const cedulas = [];
    let numeroSequencial = 1;
    
    for (const jurado of jurados) {
      const cedula = {
        sorteio_id: sorteioId,
        jurado_id: jurado.jurado_id,
        numero_sequencial: numeroSequencial++,
        codigo_barras: `${sorteioId}|${jurado.jurado_id}|${new Date().getFullYear()}`
      };
      
      cedulas.push(cedula);
    }
    
    if (cedulas.length > 0) {
      await db('cedulas').insert(cedulas);
    }
    
    return cedulas;
  }

  static async marcarUltimoConselho(sorteioId, juradosIds) {
    const sorteio = await this.buscarPorId(sorteioId);
    
    // Limpar marcações anteriores
    await db('ultimo_conselho').where('sorteio_id', sorteioId).del();
    
    // Marcar novos jurados
    if (juradosIds && juradosIds.length > 0) {
      const registros = juradosIds.map(juradoId => ({
        sorteio_id: sorteioId,
        jurado_id: juradoId
      }));
      
      await db('ultimo_conselho').insert(registros);
      
      // Atualizar campo ultimo_conselho nos jurados
      await db('jurados')
        .whereIn('id', juradosIds)
        .update({
          ultimo_conselho: sorteio.data_juri
        });
    }
  }

  static async contar(filtros = {}) {
    try {
      let query = db('sorteios');
      
      if (filtros.ano_referencia) {
        query = query.where('ano_referencia', filtros.ano_referencia);
      }
      
      if (filtros.status) {
        query = query.where('status', filtros.status);
      }
      
      const result = await query.count('* as total').first();
      return parseInt(result.total) || 0;
    } catch (error) {
      console.error('Erro ao contar sorteios:', error);
      return 0;
    }
  }
}

module.exports = Sorteio;
