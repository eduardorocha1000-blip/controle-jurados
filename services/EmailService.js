const nodemailer = require('nodemailer');
const db = require('../config/database');

class EmailService {
  constructor() {
    this.transporter = null;
  }

  async getTransporter() {
    // Buscar configurações mais recentes do banco
    const config = await this.getConfig();
    
    // Verificar se temos configurações válidas
    if (!config.smtp_host || !config.smtp_user) {
      throw new Error('Configurações de e-mail não encontradas. Configure o SMTP primeiro.');
    }
    
    // Configurar transporter com as configurações
    const transporterConfig = {
      host: config.smtp_host,
      port: parseInt(config.smtp_port) || 587,
      secure: config.smtp_secure === true || config.smtp_secure === 'true',
      auth: {
        user: config.smtp_user,
        pass: config.smtp_pass
      },
      // Configurações de segurança modernas
      tls: {
        // Não aceitar certificados auto-assinados em produção
        rejectUnauthorized: process.env.NODE_ENV === 'production',
        // Usar versões modernas do TLS
        minVersion: 'TLSv1.2',
        // Permitir apenas ciphers seguros
        ciphers: 'HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA'
      }
    };

    // Para Gmail e outros serviços que usam STARTTLS na porta 587
    if (!transporterConfig.secure && transporterConfig.port === 587) {
      transporterConfig.requireTLS = true;
      // Gmail requer TLS explícito
      if (config.smtp_host.includes('gmail.com')) {
        transporterConfig.secure = false;
        transporterConfig.requireTLS = true;
        transporterConfig.tls = {
          rejectUnauthorized: false, // Gmail usa certificados válidos, mas pode ter problemas em alguns ambientes
          minVersion: 'TLSv1.2'
        };
      }
    }

    // Para porta 465 (SSL/TLS)
    if (transporterConfig.port === 465) {
      transporterConfig.secure = true;
      transporterConfig.tls = {
        rejectUnauthorized: false, // Para desenvolvimento, mas deve ser true em produção
        minVersion: 'TLSv1.2'
      };
    }

    // Se já temos um transporter, verificar se precisa recriar
    if (this.transporter) {
      // Verificar se as configurações mudaram comparando host e port
      const currentConfig = this.transporter.options;
      if (currentConfig.host !== transporterConfig.host || 
          currentConfig.port !== transporterConfig.port ||
          currentConfig.auth.user !== transporterConfig.auth.user) {
        // Configurações mudaram, recriar
        this.transporter = nodemailer.createTransport(transporterConfig);
      }
    } else {
      // Criar novo transporter
      this.transporter = nodemailer.createTransport(transporterConfig);
    }
    
    return this.transporter;
  }

