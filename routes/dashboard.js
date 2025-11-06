const express = require('express');
const Juiz = require('../models/Juiz');
const Instituicao = require('../models/Instituicao');
const Jurado = require('../models/Jurado');
const db = require('../config/database');
const router = express.Router();

// Dashboard principal
router.get('/', async (req, res) => {
  try {
    const totalJurados = await Jurado.contar();
    const totalInstituicoes = await Instituicao.contar();
    const juradosAtivos = await Jurado.contarPorStatus('Ativo');
    const juradosInativos = await Jurado.contarPorStatus('Inativo');
    
    // Buscar último edital
    const ultimoEdital = await db('editais')
      .orderBy('created_at', 'desc')
      .first();
    
    // Buscar próximos sorteios
    const proximosSorteios = await db('sorteios')
      .where('data_juri', '>=', new Date())
      .orderBy('data_juri')
      .limit(5);
    
    res.render('dashboard/index', {
      title: 'Dashboard - Controle de Jurados',
      totalJurados,
      totalInstituicoes,
      juradosAtivos,
      juradosInativos,
      ultimoEdital,
      proximosSorteios
    });
  } catch (error) {
    console.error('Erro no dashboard:', error);
    res.render('error', {
      title: 'Erro',
      message: 'Erro ao carregar dashboard',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

module.exports = router;
