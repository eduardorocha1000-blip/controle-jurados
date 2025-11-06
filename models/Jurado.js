const db = require('../config/database');

class Jurado {
  static async criar(dados) {
    const updateData = { ...dados };
    
    // Filtrar apenas campos válidos da tabela jurados
    const validFields = [
      'nome_completo', 'cpf', 'rg', 'data_nascimento', 'sexo',
      'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'uf', 'cep',
      'email', 'telefone', 'profissao', 'observacoes', 'status', 'motivo',
      'suspenso_ate', 'ultimo_conselho', 'instituicao_id', 'foto_path'
    ];
    
    const filteredData = {};
    validFields.forEach(field => {
      if (updateData[field] !== undefined && updateData[field] !== '') {
        // Tratar campos numéricos vazios
        if (field === 'instituicao_id' && updateData[field] === '') {
          filteredData[field] = null;
        } else {
          filteredData[field] = updateData[field];
        }
      }
    });
    
    // Verificar se CPF já existe
    const cpfExistente = await Jurado.buscarPorCpf(filteredData.cpf);
    if (cpfExistente) {
      throw new Error('CPF já cadastrado no sistema');
    }
    
    // Converter campos de texto para maiúsculo, exceto campos específicos
    Object.keys(filteredData).forEach(key => {
      if (typeof filteredData[key] === 'string' && 
          !['cpf', 'rg', 'email', 'telefone', 'cep', 'sexo', 'status', 'motivo'].includes(key)) {
        filteredData[key] = filteredData[key].toUpperCase();
      }
    });
    
    if (filteredData.email) {
      filteredData.email = filteredData.email.toLowerCase();
    }
    
    // Garantir que motivo tenha a capitalização correta conforme ENUM
    if (filteredData.motivo) {
      const motivoMap = {
        'OUTRA COMARCA': 'Outra Comarca',
        'FALECIDO': 'Falecido',
        'INCAPACITADO': 'Incapacitado',
        '12 MESES': '12 meses',
        'IMPEDIMENTO': 'Impedimento',
        'IDADE': 'Idade',
        'TEMPORÁRIO': 'Temporário'
      };
      filteredData.motivo = motivoMap[filteredData.motivo] || filteredData.motivo;
    }
    
    // SQLite não suporta returning('*') da mesma forma
    const [id] = await db('jurados').insert(filteredData);
    const jurado = await db('jurados').where('id', id).first();
    
    return jurado;
  }

  static async listar(filtros = {}) {
    let query = db('jurados')
      .leftJoin('instituicoes', 'jurados.instituicao_id', 'instituicoes.id')
      .select(
        'jurados.*',
        'instituicoes.nome as instituicao_nome'
      );
    
    if (filtros.status) {
      query = query.where('jurados.status', filtros.status);
    }
    
    if (filtros.sexo) {
      query = query.where('jurados.sexo', filtros.sexo);
    }
    
    if (filtros.instituicao_id) {
      query = query.where('jurados.instituicao_id', filtros.instituicao_id);
    }
    
    if (filtros.busca) {
      query = query.where(function() {
        this.where('jurados.nome_completo', 'like', `%${filtros.busca}%`)
            .orWhere('jurados.cpf', 'like', `%${filtros.busca}%`)
            .orWhere('jurados.profissao', 'like', `%${filtros.busca}%`)
            .orWhere('jurados.email', 'like', `%${filtros.busca}%`);
      });
    }
    
    return await query.orderBy('jurados.nome_completo');
  }

  static async buscarPorId(id) {
    return await db('jurados')
      .where('id', id)
      .first();
  }

  static async buscarPorCpf(cpf) {
    return await db('jurados')
      .where('cpf', cpf)
      .first();
  }

