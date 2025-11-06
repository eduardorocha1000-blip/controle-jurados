const db = require('../config/database');

class Juiz {
  static async criar(dados) {
    console.log('=== INÍCIO DO MÉTODO CRIAR ===');
    console.log('Dados recebidos:', dados);
    
    const updateData = { ...dados };
    
    // Tratar strings vazias como null
    if (updateData.matricula && updateData.matricula.trim() === '') {
      updateData.matricula = null;
    }
    if (updateData.email && (updateData.email.trim() === '' || updateData.email.trim() === '@')) {
      updateData.email = null;
    }
    if (updateData.telefone && updateData.telefone.trim() === '') {
      updateData.telefone = null;
    }
    if (updateData.observacoes && updateData.observacoes.trim() === '') {
      updateData.observacoes = null;
    }
    
    // Converter campos de texto para maiúsculo
    if (updateData.nome_completo) {
      updateData.nome_completo = updateData.nome_completo.toUpperCase();
    }
    if (updateData.vara && updateData.vara.trim() !== '') {
      updateData.vara = updateData.vara.toUpperCase();
    }
    if (updateData.comarca && updateData.comarca.trim() !== '') {
      updateData.comarca = updateData.comarca.toUpperCase();
    }
    if (updateData.observacoes && updateData.observacoes.trim() !== '') {
      updateData.observacoes = updateData.observacoes.toUpperCase();
    }
    if (updateData.email && updateData.email.trim() !== '') {
      updateData.email = updateData.email.toLowerCase();
    }
    
    // Valores padrão
    if (!updateData.vara) {
      updateData.vara = 'Vara Única';
    }
    if (!updateData.comarca) {
      updateData.comarca = 'Capivari de Baixo';
    }
    if (!updateData.status) {
      updateData.status = 'Ativo';
    }
    
    console.log('Dados processados:', updateData);
    
    // Se este juiz for marcado como titular, desmarcar outros
    if (updateData.titular === 'Sim') {
      console.log('Desmarcando outros juízes como titular...');
      await db('juizes').update({ titular: 'Não' });
    }
    
    console.log('Inserindo no banco de dados...');
    const [id] = await db('juizes').insert(updateData);
    console.log('ID inserido:', id);
    
    // Garantir que sempre haja um titular
    await Juiz.garantirTitularUnico();
    
    console.log('Buscando juiz inserido...');
    const juiz = await db('juizes').where('id', id).first();
    console.log('Juiz encontrado:', juiz);
    
    console.log('=== FIM DO MÉTODO CRIAR ===');
    return juiz;
  }

  static async listar(filtros = {}) {
    let query = db('juizes');
    
    if (filtros.status) {
      query = query.where('status', filtros.status);
    }
    
    if (filtros.titular) {
      query = query.where('titular', filtros.titular);
    }
    
    if (filtros.busca) {
      const termo = `%${filtros.busca}%`;
      query = query.where(function() {
        this.where('nome_completo', 'like', termo)
          .orWhere('email', 'like', termo)
          .orWhere('vara', 'like', termo)
          .orWhere('comarca', 'like', termo);
      });
    }
    
    return await query.orderBy('nome_completo');
  }

  static async buscarPorId(id) {
    return await db('juizes')
      .where('id', id)
      .first();
  }

  static async atualizar(id, dados) {
    const updateData = { ...dados };
    
    // Tratar strings vazias como null
    if (updateData.matricula && updateData.matricula.trim() === '') {
      updateData.matricula = null;
    }
    if (updateData.email && (updateData.email.trim() === '' || updateData.email.trim() === '@')) {
      updateData.email = null;
    }
    if (updateData.telefone && updateData.telefone.trim() === '') {
      updateData.telefone = null;
    }
    if (updateData.observacoes && updateData.observacoes.trim() === '') {
      updateData.observacoes = null;
    }
    
    // Converter campos de texto para maiúsculo
    if (updateData.nome_completo) {
      updateData.nome_completo = updateData.nome_completo.toUpperCase();
    }
    if (updateData.vara && updateData.vara.trim() !== '') {
      updateData.vara = updateData.vara.toUpperCase();
    }
    if (updateData.comarca && updateData.comarca.trim() !== '') {
      updateData.comarca = updateData.comarca.toUpperCase();
    }
    if (updateData.observacoes && updateData.observacoes.trim() !== '') {
      updateData.observacoes = updateData.observacoes.toUpperCase();
    }
    if (updateData.email && updateData.email.trim() !== '') {
      updateData.email = updateData.email.toLowerCase();
    }
    
    // Valores padrão
    if (!updateData.vara) {
      updateData.vara = 'Vara Única';
    }
    if (!updateData.comarca) {
      updateData.comarca = 'Capivari de Baixo';
    }
    if (!updateData.status) {
      updateData.status = 'Ativo';
    }
    
    // Se este juiz for marcado como titular, desmarcar outros
    if (updateData.titular === 'Sim') {
      await db('juizes').where('id', '!=', id).update({ titular: 'Não' });
    }
    
    await db('juizes').where('id', id).update(updateData);
    
    // Garantir que sempre haja um titular
    await Juiz.garantirTitularUnico();
    
    const juiz = await db('juizes').where('id', id).first();
    
    return juiz;
  }

