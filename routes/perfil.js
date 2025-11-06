const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const Usuario = require('../models/Usuario');
const router = express.Router();

// Página de perfil
router.get('/', async (req, res) => {
  try {
    // Buscar dados completos do usuário
    const usuarioCompleto = await Usuario.buscarPorId(req.session.user.id);
    
    res.render('perfil/index', {
      title: 'Perfil - Controle de Jurados',
      user: {
        ...req.session.user,
        ...usuarioCompleto,
        cargo: usuarioCompleto.cargo || 'Administrador',
        matricula: usuarioCompleto.matricula || 'N/A',
        telefone: usuarioCompleto.telefone || '',
        created_at: usuarioCompleto.created_at || new Date()
      }
    });
  } catch (error) {
    console.error('Erro ao carregar perfil:', error);
    res.render('perfil/index', {
      title: 'Perfil - Controle de Jurados',
      user: req.session.user,
      error: 'Erro ao carregar dados do perfil'
    });
  }
});

// Atualizar perfil
router.post('/', [
  body('nome').isLength({ min: 2 }).withMessage('Nome deve ter pelo menos 2 caracteres'),
  body('email').isEmail().withMessage('E-mail inválido'),
  body('telefone').optional().isLength({ min: 10 }).withMessage('Telefone inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('perfil/index', {
        title: 'Perfil - Controle de Jurados',
        user: req.session.user,
        errors: errors.array()
      });
    }

    const { nome, email, telefone, matricula, cargo } = req.body;
    
    // Atualizar no banco de dados
    await Usuario.atualizar(req.session.user.id, { 
      nome, 
      email, 
      telefone, 
      matricula,
      cargo
    });
    
    // Atualizar dados do usuário na sessão
    req.session.user.nome = nome;
    req.session.user.email = email;
    req.session.user.telefone = telefone;
    req.session.user.matricula = matricula;
    req.session.user.cargo = cargo;

    req.flash('success', 'Perfil atualizado com sucesso!');
    
    res.redirect('/perfil');
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.render('perfil/index', {
      title: 'Perfil - Controle de Jurados',
      user: req.session.user,
      error: 'Erro ao atualizar perfil: ' + error.message
    });
  }
});

// Alterar senha
router.post('/alterar-senha', [
  body('senha_atual').notEmpty().withMessage('Senha atual é obrigatória'),
  body('nova_senha').isLength({ min: 6 }).withMessage('Nova senha deve ter pelo menos 6 caracteres'),
  body('confirmar_senha').custom((value, { req }) => {
    if (value !== req.body.nova_senha) {
      throw new Error('Confirmação de senha não confere');
    }
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('perfil/index', {
        title: 'Perfil - Controle de Jurados',
        user: req.session.user,
        errors: errors.array()
      });
    }

    const { senha_atual, nova_senha } = req.body;
    
    // Buscar usuário atual
    const usuario = await Usuario.buscarPorId(req.session.user.id);
    if (!usuario) {
      return res.render('perfil/index', {
        title: 'Perfil - Controle de Jurados',
        user: req.session.user,
        error: 'Usuário não encontrado'
      });
    }
    
    // Verificar senha atual
    const senhaValida = await Usuario.verificarSenha(senha_atual, usuario.senha_hash);
    
    if (!senhaValida) {
      return res.render('perfil/index', {
        title: 'Perfil - Controle de Jurados',
        user: req.session.user,
        error: 'Senha atual incorreta'
      });
    }

    // Atualizar senha no banco
    await Usuario.atualizar(req.session.user.id, { senha: nova_senha });

    req.flash('success', 'Senha alterada com sucesso!');
    
    res.redirect('/perfil');
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.render('perfil/index', {
      title: 'Perfil - Controle de Jurados',
      user: req.session.user,
      error: 'Erro ao alterar senha: ' + error.message
    });
  }
});

module.exports = router;
