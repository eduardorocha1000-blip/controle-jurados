const express = require('express');
const router = express.Router();

// Middleware para adicionar flash messages
router.use((req, res, next) => {
  res.locals.flash = req.session.flash || {};
  delete req.session.flash;
  next();
});

// Middleware para adicionar método HTTP correto
router.use((req, res, next) => {
  if (req.query._method) {
    req.method = req.query._method.toUpperCase();
    delete req.query._method;
  }
  next();
});

// Middleware para adicionar informações do usuário
router.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.currentYear = new Date().getFullYear();
  next();
});

// Middleware para adicionar informações de paginação
router.use((req, res, next) => {
  res.locals.pagination = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
    offset: function() {
      return (this.page - 1) * this.limit;
    }
  };
  next();
});

// Middleware para adicionar informações de filtros
router.use((req, res, next) => {
  res.locals.filters = {
    status: req.query.status,
    sexo: req.query.sexo,
    busca: req.query.busca,
    ano_referencia: req.query.ano_referencia
  };
  next();
});

// Middleware para adicionar informações de ordenação
router.use((req, res, next) => {
  res.locals.sort = {
    field: req.query.sort || 'created_at',
    order: req.query.order || 'desc'
  };
  next();
});

module.exports = router;
