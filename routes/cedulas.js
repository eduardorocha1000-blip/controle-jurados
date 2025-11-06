const express = require('express');
const { body, validationResult } = require('express-validator');
const Cedula = require('../models/Cedula');
const Sorteio = require('../models/Sorteio');
const db = require('../config/database');
const Jurado = require('../models/Jurado');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');
const router = express.Router();

// Tela inicial: escolher status a imprimir
router.get('/', (req, res) => {
  res.render('cedulas/selecionar', {
    title: 'Cédulas - Selecionar'
  });
});

router.post('/continuar', (req, res) => {
  const status = req.body.status || 'Ambos';
  const statusParam = encodeURIComponent(status);
  res.redirect(`/cedulas/imprimir-cartoes?status=${statusParam}&auto=1`);
});

// Listar cédulas (migrado para /cedulas/lista)
router.get('/lista', async (req, res) => {
  try {
    const filtros = {
      sorteio_id: req.query.sorteio_id,
      status: req.query.status
    };

    const cedulas = await Cedula.listar(filtros);
    const sorteios = await Sorteio.listar();

    res.render('cedulas/index', {
      title: 'Cédulas - Controle de Jurados',
      cedulas,
      sorteios,
      filtros
    });
  } catch (error) {
    console.error('Erro ao listar cédulas:', error);
    res.render('error', {
      title: 'Erro',
      message: 'Erro ao carregar lista de cédulas',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Imprimir cartões de jurados em grade A4 (3x4)
router.get('/imprimir-cartoes', async (req, res) => {
  try {
    const cfgRows = await db('configuracoes').whereLike('chave', 'cedulas_%');
    const cfg = {}; cfgRows.forEach(r => cfg[r.chave] = r.valor);
    const statusFiltro = req.query.status || cfg.cedulas_status_filtro || 'Ambos';
    const mostrarMotivo = (cfg.cedulas_mostrar_motivo_inativo || '1') === '1';

    const filtros = {};
    if (statusFiltro === 'Ativo' || statusFiltro === 'Inativo') filtros.status = statusFiltro;
    const jurados = await Jurado.listar(filtros);

    // Carregar logo como data URI embutida (aceita .png/.jpg/.jpeg/.webp)
    let logoDataUrl = '';
    const candidates = [
      { file: 'logo-tjsc.png', mime: 'image/png' },
      { file: 'logo-tjsc.jpg', mime: 'image/jpeg' },
      { file: 'logo-tjsc.jpeg', mime: 'image/jpeg' },
      { file: 'logo-tjsc.webp', mime: 'image/webp' }
    ];
    for (const c of candidates) {
      try {
        const p = path.join(__dirname, '..', 'public', 'images', c.file);
        if (fs.existsSync(p)) {
          const buf = fs.readFileSync(p);
          logoDataUrl = `data:${c.mime};base64,` + buf.toString('base64');
          break;
        }
      } catch (_) {}
    }

    res.render('cedulas/cartoes', {
      title: 'Imprimir Cartões de Jurados',
      jurados,
      mostrarMotivo,
      statusFiltro,
      autoPrint: String(req.query.auto||'0') === '1',
      logoDataUrl
    });
  } catch (error) {
    console.error('Erro ao imprimir cartões:', error);
    res.render('error', { title: 'Erro', message: 'Erro ao preparar impressão de cartões', error: process.env.NODE_ENV === 'development' ? error : {} });
  }
});

// Exportar PDF da lista de cédulas (mesmo layout)
router.get('/exportar-pdf', async (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const status = encodeURIComponent(req.query.status || 'Ambos');
    const url = `${baseUrl}/cedulas/imprimir-cartoes?status=${status}&auto=0`;

    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', margin: { top: '1cm', bottom: '1cm', left: '1cm', right: '1cm' }, printBackground: true });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="cedulas.pdf"');
    res.send(pdf);
  } catch (error) {
    console.error('Erro ao exportar PDF de cédulas:', error);
    res.status(500).send('Erro ao exportar PDF');
  }
});

// Gerar cédulas
router.post('/gerar', async (req, res) => {
  try {
    const { sorteio_id, quantidade } = req.body;
    
    if (!sorteio_id) {
      return res.json({
        success: false,
        message: 'Sorteio é obrigatório'
      });
    }

    const cedulas = await Cedula.gerarCedulas(sorteio_id, parseInt(quantidade) || 100);
    
    res.json({
      success: true,
      message: `${cedulas.length} cédulas geradas com sucesso!`,
      geradas: cedulas.length
    });
  } catch (error) {
    console.error('Erro ao gerar cédulas:', error);
    res.json({
      success: false,
      message: 'Erro ao gerar cédulas: ' + error.message
    });
  }
});

// Visualizar cédula
router.get('/:id/visualizar', async (req, res) => {
  try {
    const cedula = await Cedula.buscarPorId(req.params.id);
    if (!cedula) {
      return res.status(404).render('error', {
        title: 'Cédula não encontrada',
        message: 'A cédula solicitada não foi encontrada.',
        error: {}
      });
    }

    res.render('cedulas/visualizar', {
      title: `Cédula ${cedula.numero_cedula} - Controle de Jurados`,
      cedula
    });
  } catch (error) {
    console.error('Erro ao visualizar cédula:', error);
    res.render('error', {
      title: 'Erro',
      message: 'Erro ao carregar cédula',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Imprimir cédula
router.get('/:id/imprimir', async (req, res) => {
  try {
    const cedula = await Cedula.buscarPorId(req.params.id);
    if (!cedula) {
      return res.status(404).render('error', {
        title: 'Cédula não encontrada',
        message: 'A cédula solicitada não foi encontrada.',
        error: {}
      });
    }

    res.render('cedulas/visualizar', {
      title: `Cédula ${cedula.numero_cedula} - Controle de Jurados`,
      cedula,
      print: true
    });
  } catch (error) {
    console.error('Erro ao imprimir cédula:', error);
    res.render('error', {
      title: 'Erro',
      message: 'Erro ao imprimir cédula',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Imprimir cédulas de um sorteio
router.get('/imprimir/:sorteioId', async (req, res) => {
  try {
    const sorteio = await Sorteio.buscarPorId(req.params.sorteioId);
    if (!sorteio) {
      return res.status(404).render('error', {
        title: 'Sorteio não encontrado',
        message: 'O sorteio solicitado não foi encontrado.',
        error: {}
      });
    }

    const cedulas = await Cedula.listar({ sorteio_id: req.params.sorteioId });

    res.render('cedulas/imprimir-lote', {
      title: `Imprimir Cédulas - Sorteio ${sorteio.id}`,
      sorteio,
      cedulas
    });
  } catch (error) {
    console.error('Erro ao imprimir cédulas:', error);
    res.render('error', {
      title: 'Erro',
      message: 'Erro ao imprimir cédulas',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Exportar cédulas
router.get('/exportar/:sorteioId', async (req, res) => {
  try {
    const sorteio = await Sorteio.buscarPorId(req.params.sorteioId);
    if (!sorteio) {
      return res.status(404).json({
        success: false,
        message: 'Sorteio não encontrado'
      });
    }

    const cedulas = await Cedula.listar({ sorteio_id: req.params.sorteioId });
    
    // Gerar CSV
    const csv = Cedula.gerarCSV(cedulas);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="cedulas_sorteio_${sorteio.id}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Erro ao exportar cédulas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao exportar cédulas'
    });
  }
});

// Excluir cédula
router.delete('/:id', async (req, res) => {
  try {
    await Cedula.excluir(req.params.id);
    
    res.json({
      success: true,
      message: 'Cédula excluída com sucesso!'
    });
  } catch (error) {
    console.error('Erro ao excluir cédula:', error);
    res.json({
      success: false,
      message: 'Erro ao excluir cédula: ' + error.message
    });
  }
});

module.exports = router;