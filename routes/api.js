const express = require('express');
const db = require('../config/database');
const router = express.Router();

// Estatísticas gerais
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      totalJurados: 0,
      totalInstituicoes: 0,
      totalSorteios: 0,
      totalCedulas: 0,
      totalEditais: 0,
      totalIndicacoes: 0
    };

    // Tentar buscar estatísticas das tabelas existentes
    try {
      const juradosCount = await db('jurados').count('* as count').first();
      stats.totalJurados = juradosCount.count || 0;
    } catch (error) {
      console.warn('Tabela jurados não encontrada');
    }

    try {
      const instituicoesCount = await db('instituicoes').count('* as count').first();
      stats.totalInstituicoes = instituicoesCount.count || 0;
    } catch (error) {
      console.warn('Tabela instituicoes não encontrada');
    }

    try {
      const sorteiosCount = await db('sorteios').count('* as count').first();
      stats.totalSorteios = sorteiosCount.count || 0;
    } catch (error) {
      console.warn('Tabela sorteios não encontrada');
    }

    try {
      const cedulasCount = await db('cedulas').count('* as count').first();
      stats.totalCedulas = cedulasCount.count || 0;
    } catch (error) {
      console.warn('Tabela cedulas não encontrada');
    }

    try {
      const editaisCount = await db('editais').count('* as count').first();
      stats.totalEditais = editaisCount.count || 0;
    } catch (error) {
      console.warn('Tabela editais não encontrada');
    }

    try {
      const indicacoesCount = await db('indicacoes').count('* as count').first();
      stats.totalIndicacoes = indicacoesCount.count || 0;
    } catch (error) {
      console.warn('Tabela indicacoes não encontrada');
    }

    res.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// Buscar instituições ativas
router.get('/instituicoes/ativas', async (req, res) => {
  try {
    let query = db('instituicoes');
    
    // Verificar se existe coluna status
    try {
      query = query.where('status', 'Ativo');
    } catch (error) {
      // Se não existir coluna status, buscar todas
      console.warn('Coluna status não encontrada na tabela instituicoes');
    }
    
    const instituicoes = await query.select('id', 'nome', 'tipo', 'contato_email');
    res.json(instituicoes);
  } catch (error) {
    console.error('Erro ao buscar instituições:', error);
    res.status(500).json({ error: 'Erro ao buscar instituições' });
  }
});

// Buscar juízes ativos
router.get('/juizes/ativos', async (req, res) => {
  try {
    let query = db('juizes');
    
    // Verificar se existe coluna status
    try {
      query = query.where('status', 'Ativo');
    } catch (error) {
      // Se não existir coluna status, buscar todas
      console.warn('Coluna status não encontrada na tabela juizes');
    }
    
    const juizes = await query.select('id', 'nome_completo', 'matricula', 'email');
    res.json(juizes);
  } catch (error) {
    console.error('Erro ao buscar juízes:', error);
    res.status(500).json({ error: 'Erro ao buscar juízes' });
  }
});

// Buscar jurados elegíveis
router.get('/jurados/elegiveis/:ano', async (req, res) => {
  try {
    const ano = parseInt(req.params.ano);
    
    let query = db('jurados');
    
    // Verificar se existe coluna status
    try {
      query = query.where('status', 'Ativo');
    } catch (error) {
      console.warn('Coluna status não encontrada na tabela jurados');
    }
    
    // Verificar se existe coluna ano_referencia
    try {
      query = query.where('ano_referencia', ano);
    } catch (error) {
      console.warn('Coluna ano_referencia não encontrada na tabela jurados');
    }
    
    const jurados = await query.select('id', 'nome_completo', 'cpf', 'instituicao_id');
    res.json(jurados);
  } catch (error) {
    console.error('Erro ao buscar jurados elegíveis:', error);
    res.status(500).json({ error: 'Erro ao buscar jurados elegíveis' });
  }
});

// Buscar sorteios por ano
router.get('/sorteios/:ano', async (req, res) => {
  try {
    const ano = parseInt(req.params.ano);
    
    let query = db('sorteios');
    
    // Verificar se existe coluna ano_referencia
    try {
      query = query.where('ano_referencia', ano);
    } catch (error) {
      console.warn('Coluna ano_referencia não encontrada na tabela sorteios');
    }
    
    const sorteios = await query.select('id', 'numero_processo', 'data_juri', 'status');
    res.json(sorteios);
  } catch (error) {
    console.error('Erro ao buscar sorteios:', error);
    res.status(500).json({ error: 'Erro ao buscar sorteios' });
  }
});

// Buscar cédulas por sorteio
router.get('/cedulas/sorteio/:sorteioId', async (req, res) => {
  try {
    const sorteioId = parseInt(req.params.sorteioId);
    
    const cedulas = await db('cedulas')
      .where('sorteio_id', sorteioId)
      .select('id', 'numero_cedula', 'status', 'created_at');
    
    res.json(cedulas);
  } catch (error) {
    console.error('Erro ao buscar cédulas:', error);
    res.status(500).json({ error: 'Erro ao buscar cédulas' });
  }
});

// Buscar editais por ano
router.get('/editais/:ano', async (req, res) => {
  try {
    const ano = parseInt(req.params.ano);
    
    let query = db('editais');
    
    // Verificar se existe coluna ano_referencia
    try {
      query = query.where('ano_referencia', ano);
    } catch (error) {
      console.warn('Coluna ano_referencia não encontrada na tabela editais');
    }
    
    const editais = await query.select('id', 'numero', 'titulo', 'status', 'created_at');
    res.json(editais);
  } catch (error) {
    console.error('Erro ao buscar editais:', error);
    res.status(500).json({ error: 'Erro ao buscar editais' });
  }
});

// Buscar indicações por ano
router.get('/indicacoes/:ano', async (req, res) => {
  try {
    const ano = parseInt(req.params.ano);
    
    let query = db('indicacoes')
      .leftJoin('instituicoes', 'indicacoes.instituicao_id', 'instituicoes.id')
      .select(
        'indicacoes.*',
        'instituicoes.nome as instituicao_nome'
      );
    
    // Verificar se existe coluna ano_referencia
    try {
      query = query.where('indicacoes.ano_referencia', ano);
    } catch (error) {
      console.warn('Coluna ano_referencia não encontrada na tabela indicacoes');
    }
    
    const indicacoes = await query;
    res.json(indicacoes);
  } catch (error) {
    console.error('Erro ao buscar indicações:', error);
    res.status(500).json({ error: 'Erro ao buscar indicações' });
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

module.exports = router;