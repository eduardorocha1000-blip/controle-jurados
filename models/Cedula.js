const db = require('../config/database');

class Cedula {
  static async criar(dados) {
    const cedulaData = {
      sorteio_id: dados.sorteio_id,
      numero_cedula: dados.numero_cedula,
      status: dados.status || 'Gerada',
      created_at: new Date()
    };
    
    const [cedula] = await db('cedulas')
      .insert(cedulaData)
      .returning('*');
    
    return cedula;
  }

  static async listar(filtros = {}) {
    let query = db('cedulas')
      .leftJoin('sorteios', 'cedulas.sorteio_id', 'sorteios.id')
      .leftJoin('juizes', 'sorteios.juiz_responsavel_id', 'juizes.id')
      .select(
        'cedulas.*',
        db.raw('cedulas.numero_sequencial as numero_cedula'),
        db.raw("COALESCE(cedulas.status, 'Gerada') as status"),
        'sorteios.numero_processo',
        'sorteios.data_juri',
        'sorteios.hora_juri',
        'sorteios.local_sorteio',
        'sorteios.ano_referencia',
        'juizes.nome_completo as juiz_nome'
      );
    
    if (filtros.sorteio_id) {
      query = query.where('cedulas.sorteio_id', filtros.sorteio_id);
    }
    
    if (filtros.status) {
      query = query.where('cedulas.status', filtros.status);
    }
    
    return await query.orderBy('cedulas.created_at', 'desc');
  }

  static async buscarPorId(id) {
    return await db('cedulas')
      .leftJoin('sorteios', 'cedulas.sorteio_id', 'sorteios.id')
      .leftJoin('juizes', 'sorteios.juiz_responsavel_id', 'juizes.id')
      .select(
        'cedulas.*',
        db.raw('cedulas.numero_sequencial as numero_cedula'),
        db.raw("COALESCE(cedulas.status, 'Gerada') as status"),
        'sorteios.numero_processo',
        'sorteios.data_juri',
        'sorteios.hora_juri',
        'sorteios.local_sorteio',
        'sorteios.ano_referencia',
        'juizes.nome_completo as juiz_nome'
      )
      .where('cedulas.id', id)
      .first();
  }

  static async gerarCedulas(sorteioId, quantidade = 100) {
    try {
      // Buscar dados do sorteio
      const sorteio = await db('sorteios')
        .leftJoin('juizes', 'sorteios.juiz_responsavel_id', 'juizes.id')
        .select(
          'sorteios.*',
          'juizes.nome_completo as juiz_nome'
        )
        .where('sorteios.id', sorteioId)
        .first();

      if (!sorteio) {
        throw new Error('Sorteio não encontrado');
      }

      // Buscar próximo número de cédula
      const ultimaCedula = await db('cedulas')
        .where('sorteio_id', sorteioId)
        .orderBy('numero_cedula', 'desc')
        .first();

      let proximoNumero = ultimaCedula ? ultimaCedula.numero_cedula + 1 : 1;

      const cedulas = [];
      
      for (let i = 0; i < quantidade; i++) {
        const cedulaData = {
          sorteio_id: sorteioId,
          numero_cedula: proximoNumero + i,
          status: 'Gerada',
          created_at: new Date()
        };

        const [cedula] = await db('cedulas')
          .insert(cedulaData)
          .returning('*');
        
        cedulas.push(cedula);
      }

      return cedulas;
    } catch (error) {
      console.error('Erro ao gerar cédulas:', error);
      throw error;
    }
  }

  static async atualizar(id, dados) {
    const updateData = { ...dados };
    
    const [cedula] = await db('cedulas')
      .where('id', id)
      .update(updateData)
      .returning('*');
    
    return cedula;
  }

  static async excluir(id) {
    await db('cedulas')
      .where('id', id)
      .del();
    
    return true;
  }

  static async contar(filtros = {}) {
    let query = db('cedulas');
    
    if (filtros.sorteio_id) {
      query = query.where('sorteio_id', filtros.sorteio_id);
    }
    
    if (filtros.status) {
      query = query.where('status', filtros.status);
    }
    
    const result = await query.count('* as count').first();
    return result.count;
  }

  static gerarCSV(cedulas) {
    const headers = [
      'ID',
      'Número da Cédula',
      'Sorteio ID',
      'Processo',
      'Data do Júri',
      'Hora do Júri',
      'Status',
      'Data de Criação'
    ];

    const rows = cedulas.map(cedula => [
      cedula.id,
      cedula.numero_cedula,
      cedula.sorteio_id,
      cedula.numero_processo || '',
      cedula.data_juri ? new Date(cedula.data_juri).toLocaleDateString('pt-BR') : '',
      cedula.hora_juri || '',
      cedula.status,
      cedula.created_at ? new Date(cedula.created_at).toLocaleString('pt-BR') : ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }

  static async marcarComoImpressa(id) {
    return await this.atualizar(id, { 
      status: 'Impressa',
      impressa_em: new Date()
    });
  }

  static async marcarComoUtilizada(id) {
    return await this.atualizar(id, { 
      status: 'Utilizada',
      utilizada_em: new Date()
    });
  }
}

module.exports = Cedula;
