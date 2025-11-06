const db = require('../config/database');

class Instituicao {
  static async criar(dados) {
    const updateData = { ...dados };
    
    // Converter campos de texto para maiúsculo
    if (updateData.nome) {
      updateData.nome = updateData.nome.toUpperCase();
    }
    if (updateData.contato_nome) {
      updateData.contato_nome = updateData.contato_nome.toUpperCase();
    }
    if (updateData.endereco) {
      updateData.endereco = updateData.endereco.toUpperCase();
    }
    if (updateData.cidade) {
      updateData.cidade = updateData.cidade.toUpperCase();
    }
    if (updateData.contato_email) {
      updateData.contato_email = updateData.contato_email.toLowerCase();
    }
    
    const insertedIds = await db('instituicoes').insert(updateData);
    const id = Array.isArray(insertedIds) ? insertedIds[0] : insertedIds;
    return await db('instituicoes').where('id', id).first();
  }

  static async listar(filtros = {}) {
    let query = db('instituicoes');

    if (filtros.ativo) {
      query = query.where('ativo', filtros.ativo);
    }

    if (filtros.tipo) {
      query = query.where('tipo', filtros.tipo);
    }

    if (filtros.busca) {
      const termo = `%${filtros.busca}%`;
      query = query.where(function() {
        this.where('nome', 'like', termo)
          .orWhere('cnpj', 'like', termo)
          .orWhere('contato_nome', 'like', termo)
          .orWhere('cidade', 'like', termo);
      });
    }

    return await query.orderBy('nome');
  }

  static async buscarPorId(id) {
    return await db('instituicoes')
      .where('id', id)
      .first();
  }

  static async atualizar(id, dados) {
    const allowed = [
      'nome', 'cnpj', 'contato_nome', 'contato_email', 'contato_telefone',
      'endereco', 'cidade', 'uf', 'cep', 'ativo', 'quantidade', 'observacoes'
    ];
    const updateData = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(dados, key)) {
        updateData[key] = dados[key];
      }
    }
    
    // Converter campos de texto para maiúsculo
    if (updateData.nome) {
      updateData.nome = updateData.nome.toUpperCase();
    }
    if (updateData.contato_nome) {
      updateData.contato_nome = updateData.contato_nome.toUpperCase();
    }
    if (updateData.endereco) {
      updateData.endereco = updateData.endereco.toUpperCase();
    }
    if (updateData.cidade) {
      updateData.cidade = updateData.cidade.toUpperCase();
    }
    if (updateData.contato_email) {
      updateData.contato_email = updateData.contato_email.toLowerCase();
    }
    
    await db('instituicoes')
      .where('id', id)
      .update(updateData);
    return await db('instituicoes').where('id', id).first();
  }

  static async excluir(id) {
    return await db('instituicoes')
      .where('id', id)
      .del();
  }

  static async listarAtivas() {
    return await db('instituicoes')
      .where('ativo', 'Sim')
      .orderBy('nome');
  }

  static async contarJurados(instituicaoId) {
    const result = await db('jurados')
      .where('instituicao_id', instituicaoId)
      .count('* as total')
      .first();
    return parseInt(result.total);
  }

  static async contar() {
    const result = await db('instituicoes').count('* as total').first();
    return parseInt(result.total);
  }
}

module.exports = Instituicao;
