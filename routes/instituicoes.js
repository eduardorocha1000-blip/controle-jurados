const express = require('express');
const { body, validationResult } = require('express-validator');
const Instituicao = require('../models/Instituicao');
const router = express.Router();

// Listar instituições
router.get('/', async (req, res) => {
  try {
    const filtros = {
      ativo: req.query.status, // 'Sim' | 'Não'
      busca: req.query.busca   // Busca por nome
    };

    const instituicoes = await Instituicao.listar(filtros);
    
    // Calcular estatísticas
    const totalInstituicoes = instituicoes.length;
    const instituicoesAtivas = instituicoes.filter(i => i.ativo === 'Sim').length;
    const instituicoesInativas = instituicoes.filter(i => i.ativo === 'Não').length;
    
    // Calcular total de jurados por instituição
    const instituicoesComJurados = await Promise.all(
      instituicoes.map(async (instituicao) => {
        const totalJurados = await Instituicao.contarJurados(instituicao.id);
        return { ...instituicao, total_jurados: totalJurados };
      })
    );
    
    const totalJurados = instituicoesComJurados.reduce((sum, i) => sum + i.total_jurados, 0);

    res.render('instituicoes/index', {
      title: 'Instituições - Controle de Jurados',
      instituicoes: instituicoesComJurados,
      filtros,
      totalInstituicoes,
      instituicoesAtivas,
      instituicoesInativas,
      totalJurados,
      busca: req.query.busca,
      status: req.query.status
    });
  } catch (error) {
    console.error('Erro ao listar instituições:', error);
    res.render('error', {
      title: 'Erro',
      message: 'Erro ao carregar lista de instituições',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Formulário nova instituição
router.get('/novo', (req, res) => {
  res.render('instituicoes/form', {
    title: 'Nova Instituição - Controle de Jurados',
    instituicao: {},
    action: '/instituicoes'
  });
});

// Criar instituição
router.post('/', [
  // Mensagens claras e limites alinhados ao schema
  body('nome')
    .trim()
    .isLength({ min: 2, max: 60 })
    .withMessage('Nome da Instituição deve ter entre 2 e 60 caracteres.'),
  body('contato_nome')
    .trim()
    .isLength({ min: 2, max: 45 })
    .withMessage('Nome do Contato deve ter entre 2 e 45 caracteres.'),
  body('contato_email')
    .isEmail().withMessage('E-mail do Contato inválido.')
    .isLength({ max: 45 }).withMessage('E-mail do Contato deve ter até 45 caracteres.')
    .normalizeEmail(),
  body('contato_telefone')
    .trim()
    .isLength({ min: 8, max: 15 })
    .withMessage('Telefone deve ter de 8 a 15 caracteres.'),
  body('endereco')
    .optional({ checkFalsy: true })
    .isLength({ max: 60 })
    .withMessage('Endereço deve ter até 60 caracteres.'),
  body('quantidade')
    .isInt({ min: 1, max: 99 })
    .withMessage('Quantidade deve ser um número entre 1 e 99.'),
  body('ativo')
    .isIn(['Sim', 'Não'])
    .withMessage('Status inválido. Selecione Ativo ou Inativo.'),
  body('cidade')
    .optional({ checkFalsy: true })
    .isLength({ max: 45 })
    .withMessage('Cidade deve ter até 45 caracteres.'),
  body('uf')
    .optional({ checkFalsy: true })
    .isLength({ min: 2, max: 2 })
    .withMessage('UF deve ter 2 letras.'),
  body('cep')
    .optional({ checkFalsy: true })
    .isLength({ max: 9 })
    .withMessage('CEP deve ter até 9 caracteres.'),
  body('cnpj')
    .optional({ checkFalsy: true })
    .isLength({ max: 18 })
    .withMessage('CNPJ deve ter até 18 caracteres.')
], async (req, res) => {
  try {
    console.log('[Instituicoes] POST /instituicoes body:', req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('instituicoes/form', {
        title: 'Nova Instituição - Controle de Jurados',
        instituicao: req.body,
        action: '/instituicoes',
        errors: errors.array()
      });
    }

    const criada = await Instituicao.criar(req.body);
    console.log('[Instituicoes] Criada com ID:', criada && criada.id, 'Registro:', criada);
    req.flash = req.flash || {};
    req.flash.success = 'Instituição criada com sucesso!';
    res.redirect('/instituicoes');
  } catch (error) {
    console.error('Erro ao criar instituição:', error);
    res.render('instituicoes/form', {
      title: 'Nova Instituição - Controle de Jurados',
      instituicao: req.body,
      action: '/instituicoes',
      error: `Erro ao criar instituição: ${error.message}`
    });
  }
});

// Visualizar instituição
router.get('/:id', async (req, res) => {
  try {
    const instituicao = await Instituicao.buscarPorId(req.params.id);
    if (!instituicao) {
      return res.status(404).render('error', {
        title: 'Instituição não encontrada',
        message: 'A instituição solicitada não foi encontrada.',
        error: {}
      });
    }

    // Buscar total de jurados desta instituição
    const totalJurados = await Instituicao.contarJurados(instituicao.id);

    res.render('instituicoes/view', {
      title: `${instituicao.nome} - Controle de Jurados`,
      instituicao,
      totalJurados
    });
  } catch (error) {
    console.error('Erro ao visualizar instituição:', error);
    res.render('error', {
      title: 'Erro',
      message: 'Erro ao carregar dados da instituição',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Formulário editar instituição
router.get('/:id/editar', async (req, res) => {
  try {
    const instituicao = await Instituicao.buscarPorId(req.params.id);
    if (!instituicao) {
      return res.status(404).render('error', {
        title: 'Instituição não encontrada',
        message: 'A instituição solicitada não foi encontrada.',
        error: {}
      });
    }

    res.render('instituicoes/form', {
      title: `Editar Instituição ${instituicao.nome} - Controle de Jurados`,
      instituicao,
      action: `/instituicoes/${instituicao.id}?_method=PUT`
    });
  } catch (error) {
    console.error('Erro ao carregar formulário de edição:', error);
    res.render('error', {
      title: 'Erro',
      message: 'Erro ao carregar formulário de edição',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Atualizar instituição
router.put('/:id', [
  body('nome').isLength({ min: 2, max: 100 }).trim(),
  body('contato_nome').isLength({ min: 2, max: 100 }).trim(),
  body('contato_email').isEmail().normalizeEmail(),
  body('contato_telefone').isLength({ min: 8, max: 15 }),
  body('endereco').optional().isLength({ min: 5, max: 200 }).trim(),
  body('quantidade').isInt({ min: 1, max: 99 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const instituicao = await Instituicao.buscarPorId(req.params.id);
      return res.render('instituicoes/form', {
        title: `Editar Instituição ${instituicao.nome} - Controle de Jurados`,
        instituicao: { ...instituicao, ...req.body },
        action: `/instituicoes/${req.params.id}?_method=PUT`,
        errors: errors.array()
      });
    }

    await Instituicao.atualizar(req.params.id, req.body);
    req.flash = req.flash || {};
    req.flash.success = 'Instituição atualizada com sucesso!';
    res.redirect('/instituicoes');
  } catch (error) {
    console.error('Erro ao atualizar instituição:', error);
    res.render('instituicoes/form', {
      title: 'Erro ao atualizar',
      instituicao: { id: req.params.id, ...req.body },
      action: `/instituicoes/${req.params.id}?_method=PUT`,
      error: `Erro ao atualizar instituição: ${error.message}`
    });
  }
});

// Excluir instituição
router.delete('/:id', async (req, res) => {
  try {
    await Instituicao.excluir(req.params.id);
    req.flash = req.flash || {};
    req.flash.success = 'Instituição excluída com sucesso!';
    res.redirect('/instituicoes');
  } catch (error) {
    console.error('Erro ao excluir instituição:', error);
    req.flash = req.flash || {};
    req.flash.error = 'Erro ao excluir instituição';
    res.redirect('/instituicoes');
  }
});

// Listar instituições ativas (API)
router.get('/api/ativas', async (req, res) => {
  try {
    const instituicoes = await Instituicao.listarAtivas();
    res.json(instituicoes);
  } catch (error) {
    console.error('Erro ao listar instituições ativas:', error);
    res.status(500).json({ error: 'Erro ao listar instituições' });
  }
});

module.exports = router;