  static async excluir(id) {
    const resultado = await db('juizes')
      .where('id', id)
      .del();
    
    // Garantir que sempre haja um titular após excluir
    await Juiz.garantirTitularUnico();
    
    return resultado;
  }

  static async buscarTitular() {
    return await db('juizes')
      .where('titular', 'Sim')
      .first();
  }

  static async listarAtivos() {
    return await db('juizes')
      .where('status', 'Ativo')
      .orderBy('nome_completo');
  }

  /**
   * Garante que sempre haja exatamente um juiz titular na vara.
   * Regras:
   * - Se houver apenas um juiz cadastrado e ele não for titular, torna ele titular
   * - Se todos os juízes estiverem como titular "Não", torna o primeiro ativo titular
   */
  static async garantirTitularUnico() {
    try {
      // Contar total de juízes
      const totalJuizes = await db('juizes').count('* as total').first();
      const total = parseInt(totalJuizes.total || 0);
      
      // Se não houver juízes, não fazer nada
      if (total === 0) {
        return;
      }
      
      // Contar quantos são titulares
      const titulares = await db('juizes')
        .where('titular', 'Sim')
        .count('* as total')
        .first();
      const totalTitulares = parseInt(titulares.total || 0);
      
      // Se houver apenas um juiz e ele não for titular, torná-lo titular
      if (total === 1) {
        const unicoJuiz = await db('juizes').first();
        if (unicoJuiz && unicoJuiz.titular !== 'Sim') {
          console.log(`[Juiz] Apenas um juiz cadastrado (${unicoJuiz.nome_completo}). Tornando titular.`);
          await db('juizes').where('id', unicoJuiz.id).update({ titular: 'Sim' });
        }
        return;
      }
      
      // Se não houver nenhum titular, tornar o primeiro ativo titular
      if (totalTitulares === 0) {
        const primeiroAtivo = await db('juizes')
          .where('status', 'Ativo')
          .orderBy('nome_completo')
          .first();
        
        if (primeiroAtivo) {
          console.log(`[Juiz] Nenhum titular encontrado. Tornando ${primeiroAtivo.nome_completo} titular.`);
          await db('juizes').where('id', primeiroAtivo.id).update({ titular: 'Sim' });
        } else {
          // Se não houver ativo, tornar o primeiro da lista titular
          const primeiro = await db('juizes')
            .orderBy('nome_completo')
            .first();
          if (primeiro) {
            console.log(`[Juiz] Nenhum ativo encontrado. Tornando ${primeiro.nome_completo} titular.`);
            await db('juizes').where('id', primeiro.id).update({ titular: 'Sim' });
          }
        }
        return;
      }
      
      // Se houver mais de um titular, manter apenas o primeiro
      if (totalTitulares > 1) {
        const titularesList = await db('juizes')
          .where('titular', 'Sim')
          .orderBy('nome_completo')
          .limit(1);
        
        if (titularesList.length > 0) {
          const manterTitular = titularesList[0];
          console.log(`[Juiz] Múltiplos titulares encontrados. Mantendo apenas ${manterTitular.nome_completo} como titular.`);
          await db('juizes')
            .where('titular', 'Sim')
            .where('id', '!=', manterTitular.id)
            .update({ titular: 'Não' });
        }
      }
    } catch (error) {
      console.error('[Juiz] Erro ao garantir titular único:', error);
      // Não lançar erro para não quebrar o fluxo
    }
  }
}

module.exports = Juiz;
