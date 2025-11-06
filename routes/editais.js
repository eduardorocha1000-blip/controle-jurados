const express = require('express');
const { body, validationResult } = require('express-validator');
const Edital = require('../models/Edital');
const Jurado = require('../models/Jurado');
const Juiz = require('../models/Juiz');
const puppeteer = require('puppeteer');
const router = express.Router();

// Listar editais
router.get('/', async (req, res) => {
  try {
    const filtros = {
      ano_referencia: req.query.ano_referencia,
      busca: req.query.busca
    };

    const editais = await Edital.listar(filtros);
    const juizes = await Juiz.listar();
    
    // Calcular estatísticas
    const totalEditais = editais.length;
    
    // Calcular status baseado no campo status
    const editaisPublicados = editais.filter(e => e.status === 'Publicado').length;
    const editaisRascunho = editais.filter(e => e.status === 'Rascunho').length;
    
    // Calcular editais do ano atual
    const anoAtual = new Date().getFullYear();
    const editaisAnoAtual = editais.filter(e => {
      if (e.data_publicacao_prevista) {
        const anoEdital = new Date(e.data_publicacao_prevista).getFullYear();
        return anoEdital === anoAtual;
      }
      return false;
    }).length;

    res.render('editais/index', {
      title: 'Editais - Controle de Jurados',
      editais,
      juizes,
      filtros,
      totalEditais,
      editaisPublicados,
      editaisRascunho,
      editaisAnoAtual
    });
  } catch (error) {
    console.error('Erro ao listar editais:', error);
    res.render('error', {
      title: 'Erro',
      message: 'Erro ao carregar lista de editais',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Formulário novo edital
router.get('/novo', async (req, res) => {
  try {
    const juizes = await Juiz.listar();
    
    // Gerar template padrão com placeholders
    const anoProximo = new Date().getFullYear() + 1;
    const templatePadrao = Edital.gerarTemplatePadrao(anoProximo);
    const juizTitular = await Juiz.buscarTitular();
    
    res.render('editais/form', {
      title: 'Novo Edital - Controle de Jurados',
      edital: {
        ano_referencia: anoProximo,
        titulo: `EDITAL DE ALISTAMENTO DE JURADOS PARA O ANO ${anoProximo} DA COMARCA DE CAPIVARI DE BAIXO/SC`,
        corpo_rtf: templatePadrao,
        juiz_id: juizTitular ? juizTitular.id : null
      },
      juizes,
      action: '/editais'
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

// Criar edital
router.post('/', [
  body('ano_referencia').isInt({ min: 2020, max: 2030 }),
  body('numero').isLength({ min: 1, max: 20 }).trim(),
  body('titulo').isLength({ min: 5, max: 100 }).trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const juizes = await Juiz.listar();
      return res.render('editais/form', {
        title: 'Novo Edital - Controle de Jurados',
        edital: req.body,
        juizes,
        action: '/editais',
        errors: errors.array()
      });
    }

    // Remover campos desnecessários do req.body
    const { _method, ...dadosCriacao } = req.body;
    await Edital.criar(dadosCriacao);
    req.flash = req.flash || {};
    req.flash.success = 'Edital criado com sucesso!';
    res.redirect('/editais');
  } catch (error) {
    console.error('Erro ao criar edital:', error);
    const juizes = await Juiz.listar();
    res.render('editais/form', {
      title: 'Novo Edital - Controle de Jurados',
      edital: req.body,
      juizes,
      action: '/editais',
      error: 'Erro ao criar edital'
    });
  }
});

// Visualizar edital
router.get('/:id', async (req, res) => {
  try {
    const edital = await Edital.buscarPorId(req.params.id);
    if (!edital) {
      return res.status(404).render('error', {
        title: 'Edital não encontrado',
        message: 'O edital solicitado não foi encontrado.',
        error: {}
      });
    }

    res.render('editais/view', {
      title: `Edital ${edital.numero} - Controle de Jurados`,
      edital
    });
  } catch (error) {
    console.error('Erro ao visualizar edital:', error);
    res.render('error', {
      title: 'Erro',
      message: 'Erro ao carregar dados do edital',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Formulário editar edital
router.get('/:id/editar', async (req, res) => {
  try {
    const edital = await Edital.buscarPorId(req.params.id);
    if (!edital) {
      return res.status(404).render('error', {
        title: 'Edital não encontrado',
        message: 'O edital solicitado não foi encontrado.',
        error: {}
      });
    }

    const juizes = await Juiz.listar();
    
    // Se o campo corpo_rtf estiver vazio, preencher com template padrão
    let corpoRtf = edital.corpo_rtf;
    if (!corpoRtf || corpoRtf.trim() === '') {
      corpoRtf = Edital.gerarTemplatePadrao(edital.ano_referencia, edital.juiz_nome);
    }
    
    res.render('editais/form', {
      title: `Editar Edital ${edital.numero} - Controle de Jurados`,
      edital: {
        ...edital,
        corpo_rtf: corpoRtf
      },
      juizes,
      action: `/editais/${edital.id}?_method=PUT`
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

// Atualizar edital
router.put('/:id', [
  body('ano_referencia').isInt({ min: 2020, max: 2030 }),
  body('numero').isLength({ min: 1, max: 20 }).trim(),
  body('titulo').isLength({ min: 5, max: 100 }).trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const edital = await Edital.buscarPorId(req.params.id);
      const juizes = await Juiz.listar();
      return res.render('editais/form', {
        title: `Editar Edital ${edital.numero} - Controle de Jurados`,
        edital: { ...edital, ...req.body },
        juizes,
        action: `/editais/${req.params.id}?_method=PUT`,
        errors: errors.array()
      });
    }

    // Remover campos desnecessários do req.body
    const { _method, ...dadosAtualizacao } = req.body;
    await Edital.atualizar(req.params.id, dadosAtualizacao);
    req.flash = req.flash || {};
    req.flash.success = 'Edital atualizado com sucesso!';
    res.redirect('/editais');
  } catch (error) {
    console.error('Erro ao atualizar edital:', error);
    res.render('error', {
      title: 'Erro',
      message: 'Erro ao atualizar edital',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Excluir edital
router.delete('/:id', async (req, res) => {
  try {
    await Edital.excluir(req.params.id);
    res.json({ success: true, message: 'Edital excluído com sucesso!' });
  } catch (error) {
    console.error('Erro ao excluir edital:', error);
    res.status(500).json({ success: false, message: 'Erro ao excluir edital: ' + error.message });
  }
});

// Gerar PDF
router.get('/:id/pdf', async (req, res) => {
  try {
    const edital = await Edital.buscarPorId(req.params.id);
    if (!edital) {
      return res.status(404).render('error', {
        title: 'Edital não encontrado',
        message: 'O edital solicitado não foi encontrado.',
        error: {}
      });
    }

    // Criar HTML para o PDF
    // Normalizar meses em maiúsculas dentro do corpo RTF, se houver
    const upperMonth = (txt = '') => {
      return txt
        .replace(/\bjaneiro\b/gi, 'JANEIRO')
        .replace(/\bfevereiro\b/gi, 'FEVEREIRO')
        .replace(/\bmarço\b/gi, 'MARÇO')
        .replace(/\bmarco\b/gi, 'MARÇO')
        .replace(/\babril\b/gi, 'ABRIL')
        .replace(/\bmaio\b/gi, 'MAIO')
        .replace(/\bjunho\b/gi, 'JUNHO')
        .replace(/\bjulho\b/gi, 'JULHO')
        .replace(/\bagosto\b/gi, 'AGOSTO')
        .replace(/\bsetembro\b/gi, 'SETEMBRO')
        .replace(/\boutubro\b/gi, 'OUTUBRO')
        .replace(/\bnovembro\b/gi, 'NOVEMBRO')
        .replace(/\bdezembro\b/gi, 'DEZEMBRO');
    };
    const corpoParaPdf = edital.corpo_rtf ? upperMonth(edital.corpo_rtf) : '';
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Edital ${edital.numero}/${edital.ano_referencia}</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 40px;
                line-height: 1.6;
                color: #333;
                text-align: justify;
            }
            .header {
                text-align: center;
                border-bottom: 2px solid #333;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }
            .header h1 {
                font-size: 24px;
                margin: 0;
                color: #2c3e50;
            }
            .header h2 {
                font-size: 18px;
                margin: 10px 0 0 0;
                color: #7f8c8d;
            }
            .content { margin-bottom: 30px; text-align: justify; }
            .field { margin-bottom: 15px; text-align: justify; }
            p { text-align: justify; }
            .field strong {
                color: #2c3e50;
            }
            .status {
                display: inline-block;
                padding: 5px 15px;
                border-radius: 20px;
                font-weight: bold;
                font-size: 14px;
            }
            .status-rascunho {
                background-color: #f39c12;
                color: white;
            }
            .status-publicado {
                background-color: #27ae60;
                color: white;
            }
            .footer {
                margin-top: 50px;
                text-align: center;
                border-top: 1px solid #ddd;
                padding-top: 20px;
                color: #7f8c8d;
            }
            .observacoes {
                background-color: #f8f9fa;
                padding: 15px;
                border-left: 4px solid #3498db;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>TRIBUNAL DE JUSTIÇA DE SANTA CATARINA</h1>
            <h2>COMARCA DE CAPIVARI DE BAIXO</h2>
        </div>

        <div class="content">
            <div class="field">
                <strong>EDITAL Nº:</strong> ${edital.numero}/${edital.ano_referencia}
            </div>
            
            <div class="field">
                <strong>TÍTULO:</strong> ${edital.titulo}
            </div>
            
            
            
            <div class="field">
                <strong>JUIZ RESPONSÁVEL:</strong> ${edital.juiz_nome || 'Não definido'}
            </div>
            
            <div class="field">
                <strong>DATA DE PUBLICAÇÃO PREVISTA:</strong> 
                ${edital.data_publicacao_prevista ? new Date(edital.data_publicacao_prevista + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não definida'}
            </div>
            
            <div class="field">
                <strong>DATA DE PUBLICAÇÃO REAL:</strong> 
                ${edital.data_publicacao_real ? new Date(edital.data_publicacao_real + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não definida'}
            </div>
            
            ${edital.observacoes ? `
            <div class="observacoes">
                <strong>OBSERVAÇÕES:</strong><br>
                ${edital.observacoes}
            </div>
            ` : ''}
            
            ${corpoParaPdf ? `
            <div class="field">
                <strong>CONTEÚDO DO EDITAL:</strong>
                <div style="margin-top: 10px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
                    <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${corpoParaPdf}</pre>
                </div>
            </div>
            ` : ''}
        </div>

        
    </body>
    </html>`;

    // Gerar PDF com Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      },
      printBackground: true
    });
    
    await browser.close();

    // Enviar PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="edital_${edital.numero}_${edital.ano_referencia}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    res.status(500).render('error', {
      title: 'Erro',
      message: 'Erro ao gerar PDF do edital',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

  // Download RTF
router.get('/:id/download', async (req, res) => {
  try {
    const edital = await Edital.buscarPorId(req.params.id);
    if (!edital) {
      return res.status(404).render('error', {
        title: 'Edital não encontrado',
        message: 'O edital solicitado não foi encontrado.',
        error: {}
      });
    }

    // Gerar conteúdo RTF com alinhamento justificado (\qj)
    const conteudoRTF = edital.corpo_rtf || (
`{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0 Arial;}}
\\fs22\\qj
EDITAL ${edital.numero}/${edital.ano_referencia}\\par
\\par
${edital.titulo}\\par
\\par
Juiz Responsável: ${edital.juiz_nome || 'Não definido'}\\par
\\par
Data de Publicação Prevista: ${edital.data_publicacao_prevista ? new Date(edital.data_publicacao_prevista + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não definida'}\\par
\\par
Data de Publicação Real: ${edital.data_publicacao_real ? new Date(edital.data_publicacao_real + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não definida'}\\par
\\par
${edital.observacoes ? `Observações: ${edital.observacoes}\\par` : ''}
\\par
Comarca de Capivari de Baixo\\par
Tribunal de Justiça de Santa Catarina\\par
}`
    );

    res.setHeader('Content-Type', 'application/rtf');
    res.setHeader('Content-Disposition', `attachment; filename="edital_${edital.numero}_${edital.ano_referencia}.rtf"`);
    res.send(conteudoRTF);
  } catch (error) {
    console.error('Erro ao fazer download:', error);
    res.status(500).render('error', {
      title: 'Erro',
      message: 'Erro ao fazer download do edital',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Gerar RTF (GET)
router.get('/:id/gerar-rtf', async (req, res) => {
  try {
    const edital = await Edital.buscarPorId(req.params.id);
    if (!edital) {
      return res.status(404).render('error', {
        title: 'Edital não encontrado',
        message: 'O edital solicitado não foi encontrado.',
        error: {}
      });
    }

    // Por enquanto, redirecionar para download até implementar RTF
    res.redirect(`/editais/${edital.id}/download`);
  } catch (error) {
    console.error('Erro ao gerar RTF:', error);
    res.status(500).render('error', {
      title: 'Erro',
      message: 'Erro ao gerar RTF do edital',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// API para buscar lista de jurados ativos
router.get('/api/jurados-ativos', async (req, res) => {
  try {
    const listaJurados = await Edital.gerarListaJurados();
    res.json({ lista: listaJurados });
  } catch (error) {
    console.error('Erro ao buscar jurados ativos:', error);
    res.status(500).json({ error: 'Erro ao buscar jurados ativos' });
  }
});

// Gerar RTF (POST)
router.post('/:id/gerar-rtf', [
  body('fundamento_legal').isLength({ min: 10 }),
  body('quantitativo_jurados').isInt({ min: 1 }),
  body('data_publicacao').isISO8601(),
  body('assinatura_autoridade').isLength({ min: 5 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash = req.flash || {};
      req.flash.error = 'Dados inválidos para geração do RTF';
      return res.redirect(`/editais/${req.params.id}`);
    }

    const dados = {
      fundamento_legal: req.body.fundamento_legal,
      quantitativo_jurados: req.body.quantitativo_jurados,
      data_publicacao: req.body.data_publicacao,
      assinatura_autoridade: req.body.assinatura_autoridade,
      comarca: req.body.comarca || 'Capivari de Baixo'
    };

    const rtfContent = await Edital.gerarRTF(req.params.id, dados);
    
    req.flash = req.flash || {};
    req.flash.success = 'RTF gerado com sucesso!';
    res.redirect(`/editais/${req.params.id}`);
  } catch (error) {
    console.error('Erro ao gerar RTF:', error);
    req.flash = req.flash || {};
    req.flash.error = 'Erro ao gerar RTF: ' + error.message;
    res.redirect(`/editais/${req.params.id}`);
  }
});

// Download RTF
router.get('/:id/download', async (req, res) => {
  try {
    const edital = await Edital.buscarPorId(req.params.id);
    if (!edital) {
      return res.status(404).render('error', {
        title: 'Edital não encontrado',
        message: 'O edital solicitado não foi encontrado.',
        error: {}
      });
    }

    if (!edital.corpo_rtf) {
      req.flash = req.flash || {};
      req.flash.error = 'RTF ainda não foi gerado para este edital';
      return res.redirect(`/editais/${req.params.id}`);
    }

    // Garantir meses em maiúsculas no RTF baixado
    const upperMonth = (txt = '') => {
      return txt
        .replace(/\bjaneiro\b/gi, 'JANEIRO')
        .replace(/\bfevereiro\b/gi, 'FEVEREIRO')
        .replace(/\bmarço\b/gi, 'MARÇO')
        .replace(/\bmarco\b/gi, 'MARÇO')
        .replace(/\babril\b/gi, 'ABRIL')
        .replace(/\bmaio\b/gi, 'MAIO')
        .replace(/\bjunho\b/gi, 'JUNHO')
        .replace(/\bjulho\b/gi, 'JULHO')
        .replace(/\bagosto\b/gi, 'AGOSTO')
        .replace(/\bsetembro\b/gi, 'SETEMBRO')
        .replace(/\boutubro\b/gi, 'OUTUBRO')
        .replace(/\bnovembro\b/gi, 'NOVEMBRO')
        .replace(/\bdezembro\b/gi, 'DEZEMBRO');
    };
    const rtfUpper = upperMonth(edital.corpo_rtf);
    res.setHeader('Content-Type', 'application/rtf');
    res.setHeader('Content-Disposition', `attachment; filename="${edital.arquivo_rtf_gerado || `edital_${edital.numero}.rtf`}"`);
    res.send(rtfUpper);
  } catch (error) {
    console.error('Erro ao fazer download do RTF:', error);
    res.status(500).render('error', {
      title: 'Erro',
      message: 'Erro ao fazer download do RTF',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Preview RTF
router.get('/:id/preview', async (req, res) => {
  try {
    const edital = await Edital.buscarPorId(req.params.id);
    if (!edital) {
      return res.status(404).render('error', {
        title: 'Edital não encontrado',
        message: 'O edital solicitado não foi encontrado.',
        error: {}
      });
    }

    res.render('editais/preview', {
      title: `Preview - Edital ${edital.numero}`,
      edital
    });
  } catch (error) {
    console.error('Erro ao carregar preview:', error);
    res.render('error', {
      title: 'Erro',
      message: 'Erro ao carregar preview do edital',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

module.exports = router;
