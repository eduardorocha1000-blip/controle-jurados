const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const Usuario = require('../models/Usuario');
const db = require('../config/database');
const crypto = require('crypto');
const EmailService = require('../services/EmailService');
const router = express.Router();

// Página de login
router.get('/', async (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }

  let primeiroAcessoDisponivel = false;
  try {
    const row = await db('usuarios').count({ total: '*' }).first();
    const total = typeof row.total === 'number' ? row.total : parseInt(row.total, 10);
    primeiroAcessoDisponivel = (total === 0);
  } catch (e) {
    console.error('[AUTH] Erro ao contar usuarios:', e);
  }

  res.render('auth/login', {
    title: 'Login - Controle de Jurados',
    primeiroAcessoDisponivel,
    messages: req.flash ? req.flash() : {}
  });
});

// Primeiro acesso - exibe formulário
router.get('/primeiro-acesso', async (req, res) => {
  const row = await db('usuarios').count({ total: '*' }).first();
  const total = typeof row.total === 'number' ? row.total : parseInt(row.total, 10);
  if (total > 0) {
    req.flash && req.flash('info', 'Primeiro acesso indisponível: já existe usuário cadastrado.');
    return res.redirect('/login');
  }
  res.render('auth/primeiro-acesso', { title: 'Primeiro Acesso', messages: req.flash ? req.flash() : {} });
});

// Primeiro acesso - processa criação do primeiro usuário
router.post('/primeiro-acesso', [
  body('email').isEmail().withMessage('Informe um e-mail válido').trim().toLowerCase(),
  body('senha').isLength({ min: 6 }).withMessage('A senha deve ter ao menos 6 caracteres'),
  body('confirmar').custom((val, { req }) => val === req.body.senha).withMessage('As senhas não conferem'),
  body('nome').optional().isLength({ min: 2 }).withMessage('Nome inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('auth/primeiro-acesso', { title: 'Primeiro Acesso', errors: errors.array(), messages: req.flash ? req.flash() : {} });
    }

    const row = await db('usuarios').count({ total: '*' }).first();
    const total = typeof row.total === 'number' ? row.total : parseInt(row.total, 10);
    if (total > 0) {
      req.flash && req.flash('info', 'Primeiro acesso indisponível: já existe usuário cadastrado.');
      return res.redirect('/login');
    }

    const { email, senha } = req.body;
    const nome = (req.body.nome && req.body.nome.trim()) ? req.body.nome.trim() : 'Administrador';

    const existente = await Usuario.buscarPorEmail(email);
    if (existente) {
      return res.render('auth/primeiro-acesso', { title: 'Primeiro Acesso', error: 'E-mail já cadastrado.', messages: req.flash ? req.flash() : {} });
    }

    const usuario = await Usuario.criar({ nome, email, senha, perfil: 'Administrador', cargo: 'Administrador do Sistema' });

    // Autenticar automaticamente
    req.session.user = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil || 'Administrador',
      cargo: usuario.cargo || 'Administrador do Sistema'
    };

    req.flash && req.flash('success', 'Usuário criado com sucesso!');
    return res.redirect('/dashboard');
  } catch (error) {
    console.error('[AUTH] Erro em POST /primeiro-acesso:', error);
    return res.render('auth/primeiro-acesso', { title: 'Primeiro Acesso', error: 'Não foi possível criar o usuário.', messages: req.flash ? req.flash() : {} });
  }
});

// Processar login
router.post('/', [
  // Não usar normalizeEmail padrão para não remover pontos de endereços do Gmail
  body('email').isEmail().trim().toLowerCase(),
  body('senha').isLength({ min: 6 })
], async (req, res) => {
  try {
    console.log('Tentativa de login:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Erros de validação:', errors.array());
      return res.render('auth/login', {
        title: 'Login - Controle de Jurados',
        errors: errors.array()
      });
    }

    const { email, senha } = req.body;
    
    console.log('Buscando usuário com email:', email);
    // Buscar usuário
    const usuario = await Usuario.buscarPorEmail(email);
    console.log('Usuário encontrado:', usuario ? 'Sim' : 'Não');
    
    if (!usuario) {
      console.log('Usuário não encontrado');
      return res.render('auth/login', {
        title: 'Login - Controle de Jurados',
        error: 'E-mail ou senha incorretos'
      });
    }

    console.log('Verificando senha...');
    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    console.log('Senha válida:', senhaValida ? 'Sim' : 'Não');
    
    if (!senhaValida) {
      console.log('Senha inválida');
      return res.render('auth/login', {
        title: 'Login - Controle de Jurados',
        error: 'E-mail ou senha incorretos'
      });
    }

    console.log('Criando sessão para usuário:', usuario.nome);
    // Criar sessão
    req.session.user = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil || 'Administrador',
      cargo: usuario.cargo || 'Administrador do Sistema'
    };

    console.log('Login realizado com sucesso, redirecionando...');
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Erro no login:', error);
    res.render('auth/login', {
      title: 'Login - Controle de Jurados',
      error: 'Erro interno do servidor'
    });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Erro ao fazer logout:', err);
    }
    res.redirect('/login');
  });
});

// Recuperação de senha
router.get('/esqueci', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('auth/esqueci', { title: 'Recuperar Senha - Controle de Jurados', messages: req.flash ? req.flash() : {} });
});

