const db = require('../config/database');

class Indicacao {
  // Função para sanitizar dados removendo campos não permitidos
  static sanitizarDados(dados) {
    const camposPermitidos = [
      'ano_referencia',
      'instituicao_id', 
      'quantidade',
      'prazo_envio',
      'status',
      'observacoes',
      'arquivo_lista'
    ];
    
    const dadosSanitizados = {};
    camposPermitidos.forEach(campo => {
      if (dados[campo] !== undefined) {
        dadosSanitizados[campo] = dados[campo];
      }
    });
    
    return dadosSanitizados;
  }

  static async criar(dados) {
    const dadosSanitizados = this.sanitizarDados(dados);
    
    const indicacaoData = {
      ano_referencia: dadosSanitizados.ano_referencia,
      instituicao_id: dadosSanitizados.instituicao_id,
      quantidade: dadosSanitizados.quantidade,
      prazo_envio: dadosSanitizados.prazo_envio,
      status: dadosSanitizados.status || 'pendente',
      observacoes: dadosSanitizados.observacoes || '',
      arquivo_lista: dadosSanitizados.arquivo_lista || null,
      created_at: new Date()
    };
    
    const insertedIds = await db('indicacoes').insert(indicacaoData);
    const id = Array.isArray(insertedIds) ? insertedIds[0] : insertedIds;
    return await db('indicacoes').where('id', id).first();
  }

  static async listar(filtros = {}) {
    let query = db('indicacoes')
      .leftJoin('instituicoes', 'indicacoes.instituicao_id', 'instituicoes.id')
      .select(
        'indicacoes.*',
        'instituicoes.nome as instituicao_nome',
        'instituicoes.contato_nome',
        'instituicoes.contato_email'
      );
    
    if (filtros.ano_referencia) {
      query = query.where('indicacoes.ano_referencia', filtros.ano_referencia);
    }
    
    if (filtros.instituicao_id) {
      query = query.where('indicacoes.instituicao_id', filtros.instituicao_id);
    }
    
    if (filtros.status) {
      query = query.where('indicacoes.status', filtros.status);
    }
    
    if (filtros.busca) {
      const termo = `%${filtros.busca}%`;
      query = query.where(function() {
        this.where('instituicoes.nome', 'like', termo)
          .orWhere('indicacoes.observacoes', 'like', termo)
          .orWhere('indicacoes.status', 'like', termo);
      });
    }
    
    return await query.orderBy('indicacoes.created_at', 'desc');
  }

  static async buscarPorId(id) {
    return await db('indicacoes')
      .leftJoin('instituicoes', 'indicacoes.instituicao_id', 'instituicoes.id')
      .select(
        'indicacoes.*',
        'instituicoes.nome as instituicao_nome',
        'instituicoes.contato_nome',
        'instituicoes.contato_email',
        'instituicoes.endereco',
        'instituicoes.contato_telefone'
      )
      .where('indicacoes.id', id)
      .first();
  }

  static async atualizar(id, dados) {
    const dadosSanitizados = this.sanitizarDados(dados);
    
    await db('indicacoes')
      .where('id', id)
      .update(dadosSanitizados);
    
    return await db('indicacoes').where('id', id).first();
  }

  static async excluir(id) {
    await db('indicacoes')
      .where('id', id)
      .del();
    
    return true;
  }

  static async contar(filtros = {}) {
    let query = db('indicacoes');
    
    if (filtros.ano_referencia) {
      query = query.where('ano_referencia', filtros.ano_referencia);
    }
    
    if (filtros.instituicao_id) {
      query = query.where('instituicao_id', filtros.instituicao_id);
    }
    
    if (filtros.status) {
      query = query.where('status', filtros.status);
    }
    
    const result = await query.count('* as count').first();
    return result.count;
  }

  static async contarPorStatus(status) {
    const result = await db('indicacoes')
      .where('status', status)
      .count('* as count')
      .first();
    
    return result.count;
  }

  static async contarPorAno(ano) {
    const result = await db('indicacoes')
      .where('ano_referencia', ano)
      .count('* as count')
      .first();
    
    return result.count;
  }

  static async marcarComoEnviada(id) {
    return await this.atualizar(id, { 
      status: 'Enviada',
      enviada_em: new Date()
    });
  }

  static async marcarComoRecebida(id) {
    return await this.atualizar(id, { 
      status: 'Recebida',
      recebida_em: new Date()
    });
  }

  static async marcarComoProcessada(id) {
    return await this.atualizar(id, { 
      status: 'Processada',
      processada_em: new Date()
    });
  }

  static async buscarPendentes() {
    return await db('indicacoes')
      .leftJoin('instituicoes', 'indicacoes.instituicao_id', 'instituicoes.id')
      .select(
        'indicacoes.*',
        'instituicoes.nome as instituicao_nome',
        'instituicoes.contato_nome',
        'instituicoes.contato_email'
      )
      .where('indicacoes.status', 'Pendente')
      .orderBy('indicacoes.prazo_envio', 'asc');
  }

  static async buscarVencidas() {
    const hoje = new Date();
    return await db('indicacoes')
      .leftJoin('instituicoes', 'indicacoes.instituicao_id', 'instituicoes.id')
      .select(
        'indicacoes.*',
        'instituicoes.nome as instituicao_nome',
        'instituicoes.contato_nome',
        'instituicoes.contato_email'
      )
      .where('indicacoes.prazo_envio', '<', hoje)
      .where('indicacoes.status', 'Pendente')
      .orderBy('indicacoes.prazo_envio', 'asc');
  }

  static async gerarRelatorio(filtros = {}) {
    let query = db('indicacoes')
      .leftJoin('instituicoes', 'indicacoes.instituicao_id', 'instituicoes.id')
      .select(
        'indicacoes.*',
        'instituicoes.nome as instituicao_nome',
        'instituicoes.contato_nome',
        'instituicoes.contato_email'
      );

    if (filtros.ano_referencia) {
      query = query.where('indicacoes.ano_referencia', filtros.ano_referencia);
    }

    if (filtros.status) {
      query = query.where('indicacoes.status', filtros.status);
    }

    if (filtros.data_inicio) {
      query = query.where('indicacoes.created_at', '>=', filtros.data_inicio);
    }

    if (filtros.data_fim) {
      query = query.where('indicacoes.created_at', '<=', filtros.data_fim);
    }

    return await query.orderBy('indicacoes.created_at', 'desc');
  }
}

module.exports = Indicacao;
