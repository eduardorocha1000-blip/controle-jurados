const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const Usuario = require('../models/Usuario');
const router = express.Router();

// Listar usuários
router.get('/', async (req, res) => {
  try {
    const usuarios = await Usuario.listar();
    const stats = {
      total: usuarios.length,
      admin: usuarios.filter(u => u.perfil === 'admin').length,
      servidor: usuarios.filter(u => u.perfil === 'servidor').length,
      criadosHoje: usuarios.filter(u => new Date(u.created_at).toDateString() === new Date().toDateString()).length
    };
    
    res.render('usuarios/index', {
      title: 'Usuários - Controle de Jurados',
      usuarios,
      stats,
      messages: req.flash()
    });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.render('error', {
      title: 'Erro',
      message: 'Erro ao carregar lista de usuários',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Formulário de novo usuário
router.get('/novo', (req, res) => {
  res.render('usuarios/form', {
    title: 'Novo Usuário - Controle de Jurados',
    usuario: {},
    action: '/usuarios/novo'
  });
});

// Criar novo usuário
router.post('/novo', [
  body('nome').isLength({ min: 2 }).withMessage('Nome deve ter pelo menos 2 caracteres'),
  body('email').isEmail().withMessage('E-mail inválido'),
  body('senha').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres'),
  body('perfil').isIn(['admin', 'servidor']).withMessage('Perfil inválido')
], async (req, res) => {
  try {
    console.log('[USUARIOS] POST /novo recebido');
    console.log('[USUARIOS] Dados recebidos:', {
      nome: req.body.nome,
      email: req.body.email,
      perfil: req.body.perfil,
      tem_senha: !!req.body.senha
    });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('[USUARIOS] Erros de validação:', errors.array());
      return res.render('usuarios/form', {
        title: 'Novo Usuário - Controle de Jurados',
        usuario: req.body,
        errors: errors.array(),
        action: '/usuarios/novo'
      });
    }

    const { nome, email, senha, perfil, matricula, telefone, cargo, observacoes } = req.body;
    
    console.log('[USUARIOS] Verificando email existente...');
    // Verificar se e-mail já existe
    const usuarioExistente = await Usuario.buscarPorEmail(email);
    if (usuarioExistente) {
      console.log('[USUARIOS] Email já existe:', email);
      return res.render('usuarios/form', {
        title: 'Novo Usuário - Controle de Jurados',
        usuario: req.body,
        errors: [{ msg: 'E-mail já está em uso' }],
        action: '/usuarios/novo'
      });
    }

    console.log('[USUARIOS] Criando usuário...');
    // Criar usuário
    const novoUsuario = await Usuario.criar({
      nome,
      email,
      senha,
      perfil,
      matricula,
      telefone,
      cargo,
      observacoes
    });

    console.log('[USUARIOS] Usuário criado com sucesso! ID:', novoUsuario?.id);
    req.flash('success', 'Usuário criado com sucesso!');
    console.log('[USUARIOS] Redirecionando para /usuarios');
    res.redirect('/usuarios');
  } catch (error) {
    console.error('[USUARIOS] Erro ao criar usuário:', error);
    console.error('[USUARIOS] Stack:', error.stack);
    res.render('usuarios/form', {
      title: 'Novo Usuário - Controle de Jurados',
      usuario: req.body,
      error: 'Erro ao criar usuário: ' + error.message,
      action: '/usuarios/novo'
    });
  }
});

// Formulário de edição
router.get('/editar/:id', async (req, res) => {
  try {
    const usuario = await Usuario.buscarPorId(req.params.id);
    if (!usuario) {
      req.flash('error', 'Usuário não encontrado');
      return res.redirect('/usuarios');
    }

    res.render('usuarios/form', {
      title: `Editar Usuário ${usuario.nome} - Controle de Jurados`,
      usuario,
      action: `/usuarios/editar/${usuario.id}`
    });
  } catch (error) {
    console.error('Erro ao carregar usuário:', error);
    req.flash('error', 'Erro ao carregar usuário');
    res.redirect('/usuarios');
  }
});

// Atualizar usuário
router.post('/editar/:id', [
  body('nome').isLength({ min: 2 }).withMessage('Nome deve ter pelo menos 2 caracteres'),
  body('email').isEmail().withMessage('E-mail inválido'),
  body('perfil').isIn(['admin', 'servidor']).withMessage('Perfil inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const usuario = await Usuario.buscarPorId(req.params.id);
      return res.render('usuarios/form', {
        title: `Editar Usuário ${usuario.nome} - Controle de Jurados`,
        usuario: { ...usuario, ...req.body },
        errors: errors.array(),
        action: `/usuarios/editar/${req.params.id}`
      });
    }

    const { nome, email, perfil, matricula, telefone, cargo, observacoes, senha } = req.body;
    
    // Verificar se e-mail já existe em outro usuário
    const usuarioExistente = await Usuario.buscarPorEmail(email);
    if (usuarioExistente && usuarioExistente.id != req.params.id) {
      const usuario = await Usuario.buscarPorId(req.params.id);
      return res.render('usuarios/form', {
        title: `Editar Usuário ${usuario.nome} - Controle de Jurados`,
        usuario: { ...usuario, ...req.body },
        errors: [{ msg: 'E-mail já está em uso por outro usuário' }],
        action: `/usuarios/editar/${req.params.id}`
      });
    }

    // Preparar dados para atualização
    const dadosAtualizacao = {
      nome,
      email,
      perfil,
      matricula,
      telefone,
      cargo,
      observacoes
    };

    // Incluir senha apenas se fornecida
    if (senha && senha.trim() !== '') {
      dadosAtualizacao.senha = senha;
    }

    // Atualizar usuário
    await Usuario.atualizar(req.params.id, dadosAtualizacao);

    req.flash('success', 'Usuário atualizado com sucesso!');
    res.redirect('/usuarios');
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    req.flash('error', 'Erro ao atualizar usuário: ' + error.message);
    res.redirect('/usuarios');
  }
});

// Excluir usuário
router.post('/excluir/:id', async (req, res) => {
  try {
    // Não permitir excluir o próprio usuário
    if (req.params.id == req.session.user.id) {
      req.flash('error', 'Você não pode excluir seu próprio usuário!');
      return res.redirect('/usuarios');
    }

    await Usuario.excluir(req.params.id);
    
    req.flash('success', 'Usuário excluído com sucesso!');
    res.redirect('/usuarios');
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    req.flash('error', 'Erro ao excluir usuário: ' + error.message);
    res.redirect('/usuarios');
  }
});

module.exports = router;