router.post('/esqueci', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      req.flash && req.flash('error', 'Informe seu e-mail.');
      return res.redirect('/login/esqueci');
    }

    const usuario = await Usuario.buscarPorEmail(email);
    if (!usuario) {
      req.flash && req.flash('success', 'Se o e-mail existir, enviaremos instruções.');
      return res.redirect('/login');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h
    await db('password_resets').insert({ usuario_id: usuario.id, token, expires_at: expiresAt });

    // Detectar protocolo e host corretamente
    const host = req.headers.host || 'localhost:3000';
    let protocol = 'http';
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      protocol = 'https';
    } else if (req.headers['x-forwarded-proto']) {
      protocol = req.headers['x-forwarded-proto'];
    }
    const link = `${protocol}://${host}/login/redefinir/${token}`;

    console.log('[AUTH] Link de recuperação gerado:', link);
    console.log('[AUTH] Host:', host);
    console.log('[AUTH] Protocol:', protocol);

    // Enviar e-mail
    try {
      const emailService = new EmailService();
      const transporter = await emailService.getTransporter();
      const config = await emailService.getConfig();
      await transporter.sendMail({
        from: config.email_from || config.smtp_user,
        to: usuario.email,
        subject: 'Redefinição de senha - Controle de Jurados',
        html: `<p>Olá, ${usuario.nome}.</p><p>Recebemos uma solicitação para redefinir sua senha.</p><p>Clique no link abaixo para criar uma nova senha. O link expira em 1 hora.</p><p><a href="${link}">${link}</a></p><p>Se você não solicitou, ignore este e-mail.</p>`,
        text: `Olá, ${usuario.nome}.\n\nPara redefinir sua senha, acesse: ${link} (expira em 1 hora).\nSe você não solicitou, ignore este e-mail.`
      });
      console.log('[AUTH] E-mail de recuperação enviado com sucesso para:', usuario.email);
    } catch (mailErr) {
      console.error('[AUTH] Erro ao enviar e-mail de redefinição:', mailErr);
      // Mesmo com erro de envio, manter resposta genérica por segurança
    }

    req.flash && req.flash('success', 'Se o e-mail existir, enviaremos instruções.');
    return res.redirect('/login');
  } catch (error) {
    console.error('[AUTH] Erro em /esqueci:', error);
    req.flash && req.flash('error', 'Não foi possível processar sua solicitação.');
    return res.redirect('/login/esqueci');
  }
});

router.get('/redefinir/:token', async (req, res) => {
  try {
    const { token } = req.params;
    console.log('[AUTH] GET /redefinir/:token chamado com token:', token);
    
    const reset = await db('password_resets').where({ token }).first();
    console.log('[AUTH] Reset encontrado:', reset ? 'Sim' : 'Não');
    
    if (!reset || reset.used_at) {
      console.log('[AUTH] Token inválido ou já utilizado');
      req.flash && req.flash('error', 'Link inválido ou já utilizado.');
      return res.redirect('/login');
    }
    
    const now = new Date();
    const expiresAt = new Date(reset.expires_at);
    console.log('[AUTH] Verificando expiração. Agora:', now, 'Expira em:', expiresAt);
    
    if (expiresAt < now) {
      console.log('[AUTH] Link expirado');
      req.flash && req.flash('error', 'Link expirado. Solicite novamente.');
      return res.redirect('/login/esqueci');
    }
    
    console.log('[AUTH] Renderizando página de redefinição');
    res.render('auth/redefinir', { title: 'Definir Nova Senha', token, messages: req.flash ? req.flash() : {} });
  } catch (error) {
    console.error('[AUTH] Erro em GET /redefinir:', error);
    req.flash && req.flash('error', 'Link inválido.');
    return res.redirect('/login');
  }
});

router.post('/redefinir/:token', [
  body('senha').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres'),
  body('confirmar').custom((value, { req }) => value === req.body.senha).withMessage('As senhas não conferem')
], async (req, res) => {
  try {
    const { token } = req.params;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('auth/redefinir', { title: 'Definir Nova Senha', token, errors: errors.array(), messages: req.flash ? req.flash() : {} });
    }

    const reset = await db('password_resets').where({ token }).first();
    if (!reset || reset.used_at) {
      req.flash && req.flash('error', 'Link inválido ou já utilizado.');
      return res.redirect('/login');
    }
    if (new Date(reset.expires_at) < new Date()) {
      req.flash && req.flash('error', 'Link expirado. Solicite novamente.');
      return res.redirect('/login/esqueci');
    }

    // Atualizar senha
    const usuario = await Usuario.buscarPorId(reset.usuario_id);
    if (!usuario) {
      req.flash && req.flash('error', 'Usuário não encontrado.');
      return res.redirect('/login');
    }
    await Usuario.atualizar(usuario.id, { senha: req.body.senha });
    await db('password_resets').where({ token }).update({ used_at: new Date() });

    req.flash && req.flash('success', 'Senha alterada com sucesso! Faça login.');
    return res.redirect('/login');
  } catch (error) {
    console.error('[AUTH] Erro em POST /redefinir:', error);
    req.flash && req.flash('error', 'Não foi possível redefinir a senha.');
    return res.redirect(`/login/redefinir/${req.params.token}`);
  }
});

module.exports = router;