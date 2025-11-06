const express = require('express');
const { body, validationResult } = require('express-validator');
const EmailService = require('../services/EmailService');
const Instituicao = require('../models/Instituicao');
const router = express.Router();

const emailService = new EmailService();

// Página principal de e-mails
router.get('/', async (req, res) => {
  try {
    // Buscar estatísticas
    const stats = await emailService.getStats();
    
    // Buscar instituições para o formulário
    const instituicoes = await Instituicao.listarAtivas();
    
    // Buscar configurações de e-mail
    const config = await emailService.getConfig();
    
    // Buscar histórico recente
    const emails = await emailService.listarEnvios({ limit: 10 });
    
    res.render('emails/index', {
      title: 'E-mails - Controle de Jurados',
      stats,
      instituicoes,
      config,
      emails,
      filtros: req.query
    });
  } catch (error) {
    console.error('Erro ao carregar página de e-mails:', error);
    res.render('error', {
      title: 'Erro',
      message: 'Erro ao carregar página de e-mails',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Controle de e-mails (JSON) – lista com filtros simples
router.get('/controle', async (req, res) => {
  try {
    const filtros = {};
    if (req.query.status) filtros.status = req.query.status;
    if (req.query.instituicao_id) filtros.instituicao_id = req.query.instituicao_id;
    const rows = await emailService.listarEnvios(filtros);
    const pad = (n) => String(n).padStart(2, '0');
    const fmt = (v) => {
      try {
        if (!v) return '';
        let d;
        if (typeof v === 'number') d = new Date(v);
        else if (typeof v === 'string' && /^\d+$/.test(v)) d = new Date(parseInt(v, 10));
        else d = new Date(v);
        return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      } catch { return String(v); }
    };
    const data = rows.map(e => {
      const corpo = e.corpo_html || '';
      const tipoRaw = (e.tipo || '').toString().toLowerCase();
      const assunto = (e.assunto || '').toLowerCase();
      const isReceb = /TIPO:\s*RECEBIDO/i.test(corpo) || tipoRaw.includes('receb') || assunto.includes('receb');
      // Extrair ano de referência do assunto/corpo (ex.: 2020-2099)
      let anoRef = '';
      try {
        const m0 = (corpo || '').match(/<!--\s*ANO\s*:\s*(20\d{2})\s*-->/i);
        const m1 = (e.assunto || '').match(/\b(20\d{2})\b/);
        const m2 = !m1 && (corpo || '').match(/\b(20\d{2})\b/);
        anoRef = (m0 && m0[1]) || (m1 && m1[1]) || (m2 && m2[1]) || '';
      } catch(_) {}
      return {
        id: e.id,
        data_envio: fmt(e.enviado_em || e.created_at),
        destinatario: e.destinatario || e.instituicao_nome || '',
        ano_referencia: anoRef,
        assunto: e.assunto || '',
        status: e.status || '',
        tipo: isReceb ? 'Recebido' : 'Intimado'
      };
    })
    .filter(row => {
      // Filtro por tipo antigo (compatibilidade)
      if (req.query.tipo) {
        if (req.query.tipo === 'intimacao' && row.tipo !== 'Intimado') return false;
        if (req.query.tipo === 'recebimento' && row.tipo !== 'Recebido') return false;
      }
      // Filtros novos
      const dest = (req.query.destinatario || '').toString().trim().toLowerCase();
      if (dest && !(row.destinatario || '').toString().toLowerCase().includes(dest)) return false;
      const ano = (req.query.ano || '').toString().trim();
      if (ano && row.ano_referencia !== ano) return false;
      const mostrarIntimados = (req.query.mostrar_intimados ?? '1') !== '0';
      const mostrarRecebidos = (req.query.mostrar_recebidos ?? '1') !== '0';
      if (!mostrarIntimados && row.tipo === 'Intimado') return false;
      if (!mostrarRecebidos && row.tipo === 'Recebido') return false;
      return true;
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('[Emails] /controle erro:', error);
    res.json({ success: false, message: error.message, data: [] });
  }
});

// Listar modelos de e-mail
router.get('/modelos', async (req, res) => {
  try {
    const envios = await emailService.listarEnvios();
    res.render('emails/modelos', {
      title: 'Modelos de E-mail - Controle de Jurados',
      envios
    });
  } catch (error) {
    console.error('Erro ao listar modelos:', error);
    res.render('error', {
      title: 'Erro',
      message: 'Erro ao carregar modelos de e-mail',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Enviar intimação individual
router.get('/enviar/:instituicaoId', async (req, res) => {
  try {
    const instituicao = await Instituicao.buscarPorId(req.params.instituicaoId);
    if (!instituicao) {
      return res.status(404).render('error', {
        title: 'Instituição não encontrada',
        message: 'A instituição solicitada não foi encontrada.',
        error: {}
      });
    }

    res.render('emails/enviar', {
      title: `Enviar E-mail - ${instituicao.nome}`,
      instituicao,
      action: `/emails/enviar/${instituicao.id}`
    });
  } catch (error) {
    console.error('Erro ao carregar formulário de envio:', error);
    res.render('error', {
      title: 'Erro',
      message: 'Erro ao carregar formulário de envio',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Processar envio individual
router.post('/enviar/:instituicaoId', [
  body('ano').isInt({ min: 2020, max: 2030 }),
  body('quantidade').isInt({ min: 1, max: 99 }),
  body('prazo_data').isLength({ min: 5 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const instituicao = await Instituicao.buscarPorId(req.params.instituicaoId);
      return res.render('emails/enviar', {
        title: `Enviar E-mail - ${instituicao.nome}`,
        instituicao,
        action: `/emails/enviar/${instituicao.id}`,
        errors: errors.array()
      });
    }

    const dados = {
      ano: req.body.ano,
      quantidade: req.body.quantidade,
      prazo_data: req.body.prazo_data,
      link_upload: `${process.env.APP_URL}/indicacoes/upload`
    };

    await emailService.enviarIntimacao(req.params.instituicaoId, dados);
    
    req.flash = req.flash || {};
    req.flash.success = 'E-mail enviado com sucesso!';
    res.redirect('/emails/modelos');
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    const instituicao = await Instituicao.buscarPorId(req.params.instituicaoId);
    res.render('emails/enviar', {
      title: `Enviar E-mail - ${instituicao.nome}`,
      instituicao,
      action: `/emails/enviar/${instituicao.id}`,
      error: 'Erro ao enviar e-mail: ' + error.message
    });
  }
});

// Enviar em lote
router.get('/lote', async (req, res) => {
  try {
    const instituicoes = await Instituicao.listarAtivas();
    res.render('emails/lote', {
      title: 'Envio em Lote - Controle de Jurados',
      instituicoes
    });
  } catch (error) {
    console.error('Erro ao carregar página de envio em lote:', error);
    res.render('error', {
      title: 'Erro',
      message: 'Erro ao carregar página de envio em lote',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Processar envio em lote
router.post('/lote', [
  body('ano').isInt({ min: 2020, max: 2030 }),
  body('quantidade').isInt({ min: 1, max: 99 }),
  body('prazo_data').isLength({ min: 5 }),
  body('instituicoes').isArray({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const instituicoes = await Instituicao.listarAtivas();
      return res.render('emails/lote', {
        title: 'Envio em Lote - Controle de Jurados',
        instituicoes,
        errors: errors.array()
      });
    }

    const dados = {
      ano: req.body.ano,
      quantidade: req.body.quantidade,
      prazo_data: req.body.prazo_data,
      link_upload: `${process.env.APP_URL}/indicacoes/upload`
    };

    const resultado = await emailService.enviarLote(req.body.instituicoes, dados);
    
    req.flash = req.flash || {};
    req.flash.success = `Envio em lote concluído: ${resultado.sucessos} sucessos, ${resultado.erros} erros`;
    res.redirect('/emails/modelos');
  } catch (error) {
    console.error('Erro ao enviar em lote:', error);
    req.flash = req.flash || {};
    req.flash.error = 'Erro ao enviar e-mails em lote: ' + error.message;
    res.redirect('/emails/lote');
  }
});

// Histórico de envios
router.get('/historico', async (req, res) => {
  try {
    const filtros = {
      status: req.query.status,
      instituicao_id: req.query.instituicao_id
    };

    const envios = await emailService.listarEnvios(filtros);
    const instituicoes = await Instituicao.listar();

    res.render('emails/historico', {
      title: 'Histórico de E-mails - Controle de Jurados',
      envios,
      instituicoes,
      filtros
    });
  } catch (error) {
    console.error('Erro ao carregar histórico:', error);
    res.render('error', {
      title: 'Erro',
      message: 'Erro ao carregar histórico de e-mails',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Visualizar e-mail enviado
router.get('/visualizar/:id', async (req, res) => {
  try {
    const envio = await emailService.listarEnvios({ id: req.params.id });
    if (!envio || envio.length === 0) {
      return res.status(404).render('error', {
        title: 'E-mail não encontrado',
        message: 'O e-mail solicitado não foi encontrado.',
        error: {}
      });
    }

    res.render('emails/visualizar', {
      title: `E-mail - ${envio[0].assunto}`,
      envio: envio[0]
    });
  } catch (error) {
    console.error('Erro ao visualizar e-mail:', error);
    res.render('error', {
      title: 'Erro',
      message: 'Erro ao visualizar e-mail',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Enviar intimação (nova funcionalidade)
router.post('/enviar-intimacao', async (req, res) => {
  try {
    console.log('[Emails] POST /enviar-intimacao - Recebido');
    console.log('[Emails] req.body:', req.body);
    console.log('[Emails] Content-Type:', req.headers['content-type']);
    
    // Processar dados do FormData ou JSON
    let ano_referencia, instituicoes, assunto, mensagem;
    
    ano_referencia = req.body.ano_referencia;
    assunto = req.body.assunto;
    mensagem = req.body.mensagem;
    
    // Processar instituições - pode vir como array ou múltiplos valores
    if (Array.isArray(req.body.instituicoes)) {
      instituicoes = req.body.instituicoes;
    } else if (req.body.instituicoes) {
      // Se vier como string única ou objeto
      instituicoes = [req.body.instituicoes];
    } else {
      // Verificar se há múltiplos valores com mesmo nome (comum em URL-encoded)
      const allKeys = Object.keys(req.body);
      const instituicoesKeys = allKeys.filter(key => key.startsWith('instituicoes'));
      if (instituicoesKeys.length > 0) {
        instituicoes = instituicoesKeys.map(key => req.body[key]).filter(Boolean);
      } else {
        instituicoes = [];
      }
    }
    
    console.log('[Emails] Dados processados:', {
      ano_referencia: ano_referencia,
      instituicoes: instituicoes,
      assunto: assunto,
      mensagem: mensagem ? mensagem.substring(0, 50) : 'vazio'
    });
    
    if (!ano_referencia || ano_referencia === '') {
      console.log('[Emails] ❌ Validação falhou: ano_referencia está vazio');
      return res.json({
        success: false,
        message: 'Ano de referência é obrigatório',
        detalhes: [],
        sucessos: 0,
        erros: 0
      });
    }
    
    // Montar base URL a partir da requisição quando APP_URL não estiver definido
    const baseUrl = process.env.APP_URL && process.env.APP_URL.trim() !== ''
      ? process.env.APP_URL
      : `${req.protocol}://${req.get('host')}`;

    const dados = {
      ano: ano_referencia,
      // Não enviar quantidade padrão aqui; se a instituição tiver quantidade cadastrada, ela será usada
      prazo_data: '30 dias',
      link_upload: `${baseUrl}/indicacoes/upload`,
      assunto: assunto,
      mensagem: mensagem
    };

    console.log('[Emails] Dados preparados:', dados);

    let resultado;
    // Tratar opção "todas"
    const incluiTodas = Array.isArray(instituicoes) && instituicoes.some(v => String(v).toLowerCase() === 'todas');
    if (instituicoes && instituicoes.length > 0 && !incluiTodas) {
      console.log('[Emails] Enviando para instituições específicas:', instituicoes);
      resultado = await emailService.enviarLote(instituicoes, dados);
    } else {
      console.log('[Emails] Enviando para todas as instituições ativas');
      const todasInstituicoes = await Instituicao.listarAtivas();
      console.log('[Emails] Instituições encontradas:', todasInstituicoes.length);
      const ids = todasInstituicoes.map(i => i.id);
      resultado = await emailService.enviarLote(ids, dados);
    }
    
    console.log('[Emails] Resultado do envio:', resultado);
    
    // Montar mensagem com detalhes
    let message = `Intimações enviadas: ${resultado.sucessos} sucessos, ${resultado.erros} erros`;
    if (resultado.erros > 0 && resultado.detalhes.length > 0) {
      const erros = resultado.detalhes.filter(d => d.includes('Erro') || d.includes('erro'));
      if (erros.length > 0) {
        message += '\n\nDetalhes dos erros:\n' + erros.join('\n');
      }
    }
    
    console.log('[Emails] Retornando resposta JSON');
    res.json({
      success: resultado.erros === 0,
      message: message,
      detalhes: resultado.detalhes,
      sucessos: resultado.sucessos,
      erros: resultado.erros
    });
  } catch (error) {
    console.error('[Emails] Erro ao enviar intimação:', error);
    console.error('[Emails] Stack trace:', error.stack);
    res.json({
      success: false,
      message: 'Erro ao enviar intimação: ' + error.message,
      detalhes: [error.message],
      sucessos: 0,
      erros: 1
    });
  }
});

// Enviar recebimentos (confirmação)
router.post('/enviar-recebimentos', async (req, res) => {
  try {
    console.log('[Emails] POST /enviar-recebimentos - Recebido');
    let ano_referencia, instituicoes;
    ano_referencia = req.body.ano_referencia;

    // Processar instituições semelhante ao envio de intimação
    if (Array.isArray(req.body.instituicoes)) {
      instituicoes = req.body.instituicoes;
    } else if (req.body.instituicoes) {
      instituicoes = [req.body.instituicoes];
    } else {
      const allKeys = Object.keys(req.body);
      const instituicoesKeys = allKeys.filter(key => key.startsWith('instituicoes'));
      instituicoes = instituicoesKeys.length > 0 ? instituicoesKeys.map(key => req.body[key]).filter(Boolean) : [];
    }

    if (!ano_referencia || ano_referencia === '') {
      return res.json({ success: false, message: 'Ano de referência é obrigatório', detalhes: [], sucessos: 0, erros: 0 });
    }

    const baseUrl = process.env.APP_URL && process.env.APP_URL.trim() !== ''
      ? process.env.APP_URL
      : `${req.protocol}://${req.get('host')}`;

    const dados = {
      ano: ano_referencia,
      prazo_data: '30 dias',
      link_upload: `${baseUrl}/indicacoes/upload`
    };

    let resultado;
    const incluiTodasRec = Array.isArray(instituicoes) && instituicoes.some(v => String(v).toLowerCase() === 'todas');
    if (instituicoes && instituicoes.length > 0 && !incluiTodasRec) {
      resultado = await emailService.enviarLoteConfirmacao(instituicoes, dados);
    } else {
      const todasInstituicoes = await Instituicao.listarAtivas();
      const ids = todasInstituicoes.map(i => i.id);
      resultado = await emailService.enviarLoteConfirmacao(ids, dados);
    }

    let message = `Recebimentos enviados: ${resultado.sucessos} sucessos, ${resultado.erros} erros`;
    res.json({ success: resultado.erros === 0, message, detalhes: resultado.detalhes, sucessos: resultado.sucessos, erros: resultado.erros });
  } catch (error) {
    console.error('[Emails] Erro ao enviar recebimentos:', error);
    res.json({ success: false, message: 'Erro ao enviar recebimentos: ' + error.message, detalhes: [error.message], sucessos: 0, erros: 1 });
  }
});

// Salvar configurações de e-mail
router.post('/configuracoes', async (req, res) => {
  try {
    console.log('[Emails] POST /configuracoes - Recebido:', req.body);
    console.log('[Emails] Headers:', {
      'content-type': req.headers['content-type'],
      'x-requested-with': req.headers['x-requested-with'],
      'accept': req.headers.accept
    });
    
    const config = {
      smtp_host: req.body.smtp_host,
      smtp_port: parseInt(req.body.smtp_port),
      smtp_secure: req.body.smtp_secure === 'true',
      smtp_user: req.body.smtp_user,
      smtp_pass: req.body.smtp_pass,
      email_from: req.body.email_from
    };

    await emailService.saveConfig(config);
    console.log('[Emails] Configurações salvas com sucesso');
    
    // SEMPRE fazer redirect com flash (não retornar JSON)
    req.flash = req.flash || {};
    req.flash.success = 'Configurações salvas com sucesso!';
    return res.redirect('/emails');
  } catch (error) {
    console.error('Erro ao salvar configurações:', error);
    
    // SEMPRE fazer redirect com flash (não retornar JSON)
    req.flash = req.flash || {};
    req.flash.error = 'Erro ao salvar configurações: ' + error.message;
    return res.redirect('/emails');
  }
});

// Reenviar e-mail
router.post('/reenviar/:id', async (req, res) => {
  try {
    await emailService.reenviarEmail(req.params.id);
    
    res.json({
      success: true,
      message: 'E-mail reenviado com sucesso!'
    });
  } catch (error) {
    console.error('Erro ao reenviar e-mail:', error);
    res.json({
      success: false,
      message: 'Erro ao reenviar e-mail: ' + error.message
    });
  }
});

// Editar template - DEVE VIR ANTES DE /:id
router.get('/template/:tipo', async (req, res) => {
  try {
    console.log('[Emails] GET /template/:tipo - Tipo:', req.params.tipo);
    const tipoNorm = (req.params.tipo || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (req.params.tipo !== tipoNorm) {
      return res.redirect(`/emails/template/${tipoNorm}${req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''}`);
    }
    
    let template;
    try {
      template = await emailService.getTemplate(req.params.tipo);
    } catch (error) {
      console.error('[Emails] Erro ao buscar template do banco:', error);
      // Não usar modelo padrão: mostrar campos vazios e aviso
      template = {
        tipo: req.params.tipo,
        assunto: '',
        corpo_html: '',
        corpo_texto: ''
      };
    }
    // Montar mensagens: priorizar querystring (funciona mesmo sem connect-flash)
    let messages = { success: [], error: [] };
    if (req.query.ok === '1') messages.success.push('Template salvo com sucesso!');
    if (req.query.err) messages.error.push(req.query.err);
    // Se houver connect-flash, mesclar
    try {
      if (typeof req.flash === 'function') {
        const f = req.flash();
        if (f && f.success) messages.success = messages.success.concat(f.success);
        if (f && f.error) messages.error = messages.error.concat(f.error);
      }
    } catch (_) {
      // ignorar
    }
    
    res.render('emails/template', {
      title: `Editar Template - ${req.params.tipo}`,
      tipo: tipoNorm,
      template: template || {},
      user: req.session.user || null,
      messages
    });
  } catch (error) {
    console.error('[Emails] Erro ao carregar template:', error);
    console.error('[Emails] Stack trace:', error.stack);
    res.render('error', {
      title: 'Erro',
      message: 'Erro ao carregar template: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.session.user || null
    });
  }
});

// Salvar template - DEVE VIR ANTES DE /:id
router.post('/template/:tipo', async (req, res) => {
  try {
    console.log('[Emails] POST /template/:tipo - Tipo:', req.params.tipo);
    const tipoNorm = (req.params.tipo || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    console.log('[Emails] Dados recebidos:', {
      assunto: req.body.assunto,
      corpo_html_length: req.body.corpo_html ? req.body.corpo_html.length : 0,
      corpo_texto_length: req.body.corpo_texto ? req.body.corpo_texto.length : 0
    });
    console.log('[Emails] URL completa:', req.url);
    console.log('[Emails] Path:', req.path);
    
    const { assunto, corpo_html, corpo_texto } = req.body;
    
    if (!assunto || !corpo_html) {
      console.log('[Emails] Validação falhou - campos obrigatórios ausentes');
      const err = encodeURIComponent('Assunto e corpo HTML são obrigatórios');
      return res.redirect(`/emails/template/${req.params.tipo}?err=${err}`);
    }
    
    console.log('[Emails] Chamando emailService.salvarTemplate...');
    await emailService.salvarTemplate(tipoNorm, {
      assunto,
      corpo_html,
      corpo_texto: corpo_texto || ''
    });
    
    console.log('[Emails] Template salvo com sucesso');
    return res.redirect(`/emails/template/${tipoNorm}?ok=1`);
  } catch (error) {
    console.error('[Emails] Erro ao salvar template:', error);
    console.error('[Emails] Stack trace:', error.stack);
    const err = encodeURIComponent('Erro ao salvar template: ' + error.message);
    const tipoNorm = (req.params.tipo || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return res.redirect(`/emails/template/${tipoNorm}?err=${err}`);
  }
});

// Limpar histórico de e-mails
router.post('/limpar-historico', async (req, res) => {
  try {
    await emailService.limparHistorico();
    
    res.json({
      success: true,
      message: 'Histórico limpo com sucesso!'
    });
  } catch (error) {
    console.error('Erro ao limpar histórico:', error);
    res.json({
      success: false,
      message: 'Erro ao limpar histórico: ' + error.message
    });
  }
});

// Excluir e-mail do histórico - DEVE VIR DEPOIS DE TODAS AS ROTAS ESPECÍFICAS
router.delete('/:id', async (req, res) => {
  try {
    await emailService.excluirEmail(req.params.id);
    
    res.json({
      success: true,
      message: 'E-mail excluído com sucesso!'
    });
  } catch (error) {
    console.error('Erro ao excluir e-mail:', error);
    res.json({
      success: false,
      message: 'Erro ao excluir e-mail: ' + error.message
    });
  }
});

module.exports = router;