  static async atualizar(id, dados) {
    const updateData = { ...dados };
    
    // Filtrar apenas campos válidos da tabela jurados
    const validFields = [
      'nome_completo', 'cpf', 'rg', 'data_nascimento', 'sexo',
      'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'uf', 'cep',
      'email', 'telefone', 'profissao', 'observacoes', 'status', 'motivo',
      'suspenso_ate', 'ultimo_conselho', 'instituicao_id', 'foto_path'
    ];
    
    const filteredData = {};
    validFields.forEach(field => {
      if (updateData[field] !== undefined && updateData[field] !== '') {
        // Tratar campos numéricos vazios
        if (field === 'instituicao_id' && updateData[field] === '') {
          filteredData[field] = null;
        } else {
          filteredData[field] = updateData[field];
        }
      }
    });
    
    // Converter campos de texto para maiúsculo, exceto campos específicos
    Object.keys(filteredData).forEach(key => {
      if (typeof filteredData[key] === 'string' && 
          !['cpf', 'rg', 'email', 'telefone', 'cep', 'sexo', 'status', 'motivo'].includes(key)) {
        filteredData[key] = filteredData[key].toUpperCase();
      }
    });
    
    if (filteredData.email) {
      filteredData.email = filteredData.email.toLowerCase();
    }
    
    // Garantir que motivo tenha a capitalização correta conforme ENUM
    if (filteredData.motivo) {
      const motivoMap = {
        'OUTRA COMARCA': 'Outra Comarca',
        'FALECIDO': 'Falecido',
        'INCAPACITADO': 'Incapacitado',
        '12 MESES': '12 meses',
        'IMPEDIMENTO': 'Impedimento',
        'IDADE': 'Idade',
        'TEMPORÁRIO': 'Temporário'
      };
      filteredData.motivo = motivoMap[filteredData.motivo] || filteredData.motivo;
    }
    
    // Lógica para campo motivo
    if (filteredData.status === 'Ativo') {
      filteredData.motivo = null;
      filteredData.suspenso_ate = null;
    }
    
    // Lógica para último conselho
    if (filteredData.ultimo_conselho) {
      const anoAtual = new Date().getFullYear();
      // Extrair o ano diretamente da string YYYY-MM-DD para evitar problemas de timezone
      const anoUltimoConselho = typeof filteredData.ultimo_conselho === 'string' && filteredData.ultimo_conselho.match(/^\d{4}-\d{2}-\d{2}$/)
        ? parseInt(filteredData.ultimo_conselho.split('-')[0], 10)
        : new Date(filteredData.ultimo_conselho).getFullYear();
      
      if (anoUltimoConselho === anoAtual - 1 && !['Outra Comarca', 'Falecido', 'Incapacitado', 'Impedimento', 'Idade'].includes(filteredData.motivo)) {
        filteredData.status = 'Inativo';
        filteredData.motivo = '12 meses';
      }
    }
    
    // SQLite não suporta returning('*') da mesma forma
    await db('jurados')
      .where('id', id)
      .update(filteredData);
    
    const jurado = await db('jurados').where('id', id).first();
    
    return jurado;
  }

  static async excluir(id) {
    console.log('=== DEBUG MODELO EXCLUIR ===');
    console.log('ID para exclusão:', id);
    
    const resultado = await db('jurados')
      .where('id', id)
      .del();
    
    console.log('Resultado do delete:', resultado);
    return resultado;
  }

  static async reativarSuspensosAutomaticamente() {
    const hoje = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    const juradosParaReativar = await db('jurados')
      .where('status', 'Inativo')
      .where('motivo', 'Temporário')
      .where('suspenso_ate', '<=', hoje);
    
    if (juradosParaReativar.length > 0) {
      await db('jurados')
        .whereIn('id', juradosParaReativar.map(j => j.id))
        .update({
          status: 'Ativo',
          motivo: null,
          suspenso_ate: null
        });
      
      console.log(`${juradosParaReativar.length} jurados foram reativados automaticamente.`);
      return juradosParaReativar.length;
    }
    
    return 0;
  }

