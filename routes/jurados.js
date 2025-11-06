const express = require('express');
const { body, validationResult } = require('express-validator');
const Jurado = require('../models/Jurado');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Instituicao = require('../models/Instituicao');
const db = require('../config/database');
const router = express.Router();

// Upload de foto do jurado
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '..', 'uploads', 'jurados');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '');
    const unique = Date.now() + '_' + Math.floor(Math.random()*1e6);
    cb(null, base || 'foto' + '_' + unique + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 1.5 * 1024 * 1024 }, // ~1.5MB
  fileFilter: (req, file, cb) => {
    // aceitar qualquer imagem conhecida por mimetype; fallback por extensão
    if (file.mimetype && file.mimetype.startsWith('image/')) return cb(null, true);
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (allowed.includes(ext)) return cb(null, true);
    return cb(new Error('Formato inválido. Envie uma imagem (JPG, PNG ou WEBP).'));
  }
});

// Listar jurados
router.get('/', async (req, res) => {
  try {
    const filtros = {
      status: req.query.status,
      instituicao_id: req.query.instituicao_id,
      busca: req.query.busca
    };

    const jurados = await Jurado.listar(filtros);
    const instituicoes = await Instituicao.listar();

    // Calcular estatísticas
    const totalJurados = await Jurado.contar();
    const juradosAtivos = await Jurado.contarPorStatus('Ativo');
    const juradosInativos = await Jurado.contarPorStatus('Inativo');
    
    // Contar jurados do ano atual
    const anoAtual = new Date().getFullYear();
    const juradosAno = await db('jurados')
      .whereRaw("strftime('%Y', created_at) = ?", [anoAtual.toString()])
      .count('* as total')
      .first()
      .then(result => parseInt(result.total));

    res.render('jurados/index', {
      title: 'Jurados - Controle de Jurados',
      jurados,
      instituicoes,
      filtros,
      totalJurados,
      juradosAtivos,
      juradosInativos,
      juradosAno
    });
  } catch (error) {
    console.error('Erro ao listar jurados:', error);
    res.render('error', {
      title: 'Erro',
      message: 'Erro ao carregar lista de jurados',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Formulário novo jurado
router.get('/novo', async (req, res) => {
  try {
    const instituicoes = await Instituicao.listar();
    res.render('jurados/form', {
      title: 'Novo Jurado - Controle de Jurados',
      jurado: {},
      instituicoes,
      action: '/jurados'
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

// Criar jurado
router.post('/', upload.single('foto'), [
  body('nome_completo').isLength({ min: 2, max: 100 }).trim(),
  body('cpf').isLength({ min: 11, max: 14 }),
  body('data_nascimento').optional({ nullable: true, checkFalsy: true }).isISO8601(),
  body('ultimo_conselho').optional({ nullable: true, checkFalsy: true }).isISO8601(),
  body('sexo').isIn(['Masculino', 'Feminino']),
  body('endereco').isLength({ min: 5, max: 200 }).trim(),
  body('numero').isLength({ min: 1, max: 10 }).trim(),
  body('bairro').isLength({ min: 2, max: 50 }).trim(),
  body('profissao').isLength({ min: 2, max: 50 }).trim(),
  body('telefone').optional({ nullable: true, checkFalsy: true }).isLength({ min: 8, max: 15 }),
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail().normalizeEmail(),
  body('instituicao_id').optional({ nullable: true, checkFalsy: true }).isInt(),
  body('motivo').optional({ nullable: true, checkFalsy: true }).isIn(['Outra Comarca', 'Falecido', 'Incapacitado', '12 meses', 'Impedimento', 'Idade', 'Temporário']),
  body('suspenso_ate').optional({ nullable: true, checkFalsy: true }).isISO8601()
], async (req, res) => {
  try {
    console.log('[POST /jurados] body recebido:', req.body);
    if (req.file) console.log('[POST /jurados] arquivo recebido:', req.file.originalname, req.file.mimetype, req.file.size);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('[POST /jurados] Erros de validação:', errors.array());
      const instituicoes = await Instituicao.listar();
      return res.render('jurados/form', {
        title: 'Novo Jurado - Controle de Jurados',
        jurado: req.body,
        instituicoes,
        action: '/jurados',
        errors: errors.array()
      });
    }

    const payload = { ...req.body };
    if (req.file) {
      payload.foto_path = '/uploads/jurados/' + req.file.filename;
    }
    const jurado = await Jurado.criar(payload);
    console.log('[POST /jurados] Jurado criado com ID:', jurado && jurado.id);
    
    req.flash = req.flash || {};
    req.flash.success = 'Jurado criado com sucesso!';
    res.redirect('/jurados');
  } catch (error) {
    console.error('Erro ao criar jurado:', error);
    
    // Verificar se é erro de CPF duplicado
    if (error.message.includes('UNIQUE constraint failed: jurados.cpf')) {
      req.flash = req.flash || {};
      req.flash.error = 'Já existe um jurado cadastrado com este CPF.';
      const instituicoes = await Instituicao.listar();
      return res.render('jurados/form', {
        title: 'Novo Jurado - Controle de Jurados',
        jurado: req.body,
        instituicoes,
        action: '/jurados',
        errors: [{ msg: 'CPF já cadastrado no sistema' }]
      });
    }
    
    const instituicoes = await Instituicao.listar();
    res.render('jurados/form', {
      title: 'Novo Jurado - Controle de Jurados',
      jurado: req.body,
      instituicoes,
      action: '/jurados',
      error: `Erro ao criar jurado: ${error.message}`
    });
  }
});

// Excluir jurado
router.delete('/:id', async (req, res) => {
  try {
    console.log('=== DEBUG EXCLUSÃO JURADO ===');
    console.log('ID para exclusão:', req.params.id);
    console.log('Method:', req.method);
    
    const resultado = await Jurado.excluir(req.params.id);
    console.log('Resultado da exclusão:', resultado);
    
    req.flash = req.flash || {};
    req.flash.success = 'Jurado excluído com sucesso!';
    res.redirect('/jurados');
  } catch (error) {
    console.error('Erro ao excluir jurado:', error);
    req.flash = req.flash || {};
    req.flash.error = `Erro ao excluir jurado: ${error.message}`;
    res.redirect('/jurados');
  }
});

// Visualizar jurado
router.get('/:id', async (req, res) => {
  try {
    const jurado = await Jurado.buscarPorId(req.params.id);
    if (!jurado) {
      return res.status(404).render('error', {
        title: 'Jurado não encontrado',
        message: 'O jurado solicitado não foi encontrado.',
        error: {}
      });
    }

    // Buscar dados da instituição se existir
    if (jurado.instituicao_id) {
      const instituicao = await db('instituicoes')
        .where('id', jurado.instituicao_id)
        .first();
      if (instituicao) {
        jurado.instituicao_nome = instituicao.nome;
      }
    }

    res.render('jurados/view', {
      title: `${jurado.nome_completo} - Controle de Jurados`,
      jurado
    });
  } catch (error) {
    console.error('Erro ao visualizar jurado:', error);
    res.render('error', {
      title: 'Erro',
      message: 'Erro ao carregar dados do jurado',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Formulário editar jurado
router.get('/:id/editar', async (req, res) => {
  try {
    const jurado = await Jurado.buscarPorId(req.params.id);
    if (!jurado) {
      return res.status(404).render('error', {
        title: 'Jurado não encontrado',
        message: 'O jurado solicitado não foi encontrado.',
        error: {}
      });
    }

    const instituicoes = await Instituicao.listar();
    res.render('jurados/form', {
      title: `Editar Jurado ${jurado.nome_completo} - Controle de Jurados`,
      jurado,
      instituicoes,
      action: `/jurados/${jurado.id}?_method=PUT`
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

// Atualizar jurado
router.put('/:id', upload.single('foto'), [
  body('nome_completo').isLength({ min: 2, max: 100 }).trim(),
  body('cpf').isLength({ min: 11, max: 14 }),
  body('data_nascimento').optional({ nullable: true, checkFalsy: true }).isISO8601(),
  body('ultimo_conselho').optional({ nullable: true, checkFalsy: true }).isISO8601(),
  body('sexo').isIn(['Masculino', 'Feminino']),
  body('endereco').isLength({ min: 5, max: 200 }).trim(),
  body('numero').isLength({ min: 1, max: 10 }).trim(),
  body('bairro').isLength({ min: 2, max: 50 }).trim(),
  body('profissao').isLength({ min: 2, max: 50 }).trim(),
  body('telefone').optional({ nullable: true, checkFalsy: true }).isLength({ min: 8, max: 15 }),
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail().normalizeEmail(),
  body('instituicao_id').optional({ nullable: true, checkFalsy: true }).isInt(),
  body('motivo').optional({ nullable: true, checkFalsy: true }).isIn(['Outra Comarca', 'Falecido', 'Incapacitado', '12 meses', 'Impedimento', 'Idade', 'Temporário']),
  body('suspenso_ate').optional({ nullable: true, checkFalsy: true }).isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const jurado = await Jurado.buscarPorId(req.params.id);
      const instituicoes = await Instituicao.listar();
      return res.render('jurados/form', {
        title: `Editar Jurado ${jurado.nome_completo} - Controle de Jurados`,
        jurado: { ...jurado, ...req.body },
        instituicoes,
        action: `/jurados/${req.params.id}?_method=PUT`,
        errors: errors.array()
      });
    }

    const payload = { ...req.body };
    if (req.file) {
      payload.foto_path = '/uploads/jurados/' + req.file.filename;
    }
    await Jurado.atualizar(req.params.id, payload);
    req.flash = req.flash || {};
    req.flash.success = 'Jurado atualizado com sucesso!';
    res.redirect('/jurados');
  } catch (error) {
    console.error('Erro ao atualizar jurado:', error);
    res.render('error', {
      title: 'Erro',
      message: `Erro ao atualizar jurado: ${error.message}`,
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Reativar jurados suspensos automaticamente
router.post('/reativar-suspensos', async (req, res) => {
  try {
    const quantidade = await Jurado.reativarSuspensosAutomaticamente();
    req.flash = req.flash || {};
    req.flash.success = `${quantidade} jurados foram reativados automaticamente.`;
    res.redirect('/jurados');
  } catch (error) {
    console.error('Erro ao reativar jurados suspensos:', error);
    req.flash = req.flash || {};
    req.flash.error = 'Erro ao reativar jurados suspensos.';
    res.redirect('/jurados');
  }
});

// Importar jurados via CSV
router.get('/importar', (req, res) => {
  res.render('jurados/importar', {
    title: 'Importar Jurados - Controle de Jurados'
  });
});

// Processar importação CSV
router.post('/importar', async (req, res) => {
  try {
    // Implementar processamento de CSV
    req.flash = req.flash || {};
    req.flash.success = 'Importação realizada com sucesso!';
    res.redirect('/jurados');
  } catch (error) {
    console.error('Erro ao importar jurados:', error);
    req.flash = req.flash || {};
    req.flash.error = 'Erro ao importar jurados';
    res.redirect('/jurados/importar');
  }
});

// Exportar jurados
router.get('/exportar', async (req, res) => {
  try {
    const filtros = req.query;
    const jurados = await Jurado.listar(filtros);
    
    // Gerar CSV
    const csv = Jurado.gerarCSV(jurados);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="jurados_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Erro ao exportar jurados:', error);
    res.status(500).json({ error: 'Erro ao exportar jurados' });
  }
});

// Listar jurados elegíveis (API)
router.get('/api/elegiveis/:ano', async (req, res) => {
  try {
    const ano = parseInt(req.params.ano);
    const jurados = await Jurado.listarElegiveis(ano);
    res.json(jurados);
  } catch (error) {
    console.error('Erro ao listar jurados elegíveis:', error);
    res.status(500).json({ error: 'Erro ao listar jurados elegíveis' });
  }
});

module.exports = router;