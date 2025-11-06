const express = require('express');
const Jurado = require('../models/Jurado');
const router = express.Router();

// Middleware de autenticação
function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect('/login');
}

// API - Buscar jurado por CPF (deve vir antes da rota principal)
router.get('/api/jurado-por-cpf/:cpf', requireAuth, async (req, res) => {
  try {
    const cpf = req.params.cpf.replace(/[^\d]/g, ''); // Remove formatação
    
    if (!cpf || cpf.length !== 11) {
      return res.json({ success: false, message: 'CPF inválido' });
    }

    // Formatar CPF para busca (com pontos e traço)
    const cpfFormatado = cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    
    const jurado = await Jurado.buscarPorCpf(cpfFormatado);
    
    if (jurado) {
      return res.json({ success: true, jurado: { id: jurado.id, nome: jurado.nome_completo, cpf: jurado.cpf } });
    } else {
      return res.json({ success: false, message: 'Jurado não encontrado' });
    }
  } catch (error) {
    console.error('Erro ao buscar jurado por CPF:', error);
    return res.json({ success: false, message: 'Erro ao buscar jurado' });
  }
});

// GET - Exibir formulário
router.get('/', requireAuth, async (req, res) => {
  try {
    res.render('ultimo-conselho/index', {
      title: 'Último Conselho',
      user: req.session.user,
      messages: req.flash()
    });
  } catch (error) {
    console.error('Erro ao carregar página de Último Conselho:', error);
    req.flash('error', 'Erro ao carregar página');
    res.redirect('/dashboard');
  }
});

// POST - Salvar dados do último conselho
router.post('/salvar', requireAuth, async (req, res) => {
  try {
    const { data_conselho, cpfs } = req.body;
    
    if (!data_conselho) {
      req.flash('error', 'Data do conselho é obrigatória');
      return res.redirect('/ultimo-conselho');
    }

    // Validar formato da data (YYYY-MM-DD)
    const dataRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dataRegex.test(data_conselho)) {
      req.flash('error', 'Formato de data inválido. Use o formato YYYY-MM-DD');
      return res.redirect('/ultimo-conselho');
    }

    // Validar se a data é válida (sem conversão de timezone)
    const [ano, mes, dia] = data_conselho.split('-').map(Number);
    const dataTeste = new Date(ano, mes - 1, dia);
    if (dataTeste.getFullYear() !== ano || dataTeste.getMonth() !== mes - 1 || dataTeste.getDate() !== dia) {
      req.flash('error', 'Data inválida');
      return res.redirect('/ultimo-conselho');
    }

    // Processar CPFs (pode ser um array ou string)
    const cpfArray = Array.isArray(cpfs) ? cpfs : (cpfs ? [cpfs] : []);
    const cpfsValidos = cpfArray.filter(cpf => cpf && cpf.trim() !== '');
    
    if (cpfsValidos.length === 0) {
      req.flash('error', 'Informe pelo menos um CPF');
      return res.redirect('/ultimo-conselho');
    }

    if (cpfsValidos.length > 7) {
      req.flash('error', 'Máximo de 7 CPFs permitidos');
      return res.redirect('/ultimo-conselho');
    }

    let sucessos = 0;
    let erros = 0;
    const errosDetalhes = [];

    // Atualizar cada jurado
    // Usar a data diretamente como string no formato YYYY-MM-DD para evitar problemas de timezone
    for (const cpf of cpfsValidos) {
      try {
        const cpfLimpo = cpf.replace(/[^\d]/g, '');
        const cpfFormatado = cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        
        const jurado = await Jurado.buscarPorCpf(cpfFormatado);
        
        if (jurado) {
          // Passar a data como string no formato YYYY-MM-DD para evitar conversão de timezone
          await Jurado.atualizar(jurado.id, { ultimo_conselho: data_conselho });
          sucessos++;
        } else {
          erros++;
          errosDetalhes.push(`CPF ${cpfFormatado} não encontrado`);
        }
      } catch (error) {
        erros++;
        errosDetalhes.push(`Erro ao atualizar CPF ${cpf}: ${error.message}`);
      }
    }

    if (sucessos > 0) {
      req.flash('success', `Data do último conselho atualizada para ${sucessos} jurado(s)`);
    }
    
    if (erros > 0) {
      req.flash('error', `${erros} erro(s): ${errosDetalhes.join(', ')}`);
    }

    res.redirect('/ultimo-conselho');
  } catch (error) {
    console.error('Erro ao salvar último conselho:', error);
    req.flash('error', 'Erro ao salvar dados do último conselho');
    res.redirect('/ultimo-conselho');
  }
});

module.exports = router;