  async enviarIntimacao(instituicaoId, dados) {
    try {
      const instituicao = await db('instituicoes')
        .where('id', instituicaoId)
        .first();

      if (!instituicao) {
        throw new Error('Instituição não encontrada');
      }

      // Verificar se a instituição tem email
      if (!instituicao.contato_email) {
        throw new Error(`Instituição "${instituicao.nome}" não possui e-mail cadastrado`);
      }

      // Buscar configurações para obter email_from
      const config = await this.getConfig();
      
      // Verificar se as configurações estão completas
      if (!config.smtp_host || !config.smtp_user) {
        throw new Error('Configurações de SMTP não estão completas. Configure o servidor SMTP primeiro.');
      }

      const transporter = await this.getTransporter();

      const template = await this.getTemplateIntimacao(instituicao, dados);
      
      console.log('[EmailService] Template final para envio:', {
        assunto: template.assunto,
        html_length: template.html ? template.html.length : 0,
        texto_length: template.texto ? template.texto.length : 0,
        assunto_preview: template.assunto ? template.assunto.substring(0, 100) : 'vazio',
        html_preview: template.html ? template.html.substring(0, 200) : 'vazio'
      });
      
      if (!template.assunto || !template.assunto.trim()) {
        throw new Error('Template de intimação sem assunto. Configure o template antes de enviar.');
      }
      if (!template.html || !template.html.trim()) {
        throw new Error('Template de intimação sem corpo HTML. Configure o template antes de enviar.');
      }
      
      const mailOptions = {
        from: config.email_from || config.smtp_user || process.env.SMTP_FROM,
        to: instituicao.contato_email,
        subject: template.assunto,
        html: template.html,
        text: template.texto
      };

      // Removido: não inserir mensagens adicionais para garantir que o e-mail seja exatamente o template

      console.log(`[EmailService] Enviando e-mail para ${instituicao.contato_email}...`);
      const resultado = await transporter.sendMail(mailOptions);
      console.log(`[EmailService] E-mail enviado com sucesso para ${instituicao.contato_email}`);

      // Registrar envio
      const savedHtmlIntimacao = (mailOptions.html || '') + '<!--TIPO:INTIMADO-->' + `<!--ANO:${dados.ano || ''}-->`;
      await db('notificacoes_email').insert({
        instituicao_id: instituicaoId,
        assunto: mailOptions.subject,
        corpo_html: savedHtmlIntimacao,
        corpo_texto: mailOptions.text,
        enviado_em: new Date().toISOString(),
        status: 'enviado',
        resposta_servidor: JSON.stringify(resultado)
      });

      return resultado;
    } catch (error) {
      console.error(`[EmailService] Erro ao enviar e-mail para instituição ${instituicaoId}:`, error);
      console.error(`[EmailService] Detalhes do erro:`, {
        message: error.message,
        code: error.code,
        response: error.response,
        responseCode: error.responseCode,
        command: error.command,
        stack: error.stack
      });
      
      // Criar mensagem de erro mais detalhada
      let errorMessage = error.message || error.toString();
      
      // Adicionar informações específicas do erro
      if (error.code === 'EAUTH') {
        errorMessage = 'Falha na autenticação. Verifique o usuário e senha SMTP.';
        if (error.response) {
          errorMessage += ` Detalhes: ${error.response}`;
        }
      } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
        errorMessage = 'Não foi possível conectar ao servidor SMTP. Verifique:';
        errorMessage += '\n- Servidor SMTP está correto';
        errorMessage += '\n- Porta está correta';
        errorMessage += '\n- Firewall não está bloqueando';
        if (error.command) {
          errorMessage += `\n- Comando: ${error.command}`;
        }
      } else if (error.code === 'ESOCKET') {
        errorMessage = 'Erro de conexão com o servidor SMTP.';
        if (error.command) {
          errorMessage += ` Comando: ${error.command}`;
        }
      } else if (error.response) {
        errorMessage += ` - Response: ${error.response}`;
      }
      
      if (error.responseCode) {
        errorMessage += ` - Código: ${error.responseCode}`;
      }
      if (error.code) {
        errorMessage += ` - Código de erro: ${error.code}`;
      }
      
      // Registrar erro
      try {
      await db('notificacoes_email').insert({
        instituicao_id: instituicaoId,
        assunto: 'Erro no envio',
        corpo_html: '',
        corpo_texto: '',
        enviado_em: new Date().toISOString(),
        status: 'erro',
          resposta_servidor: errorMessage
        });
      } catch (dbError) {
        console.error('Erro ao registrar erro no banco:', dbError);
      }

      throw new Error(errorMessage);
    }
  }

  async enviarConfirmacao(instituicaoId, dados) {
    try {
      const instituicao = await db('instituicoes')
        .where('id', instituicaoId)
        .first();

      if (!instituicao) {
        throw new Error('Instituição não encontrada');
      }

      if (!instituicao.contato_email) {
        throw new Error(`Instituição "${instituicao.nome}" não possui e-mail cadastrado`);
      }

      const config = await this.getConfig();
      if (!config.smtp_host || !config.smtp_user) {
        throw new Error('Configurações de SMTP não estão completas. Configure o servidor SMTP primeiro.');
      }

      const transporter = await this.getTransporter();

      const template = await this.getTemplatePorTipo('confirmacao', instituicao, dados);

      if (!template.assunto || !template.assunto.trim()) {
        throw new Error('Template de confirmação sem assunto. Configure o template antes de enviar.');
      }
      if (!template.html || !template.html.trim()) {
        throw new Error('Template de confirmação sem corpo HTML. Configure o template antes de enviar.');
      }

      const mailOptions = {
        from: config.email_from || config.smtp_user || process.env.SMTP_FROM,
        to: instituicao.contato_email,
        subject: template.assunto,
        html: template.html,
        text: template.texto
      };

      const resultado = await transporter.sendMail(mailOptions);

      const savedHtmlConfirmacao = (mailOptions.html || '') + '<!--TIPO:RECEBIDO-->' + `<!--ANO:${dados.ano || ''}-->`;
      await db('notificacoes_email').insert({
        instituicao_id: instituicaoId,
        assunto: mailOptions.subject,
        corpo_html: savedHtmlConfirmacao,
        corpo_texto: mailOptions.text,
        enviado_em: new Date().toISOString(),
        status: 'enviado',
        resposta_servidor: JSON.stringify(resultado)
      });

      // Atualizar status da indicação correspondente (ano + instituição) para "recebida"
      try {
        const anoNum = Number(dados.ano);
        // Detectar se coluna recebida_em existe
        let hasRecebidaEm = false;
        try {
          const pragma = await db.raw("PRAGMA table_info(indicacoes)");
          const cols = Array.isArray(pragma) ? pragma : (pragma[0] || []);
          const names = cols.map(c => c.name || c.Name);
          hasRecebidaEm = names.includes('recebida_em');
        } catch(_) {}

        const updateData = { status: 'recebida' };
        if (hasRecebidaEm) updateData.recebida_em = new Date();

        const anoFiltro = isNaN(anoNum) ? dados.ano : anoNum;
        const updated = await db('indicacoes')
          .where('instituicao_id', instituicaoId)
          .andWhere('ano_referencia', anoFiltro)
          .update(updateData);

        // Se não existir registro, criar um novo já como recebida
        if (!updated || updated === 0) {
          const insertData = {
            instituicao_id: instituicaoId,
            ano_referencia: anoFiltro,
            status: 'recebida'
          };
          if (hasRecebidaEm) insertData.recebida_em = new Date();
          try { insertData.created_at = new Date(); insertData.updated_at = new Date(); } catch(_) {}
          await db('indicacoes').insert(insertData);
        }
      } catch (updErr) {
        console.warn('[EmailService] Aviso: não foi possível atualizar indicação para recebida:', updErr.message);
      }

      return resultado;
    } catch (error) {
      console.error(`[EmailService] Erro ao enviar confirmação para instituição ${instituicaoId}:`, error);
      let errorMessage = error.message || error.toString();
      try {
        await db('notificacoes_email').insert({
          instituicao_id: instituicaoId,
          assunto: 'Erro no envio (confirmação)',
          corpo_html: '',
          corpo_texto: '',
          enviado_em: new Date().toISOString(),
          status: 'erro',
          resposta_servidor: errorMessage
        });
      } catch (dbError) {
        console.error('Erro ao registrar erro no banco:', dbError);
      }
      throw new Error(errorMessage);
    }
  }

  async getTemplatePorTipo(tipo, instituicao, dados) {
    try {
      console.log('[EmailService] getTemplatePorTipo iniciado - tipo:', tipo);
      const templateSalvo = await this.getTemplate(tipo);

      let assunto = templateSalvo.assunto;
      let html = templateSalvo.corpo_html || '';
      let texto = '';

      try {
        const Juiz = require('../models/Juiz');
        const juizTitular = await Juiz.buscarTitular();
        if (juizTitular && juizTitular.nome_completo) {
          dados.juiz_titular = juizTitular.nome_completo;
        }
      } catch (e) {
        console.warn('[EmailService] Não foi possível obter JUIZ_TITULAR:', e.message);
      }

      if (!templateSalvo || !templateSalvo.corpo_html || templateSalvo.corpo_html.trim() === '' || templateSalvo.corpo_html === '<p>Template padrão</p>') {
        throw new Error(`Template de ${tipo} não configurado. Configure o template (assunto e corpo HTML).`);
      } else {
        html = this.substituirPlaceholdersTemplate(html, instituicao, dados);
        assunto = this.substituirPlaceholdersTemplate(assunto, instituicao, dados);
        texto = html;
      }

      return { assunto, html, texto };
    } catch (error) {
      console.error('[EmailService] Erro ao buscar template por tipo:', error);
      throw error;
    }
  }

  async getTemplateIntimacao(instituicao, dados) {
    try {
      console.log('[EmailService] getTemplateIntimacao iniciado');
      console.log('[EmailService] Instituição:', {
        id: instituicao.id,
        nome: instituicao.nome,
        contato_nome: instituicao.contato_nome,
        contato_email: instituicao.contato_email
      });
      console.log('[EmailService] Dados:', dados);
      
      // Buscar template salvo do banco
      const templateSalvo = await this.getTemplate('intimacao');
      
      console.log('[EmailService] Template salvo retornado:', {
        assunto: templateSalvo.assunto,
        tem_corpo_html: !!templateSalvo.corpo_html,
        corpo_html_eh_padrao: templateSalvo.corpo_html === '<p>Template padrão</p>',
        corpo_html_preview: templateSalvo.corpo_html ? templateSalvo.corpo_html.substring(0, 100) : 'vazio'
      });
      
      let assunto = templateSalvo.assunto;
      let html = templateSalvo.corpo_html || '';
      let texto = '';
      
      // Buscar Juiz Titular para uso em placeholders
      try {
        const Juiz = require('../models/Juiz');
        const juizTitular = await Juiz.buscarTitular();
        if (juizTitular && juizTitular.nome_completo) {
          dados.juiz_titular = juizTitular.nome_completo;
          console.log('[EmailService] Juiz Titular encontrado:', dados.juiz_titular);
        } else {
          console.log('[EmailService] Nenhum juiz titular encontrado');
        }
      } catch (e) {
        console.warn('[EmailService] Não foi possível obter JUIZ_TITULAR:', e.message);
      }

      // Exigir template salvo válido (sem fallback)
      if (!templateSalvo || !templateSalvo.corpo_html || templateSalvo.corpo_html.trim() === '' || templateSalvo.corpo_html === '<p>Template padrão</p>') {
        throw new Error('Template de intimação não configurado. Configure o template (assunto e corpo HTML).');
      } else {
        console.log('[EmailService] Usando template salvo do banco de dados');
        console.log('[EmailService] Template salvo:', {
          assunto: templateSalvo.assunto,
          corpo_html_length: templateSalvo.corpo_html ? templateSalvo.corpo_html.length : 0
        });
        
        // Sempre usar corpo_html como HTML principal
        html = this.substituirPlaceholdersTemplate(html, instituicao, dados);
        
        // Assunto sempre com substituição de placeholders
        assunto = this.substituirPlaceholdersTemplate(assunto, instituicao, dados);
        
        // Texto para versão planilha (usar HTML como texto também)
        texto = html;
        
        console.log('[EmailService] Template processado:', {
          assunto: assunto.substring(0, 100),
          html_length: html.length,
          texto_length: texto.length,
          html_preview: html.substring(0, 200)
        });
      }
      
      return {
        assunto: assunto,
        html: html,
        texto: texto
      };
    } catch (error) {
      console.error('[EmailService] Erro ao buscar template:', error);
      console.error('[EmailService] Stack trace:', error.stack);
      // Não usar fallback; propagar o erro para evitar envio sem template
      throw error;
    }
  }

  substituirPlaceholdersTemplate(template, instituicao, dados) {
    if (!template) return '';
    
    let resultado = template;
    
    // Utilitário para normalizar acentos em comparações
    const normalize = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Montar dicionário de valores
    const valores = {
      NOME: instituicao.contato_nome || '',
      CONTATO: instituicao.contato_nome || '',
      RESPONSAVEL: instituicao.contato_nome || '',
      INSTITUICAO: instituicao.nome || '',
      INSTITUICAO_COM_ACENTO: instituicao.nome || '', // suporte a {INSTITUIÇÃO}
      ANO: dados.ano || '',
      // Priorizar a quantidade cadastrada na instituição; se ausente, usar a informada nos dados
      QUANTIDADE: (instituicao.quantidade != null && instituicao.quantidade !== undefined
        ? instituicao.quantidade
        : (dados.quantidade != null ? dados.quantidade : '')).toString(),
      PRAZO: dados.prazo_data || '30 dias',
      // Renderizar link com texto "upload" sem expor a URL no corpo
      LINK_UPLOAD: dados.link_upload
        ? `<a href="${dados.link_upload}" target="_blank" rel="noopener noreferrer">upload</a>`
        : 'upload',
      JUIZ_TITULAR: dados.juiz_titular || '',
      JUIZ: dados.juiz_titular || '',
      MENSAGEM: dados.mensagem ? dados.mensagem.replace(/\n/g, '<br>') : ''
    };
    
    // Lista de chaves aceitas (inclui sinônimos e variações com acento)
    const chaves = [
      'NOME', 'CONTATO', 'RESPONSAVEL',
      'INSTITUICAO', 'INSTITUICAO_COM_ACENTO', // {INSTITUICAO} e {INSTITUIÇÃO}
      'ANO', 'QUANTIDADE', 'PRAZO', 'LINK_UPLOAD',
      'JUIZ_TITULAR', 'JUIZ', 'MENSAGEM'
    ];
    
    // Substituição case-insensitive, aceitando chaves com espaços e acentos, e também {{VAR}}
    chaves.forEach((chave) => {
      const valor = valores[chave] || '';
      const base = chave === 'INSTITUICAO_COM_ACENTO' ? 'INSTITUI[ÇC][AÃ]O' : chave;
      // Aceitar { VAR }, {VAR}, {{VAR}}, {{ VAR }} – insensitive
      const pattern = new RegExp(`[\{]{1,2}\s*${base}\s*[\}]{1,2}`, 'gi');
      resultado = resultado.replace(pattern, valor);
    });
    
    // Extra: substituir quaisquer variantes em minúsculas/acentuadas não capturadas
    // Mapeamento adicional por normalização do texto todo
    // (executa somente onde sobrou marcador entre chaves)
    resultado = resultado.replace(/\{\s*([^\}]+)\s*\}/g, (m, p1) => {
      const keyNorm = normalize(String(p1)).toUpperCase().replace(/\s+/g, '_');
      if (keyNorm in valores) return valores[keyNorm];
      if (keyNorm === 'INSTITUICAO') return valores.INSTITUICAO;
      if (keyNorm === 'JUIZ_TITULAR' || keyNorm === 'JUIZ') return valores.JUIZ_TITULAR;
      return m; // manter se não reconhecido
    });
    
    return resultado;
  }

  // Função de modelo padrão removida: o sistema depende exclusivamente do template salvo

  async enviarLote(instituicoesIds, dados) {
    const resultados = {
      sucessos: 0,
      erros: 0,
      detalhes: []
    };

    for (const instituicaoId of instituicoesIds) {
      try {
        await this.enviarIntimacao(instituicaoId, dados);
        resultados.sucessos++;
        const instituicao = await db('instituicoes').where('id', instituicaoId).first();
        resultados.detalhes.push(`E-mail enviado com sucesso para ${instituicao?.nome || 'instituição ID ' + instituicaoId}`);
      } catch (error) {
        resultados.erros++;
        const instituicao = await db('instituicoes').where('id', instituicaoId).first();
        const nomeInstituicao = instituicao?.nome || `instituição ID ${instituicaoId}`;
        const erroMsg = error.message || error.toString();
        resultados.detalhes.push(`Erro ao enviar para ${nomeInstituicao}: ${erroMsg}`);
        console.error(`[EmailService] Erro no envio para ${nomeInstituicao}:`, erroMsg);
      }
    }

    return resultados;
  }

  async enviarLoteConfirmacao(instituicoesIds, dados) {
    const resultados = { sucessos: 0, erros: 0, detalhes: [] };
    for (const instituicaoId of instituicoesIds) {
      try {
        await this.enviarConfirmacao(instituicaoId, dados);
        resultados.sucessos++;
        const instituicao = await db('instituicoes').where('id', instituicaoId).first();
        const nome = instituicao?.nome || 'instituição ID ' + instituicaoId;
        resultados.detalhes.push(`E-mail de confirmação enviado para ${nome}`);
        resultados.detalhes.push(`Status de Indicações alterado para RECEBIDA (${nome}, ano ${dados.ano})`);
      } catch (error) {
        resultados.erros++;
        const instituicao = await db('instituicoes').where('id', instituicaoId).first();
        const nomeInstituicao = instituicao?.nome || `instituição ID ${instituicaoId}`;
        resultados.detalhes.push(`Erro ao enviar confirmação para ${nomeInstituicao}: ${error.message || error.toString()}`);
      }
    }
    return resultados;
  }

  async listarEnvios(filtros = {}) {
    let query = db('notificacoes_email')
      .leftJoin('instituicoes', 'notificacoes_email.instituicao_id', 'instituicoes.id')
      .select(
        'notificacoes_email.*',
        'instituicoes.nome as instituicao_nome'
      );

    if (filtros.status) {
      query = query.where('notificacoes_email.status', filtros.status);
    }

    if (filtros.instituicao_id) {
      query = query.where('notificacoes_email.instituicao_id', filtros.instituicao_id);
    }

    if (filtros.id) {
      query = query.where('notificacoes_email.id', filtros.id);
    }

    if (filtros.limit) {
      query = query.limit(filtros.limit);
    }

    const rows = await query.orderBy('notificacoes_email.enviado_em', 'desc');

    const formatDateTime = (val) => {
      if (!val) return '';
      try {
        let d;
        if (typeof val === 'number') {
          // epoch ms
          d = new Date(val);
        } else if (typeof val === 'string' && /^\d+$/.test(val)) {
          d = new Date(parseInt(val, 10));
        } else {
          d = new Date(val);
        }
        const pad = (n) => String(n).padStart(2, '0');
        const dd = pad(d.getDate());
        const mm = pad(d.getMonth() + 1);
        const yyyy = d.getFullYear();
        const hh = pad(d.getHours());
        const mi = pad(d.getMinutes());
        return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
      } catch {
        return String(val);
      }
    };

    return rows.map((r) => {
      const corpo = r.corpo_html || '';
      const tipoRaw = (r.tipo || '').toString().toLowerCase();
      const isReceb = corpo.includes('TIPO:CONFIRMACAO') ||
        tipoRaw === 'recebimento' || tipoRaw === 'recebido' ||
        tipoRaw === 'confirmação' || tipoRaw === 'confirmacao';
      return {
        ...r,
        destinatario: r.destinatario || r.instituicao_nome || '',
        tipo_exib: isReceb ? 'Recebido' : 'Intimado',
        enviado_em_fmt: formatDateTime(r.enviado_em || r.created_at)
      };
    });
  }

  async getStats() {
    try {
      // Verificar se as tabelas existem antes de fazer consultas
      const tablesExist = await this.checkTablesExist();
      
      if (!tablesExist) {
        return {
          totalEnviados: 0,
          enviadosHoje: 0,
          pendentes: 0,
          totalInstituicoes: 0
        };
      }

      const enviadosRows = await db('notificacoes_email')
        .where('status', 'enviado')
        .select('enviado_em');

      const totalEnviados = { count: enviadosRows.length };

      // Contar enviados hoje no horário local em JS
      const hoje = new Date();
      const y = hoje.getFullYear();
      const m = hoje.getMonth();
      const d = hoje.getDate();
      const inicio = new Date(y, m, d, 0, 0, 0, 0);
      const fim = new Date(y, m, d, 23, 59, 59, 999);
      const toDate = (val) => {
        if (!val) return null;
        if (typeof val === 'number') return new Date(val);
        if (typeof val === 'string' && /^\d{13}$/.test(val)) return new Date(parseInt(val));
        return new Date(val);
      };
      const enviadosHoje = { count: enviadosRows.filter((r) => {
        const dt = toDate(r.enviado_em);
        return dt && dt >= inicio && dt <= fim;
      }).length };

      // Pendentes conforme regra: por instituição x ano
      const historico = await db('notificacoes_email')
        .select('instituicao_id', 'assunto', 'corpo_html', 'enviado_em');
      const grupo = new Map();
      const extrairAno = (assunto, corpo) => {
        const m0 = (corpo || '').match(/<!--\s*ANO\s*:\s*(20\d{2})\s*-->/i);
        if (m0) return m0[1];
        const m1 = (assunto || '').match(/\b(20\d{2})\b/);
        if (m1) return m1[1];
        const m2 = (corpo || '').match(/\b(20\d{2})\b/);
        return m2 ? m2[1] : '';
      };
      historico.forEach((r) => {
        const corpo = r.corpo_html || '';
        const assunto = r.assunto || '';
        const ano = extrairAno(assunto, corpo);
        if (!r.instituicao_id || !ano) return;
        const key = `${r.instituicao_id}::${ano}`;
        const entry = grupo.get(key) || { hasIntimado: false, hasRecebido: false };
        const isReceb = /TIPO:\s*RECEBIDO/i.test(corpo) || /receb/i.test(assunto);
        if (isReceb) entry.hasRecebido = true; else entry.hasIntimado = true;
        grupo.set(key, entry);
      });
      const pendentesCount = Array.from(grupo.values()).filter(g => g.hasIntimado && !g.hasRecebido).length;

      // Verificar se a coluna 'status' existe na tabela instituicoes
      let totalInstituicoes = { count: 0 };
      try {
        totalInstituicoes = await db('instituicoes')
          .where('status', 'Ativo')
          .count('* as count')
          .first();
      } catch (statusError) {
        // Se não existir coluna status, contar todas as instituições
        totalInstituicoes = await db('instituicoes')
          .count('* as count')
          .first();
      }

      return {
        totalEnviados: totalEnviados.count || 0,
        enviadosHoje: enviadosHoje.count || 0,
        pendentes: pendentesCount,
        totalInstituicoes: totalInstituicoes.count || 0
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return {
        totalEnviados: 0,
        enviadosHoje: 0,
        pendentes: 0,
        totalInstituicoes: 0
      };
    }
  }

  async checkTablesExist() {
    try {
      // Verificar se as tabelas principais existem
      await db.raw("SELECT name FROM sqlite_master WHERE type='table' AND name='notificacoes_email'");
      await db.raw("SELECT name FROM sqlite_master WHERE type='table' AND name='instituicoes'");
      return true;
    } catch (error) {
      return false;
    }
  }

  async getConfig() {
    try {
      // Verificar se a tabela configuracoes existe
      const tableExists = await this.checkConfigTableExists();
      
      if (!tableExists) {
        return {
          smtp_host: process.env.SMTP_HOST || '',
          smtp_port: process.env.SMTP_PORT || 587,
          smtp_secure: process.env.SMTP_SECURE === 'true',
          smtp_user: process.env.SMTP_USER || '',
          smtp_pass: process.env.SMTP_PASS || '',
          email_from: process.env.SMTP_FROM || ''
        };
      }

      // Buscar configurações do banco ou usar padrões
      const config = await db('configuracoes')
        .where('chave', 'like', 'email_%')
        .select('chave', 'valor');

      const configObj = {};
      config.forEach(item => {
        const key = item.chave.replace('email_', '');
        configObj[key] = item.valor;
      });

      // Converter valores corretamente
      const smtp_port = configObj.smtp_port ? parseInt(configObj.smtp_port) : (process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587);
      const smtp_secure = configObj.smtp_secure === 'true' || configObj.smtp_secure === true || process.env.SMTP_SECURE === 'true';

      return {
        smtp_host: configObj.smtp_host || process.env.SMTP_HOST || '',
        smtp_port: smtp_port,
        smtp_secure: smtp_secure,
        smtp_user: configObj.smtp_user || process.env.SMTP_USER || '',
        smtp_pass: configObj.smtp_pass || process.env.SMTP_PASS || '',
        email_from: configObj.email_from || process.env.SMTP_FROM || ''
      };
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      return {
        smtp_host: process.env.SMTP_HOST || '',
        smtp_port: process.env.SMTP_PORT || 587,
        smtp_secure: process.env.SMTP_SECURE === 'true',
        smtp_user: process.env.SMTP_USER || '',
        smtp_pass: process.env.SMTP_PASS || '',
        email_from: process.env.SMTP_FROM || ''
      };
    }
  }

  async checkConfigTableExists() {
    try {
      await db.raw("SELECT name FROM sqlite_master WHERE type='table' AND name='configuracoes'");
      return true;
    } catch (error) {
      return false;
    }
  }

  async saveConfig(config) {
    try {
      // Salvar configurações no banco
      for (const [key, value] of Object.entries(config)) {
        await db('configuracoes')
          .where('chave', `email_${key}`)
          .del();
        
        await db('configuracoes').insert({
          chave: `email_${key}`,
          valor: value.toString(),
          atualizado_em: new Date()
        });
      }

      // Recriar transporter com novas configurações
      this.transporter = null; // Forçar recriação
      await this.getTransporter();

      return true;
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      throw error;
    }
  }

  async reenviarEmail(emailId) {
    try {
      const email = await db('notificacoes_email')
        .where('id', emailId)
        .first();

      if (!email) {
        throw new Error('E-mail não encontrado');
      }

      const instituicao = await db('instituicoes')
        .where('id', email.instituicao_id)
        .first();

      if (!instituicao) {
        throw new Error('Instituição não encontrada');
      }

      // Buscar configurações para obter email_from
      const config = await this.getConfig();
      const transporter = await this.getTransporter();

      const mailOptions = {
        from: config.email_from || config.smtp_user || process.env.SMTP_FROM,
        to: instituicao.contato_email,
        subject: email.assunto,
        html: email.corpo_html,
        text: email.corpo_texto
      };

      const resultado = await transporter.sendMail(mailOptions);

      // Atualizar status
      await db('notificacoes_email')
        .where('id', emailId)
        .update({
          status: 'enviado',
          enviado_em: new Date().toISOString(),
          resposta_servidor: JSON.stringify(resultado)
        });

      return resultado;
    } catch (error) {
      console.error('Erro ao reenviar e-mail:', error);
      
      // Atualizar status para erro
      await db('notificacoes_email')
        .where('id', emailId)
        .update({
          status: 'erro',
          resposta_servidor: error.message || error.toString()
        });

      throw error;
    }
  }

  async excluirEmail(emailId) {
    try {
      await db('notificacoes_email')
        .where('id', emailId)
        .del();
      
      return true;
    } catch (error) {
      console.error('Erro ao excluir e-mail:', error);
      throw error;
    }
  }

  async limparHistorico() {
    try {
      // Apagar TODO o histórico de e-mails
      await db('notificacoes_email').del();
      
      return true;
    } catch (error) {
      console.error('Erro ao limpar histórico:', error);
      throw error;
    }
  }

  async getTemplate(tipo) {
    try {
      console.log('[EmailService] getTemplate chamado - Tipo:', tipo);
      const tipoNorm = (tipo || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      
      // Verificar se a tabela existe
      const tableExists = await this.checkTemplateTableExists();
      console.log('[EmailService] Tabela existe?', tableExists);
      
      if (!tableExists) {
        throw new Error('Tabela de templates_email não existe. Crie e configure o template antes do envio.');
      }

      // Detectar dinamicamente coluna de ordenação (updated_at vs atualizado_em vs id)
      let orderField = 'id';
      try {
        const pragma = await db.raw("PRAGMA table_info(templates_email)");
        const columns = Array.isArray(pragma) ? pragma : (pragma[0] || []);
        const names = columns.map(col => col.name || col.Name);
        if (names.includes('updated_at')) {
          orderField = 'updated_at';
        } else if (names.includes('atualizado_em')) {
          orderField = 'atualizado_em';
        }
        console.log('[EmailService] Campo de ordenação para templates_email:', orderField);
      } catch (e) {
        console.warn('[EmailService] Não foi possível detectar colunas; usando ordenação por id. Motivo:', e.message);
      }

      // Buscar todos e filtrar por normalização acento-insensível no Node
      let query = db('templates_email');
      query = query.orderBy(orderField, 'desc');
      if (orderField !== 'id') query = query.orderBy('id', 'desc');
      const registros = await query;
      const normaliza = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const template = registros.find(r => normaliza(r.tipo) === tipoNorm) || null;
      
      console.log('[EmailService] Template encontrado?', !!template);
      if (template) {
        console.log('[EmailService] Template carregado:', {
          id: template.id,
          tipo: template.tipo,
          assunto: template.assunto ? template.assunto.substring(0, 50) : 'vazio',
          corpo_html_length: template.corpo_html ? template.corpo_html.length : 0,
          corpo_texto_length: template.corpo_texto ? template.corpo_texto.length : 0
        });
      }

      if (!template) {
        throw new Error(`Template não encontrado para o tipo "${tipo}". Configure o template antes do envio.`);
      }

      return template;
    } catch (error) {
      console.error('[EmailService] Erro ao buscar template:', error);
      console.error('[EmailService] Stack trace:', error.stack);
      // Não retornar padrão em caso de erro, propagar
      throw error;
    }
  }

  async checkTemplateTableExists() {
    try {
      // Tentar uma query simples na tabela para verificar se existe
      await db.raw("SELECT 1 FROM templates_email LIMIT 1");
      return true;
    } catch (error) {
      // Se der erro, a tabela não existe
      if (error.message && error.message.includes('no such table')) {
        return false;
      }
      // Se for outro erro, também retornar false para ser seguro
      console.error('[EmailService] Erro ao verificar se tabela existe:', error.message);
      return false;
    }
  }

  async salvarTemplate(tipo, dados) {
    try {
      console.log('[EmailService] salvarTemplate iniciado - Tipo:', tipo);
      const tipoNorm = (tipo || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      console.log('[EmailService] Dados recebidos:', {
        assunto: dados.assunto ? dados.assunto.substring(0, 50) : 'vazio',
        corpo_html_length: dados.corpo_html ? dados.corpo_html.length : 0,
        corpo_texto_length: dados.corpo_texto ? dados.corpo_texto.length : 0
      });

      // Verificar se a tabela existe
      const tableExists = await this.checkTemplateTableExists();
      console.log('[EmailService] Tabela existe?', tableExists);
      
      if (!tableExists) {
        console.log('[EmailService] Criando tabela templates_email...');
        try {
          await db.schema.createTable('templates_email', function(table) {
            table.increments('id').primary();
            table.string('tipo', 50).notNullable().unique();
            table.string('assunto', 255).notNullable();
            table.text('corpo_html').notNullable();
            table.text('corpo_texto');
            table.timestamp('created_at').defaultTo(db.fn.now());
            table.timestamp('updated_at').defaultTo(db.fn.now());
          });
          console.log('[EmailService] Tabela templates_email criada com sucesso');
        } catch (createError) {
          console.error('[EmailService] Erro ao criar tabela:', createError);
          // Se o erro for que a tabela já existe, continuar
          if (!createError.message.includes('already exists') && !createError.message.includes('duplicate')) {
            throw createError;
          }
          console.log('[EmailService] Tabela já existe, continuando...');
        }
      }

      // Verificar estrutura da tabela para saber se tem created_at/updated_at
      let hasTimestampColumns = false;
      try {
        const result = await db.raw("PRAGMA table_info(templates_email)");
        // SQLite retorna as colunas em um formato específico
        const columns = Array.isArray(result) ? result : (result[0] || []);
        const columnNames = columns.map(col => col.name || col.Name);
        hasTimestampColumns = columnNames.includes('created_at') && columnNames.includes('updated_at');
        console.log('[EmailService] Tabela tem colunas de timestamp?', hasTimestampColumns);
        console.log('[EmailService] Colunas encontradas:', columnNames);
      } catch (error) {
        console.log('[EmailService] Não foi possível verificar colunas, assumindo que não tem timestamps');
        console.log('[EmailService] Erro ao verificar colunas:', error.message);
      }

      const insertData = {
        // Salvar o tipo solicitado (normalizado) para funcionar também com 'confirmacao'
        tipo: tipoNorm,
        assunto: dados.assunto,
        corpo_html: dados.corpo_html,
        corpo_texto: dados.corpo_texto || ''
      };

      // Transação: procurar por tipo normalizado; se existir, atualizar por id; senão, inserir
      await db.transaction(async (trx) => {
        // Detectar se existe registro do tipo (acento-insensível)
        const existentes = await trx('templates_email').select('*');
        const normaliza = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const existente = existentes.find(t => normaliza(t.tipo) === tipoNorm) || null;

        if (existente) {
          const updateData = {
            assunto: insertData.assunto,
            corpo_html: insertData.corpo_html,
            corpo_texto: insertData.corpo_texto
          };
          if (hasTimestampColumns) updateData.updated_at = trx.fn.now();
          else {
            // tentar atualizar atualizado_em se existir
            try {
              const pragma2 = await trx.raw("PRAGMA table_info(templates_email)");
              const cols2 = Array.isArray(pragma2) ? pragma2 : (pragma2[0] || []);
              const names2 = cols2.map(c => c.name || c.Name);
              if (names2.includes('atualizado_em')) updateData.atualizado_em = trx.fn.now();
            } catch (_) {}
          }
          await trx('templates_email').where('id', existente.id).update(updateData);
          console.log('[EmailService] Template atualizado (id):', existente.id);
        } else {
          const toInsert = { ...insertData };
          if (hasTimestampColumns) {
            toInsert.created_at = trx.fn.now();
            toInsert.updated_at = trx.fn.now();
          }
          const ids = await trx('templates_email').insert(toInsert);
          console.log('[EmailService] Template inserido (ids):', ids);
        }
      });

      // Aguardar um pouco para garantir que o commit foi feito
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verificar se foi salvo corretamente
      // Recarregar e verificar por normalização
      const todosDepois = await db('templates_email');
      const normaliza = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const verificado = todosDepois.find(t => normaliza(t.tipo) === tipoNorm) || null;
      
      if (verificado) {
        console.log('[EmailService] ✅ Template verificado após salvamento:', {
          id: verificado.id,
          tipo: verificado.tipo,
          assunto: verificado.assunto ? verificado.assunto.substring(0, 50) : 'vazio',
          corpo_html_length: verificado.corpo_html ? verificado.corpo_html.length : 0,
          corpo_texto_length: verificado.corpo_texto ? verificado.corpo_texto.length : 0
        });
        
        // Comparar se os dados foram salvos corretamente
        if (verificado.assunto !== dados.assunto) {
          console.error('[EmailService] ❌ ERRO: Assunto não corresponde!');
          console.error('[EmailService] Esperado:', dados.assunto.substring(0, 50));
          console.error('[EmailService] Salvo:', verificado.assunto ? verificado.assunto.substring(0, 50) : 'vazio');
        }
        
        if (verificado.corpo_html !== dados.corpo_html) {
          console.error('[EmailService] ❌ ERRO: Corpo HTML não corresponde!');
          console.error('[EmailService] Esperado length:', dados.corpo_html ? dados.corpo_html.length : 0);
          console.error('[EmailService] Salvo length:', verificado.corpo_html ? verificado.corpo_html.length : 0);
        }
      } else {
        console.error('[EmailService] ❌ ERRO: Template não foi salvo! Não foi encontrado após inserção/update.');
        throw new Error('Template não foi salvo corretamente');
      }

      return true;
    } catch (error) {
      console.error('[EmailService] ❌ Erro ao salvar template:', error);
      console.error('[EmailService] Mensagem de erro:', error.message);
      console.error('[EmailService] Stack trace:', error.stack);
      throw error;
    }
  }
}

module.exports = EmailService;
