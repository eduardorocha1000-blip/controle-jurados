const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const Indicacao = require('../models/Indicacao');
const Instituicao = require('../models/Instituicao');
const router = express.Router();

// Configuração do multer para upload de PDFs
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'))
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'indicacao-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Apenas arquivos PDF são permitidos!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Rota de teste para verificar uploads
router.get('/teste-upload/:filename', (req, res) => {
  const filename = req.params.filename;
  const path = require('path');
  const fs = require('fs');
  
  const filePath = path.join(__dirname, '../uploads', filename);
  
  console.log('Testando arquivo:', filePath);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('Arquivo não encontrado');
  }
});

// Listar indicações
router.get('/', async (req, res) => {
  try {
    const filtros = {
      ano_referencia: req.query.ano_referencia,
      instituicao_id: req.query.instituicao_id,
      status: req.query.status,
      busca: req.query.busca
    };

    const indicacoes = await Indicacao.listar(filtros);
    const instituicoes = await Instituicao.listar();
    
    // Calcular estatísticas
    const totalIndicacoes = indicacoes.length;
    const indicacoesProcessadas = indicacoes.filter(i => i.status === 'validada').length;
    const indicacoesPendentes = indicacoes.filter(i => i.status === 'pendente').length;
    const totalInstituicoes = instituicoes.length;

    res.render('indicacoes/index', {
      title: 'Indicações - Controle de Jurados',
      indicacoes,
      instituicoes,
      filtros,
      totalIndicacoes,
      indicacoesProcessadas,
      indicacoesPendentes,
      totalInstituicoes
    });
  } catch (error) {
    console.error('Erro ao listar indicações:', error);
    res.render('error', {
      title: 'Erro',
      message: 'Erro ao carregar lista de indicações',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Criar indicação
router.post('/', upload.single('arquivo_pdf'), [
  body('ano_referencia').isInt({ min: 2020, max: 2030 }),
  body('instituicao_id').isInt(),
  body('quantidade').isInt({ min: 1, max: 99 }),
  body('prazo_envio').isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      const instituicoes = await Instituicao.listar();
      return res.render('indicacoes/form', {
        title: 'Nova Indicação - Controle de Jurados',
        indicacao: req.body,
        instituicoes,
        action: '/indicacoes',
        errors: errors.array(),
        messages: req.flash(),
        user: req.session.user
      });
    }

    // Preparar dados incluindo arquivo PDF se enviado
    const dadosIndicacao = { ...req.body };
    
    // Remover campos que não devem ir para o banco
    delete dadosIndicacao._method;
    
    if (req.file) {
      dadosIndicacao.arquivo_lista = req.file.filename;
    }

    const indicacao = await Indicacao.criar(dadosIndicacao);
    
    req.flash = req.flash || {};
    req.flash.success = 'Indicação criada com sucesso!';
    res.redirect('/indicacoes');
  } catch (error) {
    console.error('Erro ao criar indicação:', error);
    const instituicoes = await Instituicao.listar();
    res.render('indicacoes/form', {
      title: 'Nova Indicação - Controle de Jurados',
      indicacao: req.body,
      instituicoes,
      action: '/indicacoes',
      error: `Erro ao criar indicação: ${error.message}`,
      messages: req.flash(),
      user: req.session.user
    });
  }
});

// Formulário nova indicação
router.get('/novo', async (req, res) => {
  try {
    const instituicoes = await Instituicao.listar();
    res.render('indicacoes/form', {
      title: 'Nova Indicação - Controle de Jurados',
      indicacao: {},
      instituicoes,
      action: '/indicacoes',
      messages: req.flash(),
      user: req.session.user
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

// Visualizar indicação
router.get('/:id', async (req, res) => {
  try {
    const indicacao = await Indicacao.buscarPorId(req.params.id);
    
    if (!indicacao) {
      return res.status(404).render('error', {
        title: 'Indicação não encontrada',
        message: 'A indicação solicitada não foi encontrada.',
        error: {}
      });
    }

    res.render('indicacoes/view', {
      title: `Indicação ${indicacao.id} - Controle de Jurados`,
      indicacao
    });
  } catch (error) {
    console.error('Erro ao visualizar indicação:', error);
    res.render('error', {
      title: 'Erro',
      message: 'Erro ao carregar dados da indicação',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Formulário editar indicação
router.get('/:id/editar', async (req, res) => {
  try {
    const indicacao = await Indicacao.buscarPorId(req.params.id);
    if (!indicacao) {
      return res.status(404).render('error', {
        title: 'Indicação não encontrada',
        message: 'A indicação solicitada não foi encontrada.',
        error: {}
      });
    }

    const instituicoes = await Instituicao.listar();
    res.render('indicacoes/form', {
      title: `Editar Indicação ${indicacao.id} - Controle de Jurados`,
      indicacao,
      instituicoes,
      action: `/indicacoes/${indicacao.id}?_method=PUT`,
      messages: req.flash(),
      user: req.session.user
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

// Atualizar indicação
router.put('/:id', upload.single('arquivo_pdf'), [
  body('ano_referencia').isInt({ min: 2020, max: 2030 }),
  body('instituicao_id').isInt(),
  body('quantidade').isInt({ min: 1, max: 99 }),
  body('prazo_envio').isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      const indicacao = await Indicacao.buscarPorId(req.params.id);
      const instituicoes = await Instituicao.listar();
      return res.render('indicacoes/form', {
        title: `Editar Indicação ${indicacao.id} - Controle de Jurados`,
        indicacao: { ...indicacao, ...req.body },
        instituicoes,
        action: `/indicacoes/${req.params.id}?_method=PUT`,
        errors: errors.array(),
        messages: req.flash(),
        user: req.session.user
      });
    }

    // Preparar dados incluindo arquivo PDF se enviado
    const dadosIndicacao = { ...req.body };
    
    // Remover campos que não devem ir para o banco
    delete dadosIndicacao._method;
    
    if (req.file) {
      dadosIndicacao.arquivo_lista = req.file.filename;
    }

    await Indicacao.atualizar(req.params.id, dadosIndicacao);
    req.flash = req.flash || {};
    req.flash.success = 'Indicação atualizada com sucesso!';
    res.redirect('/indicacoes');
  } catch (error) {
    console.error('Erro ao atualizar indicação:', error);
    const instituicoes = await Instituicao.listar();
    res.render('indicacoes/form', {
      title: 'Editar Indicação - Controle de Jurados',
      indicacao: req.body,
      instituicoes,
      action: `/indicacoes/${req.params.id}?_method=PUT`,
      error: `Erro ao atualizar indicação: ${error.message}`,
      messages: req.flash(),
      user: req.session.user
    });
  }
}, (error, req, res, next) => {
  // Middleware de tratamento de erros do multer para PUT
  if (error instanceof multer.MulterError) {
    console.error('Erro do multer:', error);
    return res.render('indicacoes/form', {
      title: 'Editar Indicação - Controle de Jurados',
      indicacao: req.body,
      instituicoes: [],
      action: `/indicacoes/${req.params.id}?_method=PUT`,
      error: `Erro no upload: ${error.message}`,
      messages: req.flash(),
      user: req.session.user
    });
  } else if (error) {
    console.error('Erro geral:', error);
    return res.render('indicacoes/form', {
      title: 'Editar Indicação - Controle de Jurados',
      indicacao: req.body,
      instituicoes: [],
      action: `/indicacoes/${req.params.id}?_method=PUT`,
      error: `Erro: ${error.message}`,
      messages: req.flash(),
      user: req.session.user
    });
  }
});

// Excluir indicação
router.delete('/:id', async (req, res) => {
  try {
    await Indicacao.excluir(req.params.id);
    req.flash = req.flash || {};
    req.flash.success = 'Indicação excluída com sucesso!';
    res.redirect('/indicacoes');
  } catch (error) {
    console.error('Erro ao excluir indicação:', error);
    req.flash = req.flash || {};
    req.flash.error = 'Erro ao excluir indicação';
    res.redirect('/indicacoes');
  }
});

// Upload de lista de jurados
router.get('/upload', (req, res) => {
  res.render('indicacoes/upload', {
    title: 'Upload de Lista - Controle de Jurados'
  });
});

// Processar upload
router.post('/upload', async (req, res) => {
  try {
    // Aqui você implementaria o processamento do upload
    // Por enquanto, vamos simular um sucesso
    req.flash = req.flash || {};
    req.flash.success = 'Lista enviada com sucesso!';
    res.redirect('/indicacoes');
  } catch (error) {
    console.error('Erro ao processar upload:', error);
    req.flash = req.flash || {};
    req.flash.error = 'Erro ao processar upload';
    res.redirect('/indicacoes/upload');
  }
});

module.exports = router;