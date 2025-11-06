const express = require('express');
const { body, validationResult } = require('express-validator');
const Sorteio = require('../models/Sorteio');
const Jurado = require('../models/Jurado');
const Juiz = require('../models/Juiz');
const db = require('../config/database');
const router = express.Router();

// Listar sorteios
router.get('/', async (req, res) => {
  try {
    const filtros = {
      ano_referencia: req.query.ano_referencia,
      busca: req.query.busca
    };

    const sorteios = await Sorteio.listar(filtros);
    const juizes = await Juiz.listar();
    
    // Calcular estatísticas e quantidade de jurados por sorteio
    const totalSorteios = sorteios.length;
    const sorteiosRealizados = sorteios.filter(s => s.status === 'Realizado').length;
    const sorteiosPendentes = sorteios.filter(s => s.status === 'Agendado').length;
    

    res.render('sorteios/index', {
      title: 'Sorteios - Controle de Jurados',
      sorteios,
      juizes,
      filtros,
      totalSorteios,
      sorteiosRealizados,
      sorteiosPendentes,
      messages: req.flash ? req.flash() : {},
      user: req.session ? req.session.user : null
    });
  } catch (error) {
    console.error('Erro ao listar sorteios:', error);
    res.render('error', {
      title: 'Erro',
      message: 'Erro ao carregar lista de sorteios',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Formulário novo sorteio
router.get('/novo', async (req, res) => {
  try {
    const juizes = await Juiz.listar();
    res.render('sorteios/form', {
      title: 'Novo Sorteio - Controle de Jurados',
      sorteio: {
        ano_referencia: new Date().getFullYear() + 1
      },
      juizes,
      action: '/sorteios',
      messages: req.flash ? req.flash() : {},
      user: req.session ? req.session.user : null
    });
  } catch (error) {
    console.error('Erro ao carregar formulário:', error);
    res.render('error', {
      title: 'Erro',
      message: 'Erro ao carregar formulário',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Criar sorteio
router.post('/', [
  body('ano_referencia').isInt({ min: 2020, max: 2030 }),
  body('data_realizacao').isISO8601(),
  body('data_juri').isISO8601(),
  body('hora_juri').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('juiz_responsavel_id').isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const juizes = await Juiz.listar();
      return res.render('sorteios/form', {
        title: 'Novo Sorteio - Controle de Jurados',
        sorteio: req.body,
        juizes,
        action: '/sorteios',
        errors: errors.array(),
        messages: req.flash ? req.flash() : {},
        user: req.session ? req.session.user : null
      });
    }

    // Remover campos desnecessários do req.body
    const { _method, ...dadosCriacao } = req.body;
    await Sorteio.criar(dadosCriacao);
    req.flash = req.flash || function() { return { success: [] }; };
    req.flash('success', 'Sorteio criado com sucesso!');
    res.redirect('/sorteios');
  } catch (error) {
    console.error('Erro ao criar sorteio:', error);
    const juizes = await Juiz.listar();
    res.render('sorteios/form', {
      title: 'Novo Sorteio - Controle de Jurados',
      sorteio: req.body,
      juizes,
      action: '/sorteios',
      error: 'Erro ao criar sorteio: ' + error.message,
      messages: req.flash ? req.flash() : {},
      user: req.session ? req.session.user : null
    });
  }
});

// Visualizar sorteio
router.get('/:id', async (req, res) => {
  try {
    const sorteio = await Sorteio.buscarPorId(req.params.id);
    if (!sorteio) {
      return res.status(404).render('error', {
        title: 'Sorteio não encontrado',
        message: 'O sorteio solicitado não foi encontrado.',
        error: {}
      });
    }

    const jurados = await Sorteio.listarJurados(req.params.id);

    res.render('sorteios/view', {
      title: `Sorteio ${sorteio.id} - Controle de Jurados`,
      sorteio,
      jurados,
      messages: req.flash ? req.flash() : {},
      user: req.session ? req.session.user : null
    });
  } catch (error) {
    console.error('Erro ao visualizar sorteio:', error);
    res.render('error', {
      title: 'Erro',
      message: 'Erro ao carregar dados do sorteio: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Formulário editar sorteio
router.get('/:id/editar', async (req, res) => {
  try {
    const sorteio = await Sorteio.buscarPorId(req.params.id);
    if (!sorteio) {
      return res.status(404).render('error', {
        title: 'Sorteio não encontrado',
        message: 'O sorteio solicitado não foi encontrado.',
        error: {}
      });
    }

    const juizes = await Juiz.listar();
    res.render('sorteios/form', {
      title: `Editar Sorteio ${sorteio.id} - Controle de Jurados`,
      sorteio,
      juizes,
      action: `/sorteios/${sorteio.id}?_method=PUT`,
      messages: req.flash ? req.flash() : {},
      user: req.session ? req.session.user : null
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

// Atualizar sorteio
router.put('/:id', [
  body('ano_referencia').isInt({ min: 2020, max: 2030 }),
  body('data_realizacao').isISO8601(),
  body('data_juri').isISO8601(),
  body('hora_juri').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('juiz_responsavel_id').isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const sorteio = await Sorteio.buscarPorId(req.params.id);
      const juizes = await Juiz.listar();
      return res.render('sorteios/form', {
        title: `Editar Sorteio ${sorteio.id} - Controle de Jurados`,
        sorteio: { ...sorteio, ...req.body },
        juizes,
        action: `/sorteios/${req.params.id}?_method=PUT`,
        errors: errors.array(),
        messages: req.flash ? req.flash() : {},
        user: req.session ? req.session.user : null
      });
    }

    // Remover campos desnecessários do req.body
    const { _method, ...dadosAtualizacao } = req.body;
    await Sorteio.atualizar(req.params.id, dadosAtualizacao);
    req.flash = req.flash || function() { return { success: [] }; };
    req.flash('success', 'Sorteio atualizado com sucesso!');
    res.redirect('/sorteios');
  } catch (error) {
    console.error('Erro ao atualizar sorteio:', error);
    res.render('error', {
      title: 'Erro',
      message: 'Erro ao atualizar sorteio: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Excluir sorteio
router.delete('/:id', async (req, res) => {
  try {
    await Sorteio.excluir(req.params.id);
    res.json({ success: true, message: 'Sorteio excluído com sucesso!' });
  } catch (error) {
    console.error('Erro ao excluir sorteio:', error);
    res.status(500).json({ success: false, message: 'Erro ao excluir sorteio: ' + error.message });
  }
});

// Configurar jurados do sorteio
router.get('/:id/jurados', async (req, res) => {
  try {
    const sorteio = await Sorteio.buscarPorId(req.params.id);
    if (!sorteio) {
      return res.status(404).render('error', {
        title: 'Sorteio não encontrado',
        message: 'O sorteio solicitado não foi encontrado.',
        error: {}
      });
    }

    const juradosElegiveis = await Jurado.listarElegiveis(sorteio.ano_referencia);
    const juradosSorteados = await Sorteio.listarJurados(req.params.id);
    
    // Debug: log para verificar quantos jurados elegíveis foram encontrados
    console.log(`[Sorteios] Ano de referência: ${sorteio.ano_referencia}`);
    console.log(`[Sorteios] Total de jurados elegíveis encontrados: ${juradosElegiveis ? juradosElegiveis.length : 0}`);
    console.log(`[Sorteios] Total de jurados já sorteados: ${juradosSorteados ? juradosSorteados.length : 0}`);

    res.render('sorteios/jurados', {
      title: `Configurar Jurados - Sorteio ${sorteio.id}`,
      sorteio,
      juradosElegiveis,
      juradosSorteados,
      messages: req.flash ? req.flash() : {},
      user: req.session ? req.session.user : null
    });
  } catch (error) {
    console.error('Erro ao carregar configuração de jurados:', error);
    res.render('error', {
      title: 'Erro',
      message: 'Erro ao carregar configuração de jurados: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Adicionar jurado ao sorteio
router.post('/:id/jurados', [
  body('jurado_id').isInt(),
  body('status').isIn(['titular', 'suplente'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Dados inválidos' });
    }

    await Sorteio.adicionarJurado(req.params.id, req.body.jurado_id, req.body.status);
    res.json({ success: true, message: 'Jurado adicionado ao sorteio!' });
  } catch (error) {
    console.error('Erro ao adicionar jurado:', error);
    res.status(500).json({ success: false, message: 'Erro ao adicionar jurado ao sorteio: ' + error.message });
  }
});

// Alternar status do jurado no sorteio (titular <-> suplente)
router.put('/:id/jurados/:juradoId/status', async (req, res) => {
  try {
    const sorteioId = req.params.id;
    const juradoId = req.params.juradoId;
    
    // Buscar o jurado no sorteio para obter o status atual
    const juradoNoSorteio = await db('sorteio_jurados')
      .where({ sorteio_id: sorteioId, jurado_id: juradoId })
      .first();
    
    if (!juradoNoSorteio) {
      return res.status(404).json({ success: false, message: 'Jurado não encontrado no sorteio' });
    }
    
    // Alternar status: se for titular, muda para suplente e vice-versa
    const novoStatus = juradoNoSorteio.status === 'titular' ? 'suplente' : 'titular';
    
    // Atualizar status no banco
    await db('sorteio_jurados')
      .where({ sorteio_id: sorteioId, jurado_id: juradoId })
      .update({ status: novoStatus });
    
    res.json({ success: true, message: `Status alterado para ${novoStatus}!`, novoStatus });
  } catch (error) {
    console.error('Erro ao alternar status do jurado:', error);
    res.status(500).json({ success: false, message: 'Erro ao alternar status do jurado: ' + error.message });
  }
});

// Remover jurado do sorteio
router.delete('/:id/jurados/:juradoId', async (req, res) => {
  try {
    await Sorteio.removerJurado(req.params.id, req.params.juradoId);
    res.json({ success: true, message: 'Jurado removido do sorteio!' });
  } catch (error) {
    console.error('Erro ao remover jurado:', error);
    res.status(500).json({ success: false, message: 'Erro ao remover jurado do sorteio: ' + error.message });
  }
});

// Gerar cédulas
router.post('/:id/gerar-cedulas', async (req, res) => {
  try {
    const cedulas = await Sorteio.gerarCedulas(req.params.id);
    req.flash = req.flash || {};
    req.flash.success = `${cedulas.length} cédulas geradas com sucesso!`;
    res.redirect(`/sorteios/${req.params.id}`);
  } catch (error) {
    console.error('Erro ao gerar cédulas:', error);
    req.flash = req.flash || {};
    req.flash.error = 'Erro ao gerar cédulas';
    res.redirect(`/sorteios/${req.params.id}`);
  }
});

// Marcar último conselho
router.post('/:id/ultimo-conselho', [
  body('jurados').isArray({ min: 0, max: 7 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash = req.flash || {};
      req.flash.error = 'Máximo de 7 jurados permitidos';
      return res.redirect(`/sorteios/${req.params.id}`);
    }

    await Sorteio.marcarUltimoConselho(req.params.id, req.body.jurados);
    req.flash = req.flash || {};
    req.flash.success = 'Último conselho marcado com sucesso!';
    res.redirect(`/sorteios/${req.params.id}`);
  } catch (error) {
    console.error('Erro ao marcar último conselho:', error);
    req.flash = req.flash || {};
    req.flash.error = 'Erro ao marcar último conselho';
    res.redirect(`/sorteios/${req.params.id}`);
  }
});

module.exports = router;