  static async listarElegiveis(anoReferencia) {
    // Calcular ano de nascimento máximo para ter pelo menos 18 anos no ano de referência
    const anoNascimentoMaximo = anoReferencia - 18;
    
    // Debug: log para verificar os parâmetros
    console.log(`[Jurado.listarElegiveis] Ano de referência: ${anoReferencia}`);
    console.log(`[Jurado.listarElegiveis] Ano de nascimento máximo (idade mínima 18): ${anoNascimentoMaximo}`);
    console.log(`[Jurado.listarElegiveis] Ano máximo do último conselho: ${anoReferencia - 2}`);
    
    // Primeiro verificar quantos jurados ativos existem
    const totalAtivos = await db('jurados').where('status', 'Ativo').count('* as total').first();
    console.log(`[Jurado.listarElegiveis] Total de jurados ativos: ${totalAtivos.total}`);
    
    // Construir query passo a passo para identificar problemas
    // Começar apenas com status Ativo
    let resultado = await db('jurados')
      .where('status', 'Ativo')
      .orderBy('nome_completo');
    
    console.log(`[Jurado.listarElegiveis] Jurados ativos encontrados: ${resultado.length}`);
    
    // Filtrar por ultimo_conselho: deve ser null ou anterior ao ano anterior ao de referência
    resultado = resultado.filter(jurado => {
      if (!jurado.ultimo_conselho) {
        return true; // null = elegível
      }
      // Extrair o ano diretamente da string YYYY-MM-DD para evitar problemas de timezone
      const anoUltimoConselho = typeof jurado.ultimo_conselho === 'string' && jurado.ultimo_conselho.match(/^\d{4}-\d{2}-\d{2}/)
        ? parseInt(jurado.ultimo_conselho.split('-')[0], 10)
        : new Date(jurado.ultimo_conselho).getFullYear();
      return anoUltimoConselho < (anoReferencia - 1);
    });
    
    console.log(`[Jurado.listarElegiveis] Após filtrar ultimo_conselho: ${resultado.length}`);
    
    // Filtrar por idade: data_nascimento null ou nascido no anoNascimentoMaximo ou antes
    resultado = resultado.filter(jurado => {
      if (!jurado.data_nascimento) {
        return true; // null = elegível (não podemos verificar idade)
      }
      // Extrair o ano diretamente da string YYYY-MM-DD para evitar problemas de timezone
      const anoNascimento = typeof jurado.data_nascimento === 'string' && jurado.data_nascimento.match(/^\d{4}-\d{2}-\d{2}/)
        ? parseInt(jurado.data_nascimento.split('-')[0], 10)
        : new Date(jurado.data_nascimento).getFullYear();
      return anoNascimento <= anoNascimentoMaximo;
    });
    
    console.log(`[Jurado.listarElegiveis] Após filtrar idade: ${resultado.length}`);
    console.log(`[Jurado.listarElegiveis] Total de jurados elegíveis encontrados: ${resultado.length}`);
    
    return resultado;
  }

  static async contar() {
    const result = await db('jurados').count('* as total').first();
    return parseInt(result.total);
  }

  static async contarPorStatus(status) {
    const result = await db('jurados')
      .where('status', status)
      .count('* as total')
      .first();
    return parseInt(result.total);
  }

  static async importarCSV(dados) {
    const resultados = {
      sucessos: 0,
      erros: 0,
      duplicados: 0,
      detalhes: []
    };
    
    for (const linha of dados) {
      try {
        // Verificar se CPF já existe
        const existente = await this.buscarPorCpf(linha.cpf);
        if (existente) {
          resultados.duplicados++;
          resultados.detalhes.push(`CPF ${linha.cpf} já existe - ignorado`);
          continue;
        }
        
        // Validar idade mínima
        if (linha.data_nascimento) {
          const idade = new Date().getFullYear() - new Date(linha.data_nascimento).getFullYear();
          if (idade < 18) {
            resultados.erros++;
            resultados.detalhes.push(`CPF ${linha.cpf} - idade menor que 18 anos`);
            continue;
          }
        }
        
        await this.criar(linha);
        resultados.sucessos++;
        
      } catch (error) {
        resultados.erros++;
        resultados.detalhes.push(`Erro no CPF ${linha.cpf}: ${error.message}`);
      }
    }
    
    return resultados;
  }
}

module.exports = Jurado;
