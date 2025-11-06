const express = require('express');
const { body, validationResult } = require('express-validator');
const Juiz = require('../models/Juiz');
const db = require('../config/database');
const router = express.Router();

// Listar juízes
router.get('/', async (req, res) => {
  try {
    const filtros = {
      status: req.query.status,
      titular: req.query.titular,
      busca: req.query.busca
    };

    const juizes = await Juiz.listar(filtros);
    
    // Calcular estatísticas
    const totalJuizes = juizes.length;
    const juizesTitulares = juizes.filter(j => j.titular === 'Sim').length;
    const juizesAtivos = juizes.filter(j => j.status === 'Ativo').length;
    const juizesInativos = juizes.filter(j => j.status === 'Inativo').length;

    res.render('juizes/index', {
      title: 'Juízes - Controle de Jurados',
      juizes,
      filtros,
      busca: req.query.busca,
      status: req.query.status,
      titular: req.query.titular,
      totalJuizes,
      juizesTitulares,
      juizesAtivos,
      juizesInativos,
      messages: req.flash()
    });
  } catch (error) {
    console.error('Erro ao listar juízes:', error);
    res.render('error', {
      title: 'Erro',
      message: 'Erro ao carregar lista de juízes',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Formulário novo juiz
router.get('/novo', (req, res) => {
  res.render('juizes/form', {
    title: 'Novo Juiz - Controle de Jurados',
    juiz: {},
    action: '/juizes',
    messages: req.flash()
  });
});

// Criar juiz
router.post('/', [
  body('nome_completo').isLength({ min: 2, max: 100 }).trim(),
  body('matricula').optional({ checkFalsy: true }).isLength({ min: 1, max: 20 }).trim(),
  body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
  body('telefone').optional({ checkFalsy: true }).isLength({ min: 10, max: 20 }),
  body('sexo').isIn(['Masculino', 'Feminino']),
  body('titular').isIn(['Sim', 'Não']),
  body('status').isIn(['Ativo', 'Inativo']),
  body('observacoes').optional({ checkFalsy: true }).isLength({ max: 500 })
], async (req, res) => {
  try {
    console.log('Dados recebidos:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Erros de validação:', errors.array());
      return res.render('juizes/form', {
        title: 'Novo Juiz - Controle de Jurados',
        juiz: req.body,
        action: '/juizes',
        errors: errors.array(),
        messages: req.flash()
      });
    }

    console.log('Criando juiz...');
    await Juiz.criar(req.body);
    console.log('Juiz criado com sucesso!');
    
    req.flash('success', 'Juiz criado com sucesso!');
    res.redirect('/juizes');
  } catch (error) {
    console.error('Erro ao criar juiz:', error);
    req.flash('error', 'Erro ao criar juiz: ' + error.message);
    res.redirect('/juizes/novo');
  }
});

// Visualizar juiz
router.get('/view/:id', async (req, res) => {
  try {
    const juiz = await Juiz.buscarPorId(req.params.id);
    if (!juiz) {
      return res.status(404).render('error', {
        title: 'Juiz não encontrado',
        message: 'O juiz solicitado não foi encontrado.',
        error: {}
      });
    }

    // Buscar estatísticas do juiz (versão simplificada)
    const db = require('../config/database');
    let stats = {
      totalSorteios: 0,
      sorteiosRealizados: 0,
      sorteiosAtivos: 0,
      totalJurados: 0
    };
    
    let sorteios = [];

    try {
      // Verificar se a tabela sorteios existe
      const tableExists = await db.schema.hasTable('sorteios');
      
      if (tableExists) {
        const sorteiosCount = await db('sorteios')
          .where('juiz_responsavel_id', req.params.id)
          .count('* as total')
          .first();
        
        stats.totalSorteios = sorteiosCount.total || 0;

        // Buscar sorteios recentes do juiz
        sorteios = await db('sorteios')
          .where('juiz_responsavel_id', req.params.id)
          .orderBy('data_realizacao', 'desc')
          .limit(5);
      }
    } catch (dbError) {
      console.log('Tabelas de sorteios ainda não criadas ou sem dados:', dbError.message);
    }

    res.render('juizes/view', {
      title: `${juiz.nome_completo} - Controle de Jurados`,
      juiz,
      stats: {
        totalSorteios: stats.totalSorteios || 0,
        sorteiosRealizados: stats.sorteiosRealizados || 0,
        sorteiosAtivos: stats.sorteiosAtivos || 0,
        totalJurados: stats.totalJurados || 0
      },
      sorteios,
      messages: req.flash()
    });
  } catch (error) {
    console.error('Erro ao visualizar juiz:', error);
    res.render('error', {
      title: 'Erro',
      message: 'Erro ao carregar dados do juiz',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Formulário editar juiz
router.get('/:id/editar', async (req, res) => {
  try {
    const juiz = await Juiz.buscarPorId(req.params.id);
    if (!juiz) {
      req.flash('error', 'Juiz não encontrado');
      return res.redirect('/juizes');
    }

    res.render('juizes/form', {
      title: `Editar Juiz ${juiz.nome_completo} - Controle de Jurados`,
      juiz,
      action: `/juizes/${juiz.id}?_method=PUT`,
      messages: req.flash()
    });
  } catch (error) {
    console.error('Erro ao carregar formulário de edição:', error);
    req.flash('error', 'Erro ao carregar formulário de edição');
    res.redirect('/juizes');
  }
});

// Atualizar juiz
router.put('/:id', [
  body('nome_completo').isLength({ min: 2, max: 100 }).trim(),
  body('matricula').optional({ checkFalsy: true }).isLength({ min: 1, max: 20 }).trim(),
  body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
  body('telefone').optional({ checkFalsy: true }).isLength({ min: 10, max: 20 }),
  body('sexo').isIn(['Masculino', 'Feminino']),
  body('titular').isIn(['Sim', 'Não']),
  body('status').isIn(['Ativo', 'Inativo']),
  body('observacoes').optional({ checkFalsy: true }).isLength({ max: 500 })
], async (req, res) => {
  try {
    console.log('Atualizando juiz ID:', req.params.id);
    console.log('Dados recebidos:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Erros de validação:', errors.array());
      const juiz = await Juiz.buscarPorId(req.params.id);
      return res.render('juizes/form', {
        title: `Editar Juiz ${juiz.nome_completo} - Controle de Jurados`,
        juiz: { ...juiz, ...req.body },
        action: `/juizes/${req.params.id}?_method=PUT`,
        errors: errors.array(),
        messages: req.flash()
      });
    }

    // Regra: deve existir pelo menos um titular "Sim"
    if (req.body && req.body.titular === 'Não') {
      const outrosTitulares = await db('juizes')
        .where('id', '!=', req.params.id)
        .andWhere('titular', 'Sim')
        .count('* as total')
        .first();
      const totalOutrosTitulares = parseInt((outrosTitulares && outrosTitulares.total) || 0);
      if (totalOutrosTitulares === 0) {
        const juiz = await Juiz.buscarPorId(req.params.id);
        req.flash('error', 'Pelo menos um Juiz deve ser titular da Vara');
        return res.render('juizes/form', {
          title: `Editar Juiz ${juiz.nome_completo} - Controle de Jurados`,
          juiz: { ...juiz, ...req.body, titular: 'Sim' },
          action: `/juizes/${req.params.id}?_method=PUT`,
          messages: req.flash()
        });
      }
    }

    console.log('Atualizando juiz no banco...');
    await Juiz.atualizar(req.params.id, req.body);
    console.log('Juiz atualizado com sucesso!');
    
    req.flash('success', 'Juiz atualizado com sucesso!');
    res.redirect('/juizes');
  } catch (error) {
    console.error('Erro ao atualizar juiz:', error);
    req.flash('error', 'Erro ao atualizar juiz: ' + error.message);
    res.redirect('/juizes');
  }
});

// Excluir juiz
router.delete('/:id', async (req, res) => {
  try {
    await Juiz.excluir(req.params.id);
    req.flash('success', 'Juiz excluído com sucesso!');
    res.redirect('/juizes');
  } catch (error) {
    console.error('Erro ao excluir juiz:', error);
    req.flash('error', 'Erro ao excluir juiz');
    res.redirect('/juizes');
  }
});

// Listar juízes ativos (API)
router.get('/api/ativos', async (req, res) => {
  try {
    const juizes = await Juiz.listarAtivos();
    res.json(juizes);
  } catch (error) {
    console.error('Erro ao listar juízes ativos:', error);
    res.status(500).json({ error: 'Erro ao listar juízes' });
  }
});

module.exports = router;