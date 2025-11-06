const express = require('express');
const db = require('../config/database');
const Jurado = require('../models/Jurado');
const Instituicao = require('../models/Instituicao');
const Sorteio = require('../models/Sorteio');
const Edital = require('../models/Edital');
const Indicacao = require('../models/Indicacao');
const Cedula = require('../models/Cedula');
const EmailService = require('../services/EmailService');
const router = express.Router();

// Página principal de relatórios
router.get('/', async (req, res) => {
  try {
    // Buscar estatísticas
    const stats = await getStats();
    
    // Calcular estatísticas gerais para os painéis
    const totalJurados = await db('jurados').count('* as count').first();
    const totalInstituicoes = await db('instituicoes').count('* as count').first();
    const totalSorteios = await db('sorteios').count('* as count').first();
    const totalEditais = await db('editais').count('* as count').first();
    
    res.render('relatorios/index', {
      title: 'Relatórios - Controle de Jurados',
      stats,
      filtros: req.query,
      totalJurados: totalJurados.count,
      totalInstituicoes: totalInstituicoes.count,
      totalSorteios: totalSorteios.count,
      totalEditais: totalEditais.count
    });
  } catch (error) {
    console.error('Erro ao carregar página de relatórios:', error);
    res.render('error', {
      title: 'Erro',
      message: 'Erro ao carregar página de relatórios',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Gerar relatório
router.get('/gerar/:tipo/:formato', async (req, res) => {
  try {
    const { tipo, formato } = req.params;
    const filtros = req.query;
    
    let dados;
    let nomeArquivo;
    
    switch (tipo) {
      case 'jurados':
        dados = await gerarRelatorioJurados(filtros);
        nomeArquivo = `relatorio_jurados_${new Date().toISOString().split('T')[0]}`;
        break;
      case 'sorteios':
        dados = await gerarRelatorioSorteios(filtros);
        nomeArquivo = `relatorio_sorteios_${new Date().toISOString().split('T')[0]}`;
        break;
      case 'instituicoes':
        dados = await gerarRelatorioInstituicoes(filtros);
        nomeArquivo = `relatorio_instituicoes_${new Date().toISOString().split('T')[0]}`;
        break;
      case 'indicacoes':
        dados = await gerarRelatorioIndicacoes(filtros);
        nomeArquivo = `relatorio_indicacoes_${new Date().toISOString().split('T')[0]}`;
        break;
      case 'cedulas':
        dados = await gerarRelatorioCedulas(filtros);
        nomeArquivo = `relatorio_cedulas_${new Date().toISOString().split('T')[0]}`;
        break;
      case 'editais':
        dados = await gerarRelatorioEditais(filtros);
        nomeArquivo = `relatorio_editais_${new Date().toISOString().split('T')[0]}`;
        break;
      case 'emails':
        dados = await gerarRelatorioEmails(filtros);
        nomeArquivo = `relatorio_emails_${new Date().toISOString().split('T')[0]}`;
        break;
      case 'ultimo-conselho':
        dados = await gerarRelatorioUltimoConselho(filtros);
        nomeArquivo = `relatorio_ultimo_conselho_${new Date().toISOString().split('T')[0]}`;
        break;
      case 'estatisticas':
        dados = await gerarRelatorioEstatisticas(filtros);
        nomeArquivo = `relatorio_estatisticas_${new Date().toISOString().split('T')[0]}`;
        break;
      default:
        return res.status(400).json({ error: 'Tipo de relatório inválido' });
    }
    
    if (formato === 'pdf') {
      // Gerar HTML para impressão/PDF
      try {
        // Garantir que dados seja um array válido
        if (!dados) {
          dados = [];
        }
        if (!Array.isArray(dados)) {
          dados = Array.isArray(Object.values(dados)) ? Object.values(dados).flat() : [];
        }
        
        const html = gerarHTML(dados);
        const tipoFormatado = tipo.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        const htmlCompleto = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <title>${nomeArquivo}</title>
    <style>
        @media print {
            body { margin: 0; }
            button { display: none; }
            @page { margin: 1cm; }
        }
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            color: #333;
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
        }
        p {
            color: #666;
            margin-bottom: 20px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-size: 12px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
            font-weight: bold;
            position: sticky;
            top: 0;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        button {
            padding: 10px 20px;
            background-color: #e3f2fd !important;
            color: #1976d2 !important;
            border: none !important;
            border-radius: 4px;
            cursor: pointer;
            font-size: 18px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
            min-width: 38px;
        }
        button:hover {
            background-color: #bbdefb !important;
            color: #0d47a1 !important;
        }
        .btn-voltar {
            background-color: #f5f5f5 !important;
            color: #616161 !important;
        }
        .btn-voltar:hover {
            background-color: #eeeeee !important;
            color: #424242 !important;
        }
    </style>
</head>
<body>
    <h1>Relatório: ${tipoFormatado}</h1>
    <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
    <div style="display: flex; gap: 10px; margin-bottom: 20px;">
        <button onclick="window.print()" class="btn btn-print" title="Imprimir / Salvar como PDF">🖨️</button>
        <button onclick="window.location.href='/relatorios'" class="btn btn-back" title="Voltar">⬅️</button>
    </div>
    <table>
        ${html}
    </table>
</body>
</html>`;
        res.send(htmlCompleto);
      } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        res.status(500).json({ error: 'Erro ao gerar PDF', message: error.message });
      }
    } else if (formato === 'csv') {
      const csv = gerarCSV(dados);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}.csv"`);
      res.send(csv);
    } else if (formato === 'excel') {
      // Excel também usa CSV com encoding correto
      const csv = gerarCSV(dados);
      res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}.xls"`);
      res.send('\ufeff' + csv); // BOM para Excel reconhecer UTF-8
    } else {
      return res.status(400).json({ error: 'Formato inválido' });
    }
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
});

// Relatório personalizado
router.get('/personalizado/:tipo/:formato', async (req, res) => {
  try {
    const { tipo, formato } = req.params;
    const filtros = req.query;
    
    let dados;
    let nomeArquivo;
    
    switch (tipo) {
      case 'consolidado':
        dados = await gerarRelatorioConsolidado(filtros);
        nomeArquivo = `relatorio_consolidado_${new Date().toISOString().split('T')[0]}`;
        break;
      case 'periodo':
        dados = await gerarRelatorioPeriodo(filtros);
        nomeArquivo = `relatorio_periodo_${new Date().toISOString().split('T')[0]}`;
        break;
      case 'instituicao':
        dados = await gerarRelatorioPorInstituicao(filtros);
        nomeArquivo = `relatorio_instituicao_${new Date().toISOString().split('T')[0]}`;
        break;
      case 'juiz':
        dados = await gerarRelatorioPorJuiz(filtros);
        nomeArquivo = `relatorio_juiz_${new Date().toISOString().split('T')[0]}`;
        break;
      default:
        return res.status(400).json({ error: 'Tipo de relatório inválido' });
    }
    
    if (formato === 'pdf') {
      // Gerar HTML para impressão/PDF
      try {
        // Garantir que dados seja um array válido
        if (!dados) {
          dados = [];
        }
        if (!Array.isArray(dados)) {
          dados = Array.isArray(Object.values(dados)) ? Object.values(dados).flat() : [];
        }
        
        const html = gerarHTML(dados);
        const tipoFormatado = tipo.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        const htmlCompleto = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <title>${nomeArquivo}</title>
    <style>
        @media print {
            body { margin: 0; }
            button { display: none; }
            @page { margin: 1cm; }
        }
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            color: #333;
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
        }
        p {
            color: #666;
            margin-bottom: 20px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-size: 12px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
            font-weight: bold;
            position: sticky;
            top: 0;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        button {
            padding: 10px 20px;
            background-color: #e3f2fd !important;
            color: #1976d2 !important;
            border: none !important;
            border-radius: 4px;
            cursor: pointer;
            font-size: 18px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
            min-width: 38px;
        }
        button:hover {
            background-color: #bbdefb !important;
            color: #0d47a1 !important;
        }
        .btn-voltar {
            background-color: #f5f5f5 !important;
            color: #616161 !important;
        }
        .btn-voltar:hover {
            background-color: #eeeeee !important;
            color: #424242 !important;
        }
    </style>
</head>
<body>
    <h1>Relatório: ${tipoFormatado}</h1>
    <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
    <div style="display: flex; gap: 10px; margin-bottom: 20px;">
        <button onclick="window.print()" class="btn btn-print" title="Imprimir / Salvar como PDF">🖨️</button>
        <button onclick="window.location.href='/relatorios'" class="btn btn-back" title="Voltar">⬅️</button>
    </div>
    <table>
        ${html}
    </table>
</body>
</html>`;
        res.send(htmlCompleto);
      } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        res.status(500).json({ error: 'Erro ao gerar PDF', message: error.message });
      }
    } else if (formato === 'csv') {
      const csv = gerarCSV(dados);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}.csv"`);
      res.send('\ufeff' + csv); // BOM para Excel reconhecer UTF-8
    } else if (formato === 'excel') {
      // Excel também usa CSV com encoding correto
      const csv = gerarCSV(dados);
      res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}.xls"`);
      res.send('\ufeff' + csv); // BOM para Excel reconhecer UTF-8
    } else {
      res.status(400).json({ error: 'Formato inválido', message: 'Formato não implementado ainda' });
    }
  } catch (error) {
    console.error('Erro ao gerar relatório personalizado:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório personalizado' });
  }
});

// Funções auxiliares
async function getStats() {
  try {
    const totalJurados = await Jurado.contar();
    const totalInstituicoes = await Instituicao.contar();
    const totalSorteios = await Sorteio.contar();
    const totalCedulas = await Cedula.contar();
    
    return {
      totalJurados,
      totalInstituicoes,
      totalSorteios,
      totalCedulas
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return {
      totalJurados: 0,
      totalInstituicoes: 0,
      totalSorteios: 0,
      totalCedulas: 0
    };
  }
}

async function gerarRelatorioJurados(filtros) {
  try {
    let query = db('jurados')
      .leftJoin('instituicoes', 'jurados.instituicao_id', 'instituicoes.id')
      .select(
        'jurados.id',
        'jurados.nome_completo',
        'jurados.cpf',
        'jurados.rg',
        'jurados.sexo',
        'jurados.data_nascimento',
        'jurados.endereco',
        'jurados.numero',
        'jurados.complemento',
        'jurados.bairro',
        'jurados.cidade',
        'jurados.uf',
        'jurados.cep',
        'jurados.email',
        'jurados.telefone',
        'jurados.profissao',
        'jurados.status',
        'jurados.motivo',
        'jurados.suspenso_ate',
        'jurados.ultimo_conselho',
        'jurados.created_at',
        'instituicoes.nome as instituicao_nome'
      );
    
    if (filtros.ano) {
      query = query.whereRaw("strftime('%Y', jurados.created_at) = ?", [filtros.ano.toString()]);
    }
    
    if (filtros.status) {
      query = query.where('jurados.status', filtros.status);
    }
    
    if (filtros.sexo) {
      query = query.where('jurados.sexo', filtros.sexo);
    }
    
    if (filtros.data_inicio) {
      query = query.where('jurados.created_at', '>=', filtros.data_inicio);
    }
    
    if (filtros.data_fim) {
      query = query.where('jurados.created_at', '<=', filtros.data_fim + ' 23:59:59');
    }
    
    const jurados = await query.orderBy('jurados.nome_completo');
    
    // Formatar dados para exibição
    return jurados.map(j => ({
      'ID': j.id,
      'Nome Completo': j.nome_completo || '',
      'CPF': j.cpf || '',
      'RG': j.rg || '',
      'Sexo': j.sexo || '',
      'Data de Nascimento': j.data_nascimento ? new Date(j.data_nascimento).toLocaleDateString('pt-BR') : '',
      'Endereço': j.endereco || '',
      'Número': j.numero || '',
      'Complemento': j.complemento || '',
      'Bairro': j.bairro || '',
      'Cidade': j.cidade || '',
      'UF': j.uf || '',
      'CEP': j.cep || '',
      'E-mail': j.email || '',
      'Telefone': j.telefone || '',
      'Profissão': j.profissao || '',
      'Status': j.status || '',
      'Motivo': j.motivo || '',
      'Suspenso Até': j.suspenso_ate ? new Date(j.suspenso_ate).toLocaleDateString('pt-BR') : '',
      'Último Conselho': j.ultimo_conselho ? (() => {
        const partes = j.ultimo_conselho.split('-');
        return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : j.ultimo_conselho;
      })() : '',
      'Instituição': j.instituicao_nome || '',
      'Data de Cadastro': j.created_at ? new Date(j.created_at).toLocaleDateString('pt-BR') : ''
    }));
  } catch (error) {
    console.error('Erro ao gerar relatório de jurados:', error);
    return [];
  }
}

async function gerarRelatorioSorteios(filtros) {
  try {
    let query = db('sorteios')
      .leftJoin('juizes', 'sorteios.juiz_responsavel_id', 'juizes.id')
      .select(
        'sorteios.*',
        'juizes.nome_completo as juiz_nome'
      );
    
    if (filtros.ano) {
      query = query.where('sorteios.ano_referencia', filtros.ano);
    }
    
    if (filtros.data_inicio) {
      query = query.where('sorteios.data_juri', '>=', filtros.data_inicio);
    }
    
    if (filtros.data_fim) {
      query = query.where('sorteios.data_juri', '<=', filtros.data_fim);
    }
    
    const sorteios = await query.orderBy('sorteios.data_juri', 'desc');
    
    // Buscar contagem de jurados por sorteio
    const sorteiosComDetalhes = await Promise.all(sorteios.map(async (sorteio) => {
      const juradosCount = await db('sorteio_jurados')
        .where('sorteio_id', sorteio.id)
        .count('* as total')
        .first();
      
      return {
        'ID': sorteio.id,
        'Número do Processo': sorteio.numero_processo || '',
        'Ano de Referência': sorteio.ano_referencia || '',
        'Data do Júri': sorteio.data_juri ? new Date(sorteio.data_juri).toLocaleDateString('pt-BR') : '',
        'Hora do Júri': sorteio.hora_juri || '',
        'Local do Sorteio': sorteio.local_sorteio || '',
        'Juiz Responsável': sorteio.juiz_nome || '',
        'Status': sorteio.status || '',
        'Total de Jurados': juradosCount ? parseInt(juradosCount.total) : 0,
        'Data de Criação': sorteio.created_at ? new Date(sorteio.created_at).toLocaleDateString('pt-BR') : '',
        'Observações': sorteio.observacoes || ''
      };
    }));
    
    return sorteiosComDetalhes;
  } catch (error) {
    console.error('Erro ao gerar relatório de sorteios:', error);
    return [];
  }
}

async function gerarRelatorioInstituicoes(filtros) {
  try {
    let query = db('instituicoes');
    
    if (filtros.ativo) {
      query = query.where('ativo', filtros.ativo);
    }
    
    if (filtros.tipo) {
      query = query.where('tipo', filtros.tipo);
    }
    
    const instituicoes = await query.orderBy('nome');
    
    // Adicionar contagem de jurados por instituição
    const instituicoesComDetalhes = await Promise.all(instituicoes.map(async (inst) => {
      const juradosCount = await db('jurados')
        .where('instituicao_id', inst.id)
        .count('* as total')
        .first();
      
      const indicacoesCount = await db('indicacoes')
        .where('instituicao_id', inst.id)
        .count('* as total')
        .first();
      
      return {
        'ID': inst.id,
        'Nome': inst.nome || '',
        'CNPJ': inst.cnpj || '',
        'Tipo': inst.tipo || '',
        'Ativo': inst.ativo || '',
        'Contato Nome': inst.contato_nome || '',
        'Contato E-mail': inst.contato_email || '',
        'Contato Telefone': inst.contato_telefone || '',
        'Endereço': inst.endereco || '',
        'Cidade': inst.cidade || '',
        'UF': inst.uf || '',
        'CEP': inst.cep || '',
        'Quantidade': inst.quantidade || 0,
        'Total de Jurados': juradosCount ? parseInt(juradosCount.total) : 0,
        'Total de Indicações': indicacoesCount ? parseInt(indicacoesCount.total) : 0,
        'Data de Cadastro': inst.created_at ? new Date(inst.created_at).toLocaleDateString('pt-BR') : '',
        'Observações': inst.observacoes || ''
      };
    }));
    
    return instituicoesComDetalhes;
  } catch (error) {
    console.error('Erro ao gerar relatório de instituições:', error);
    return [];
  }
}

async function gerarRelatorioIndicacoes(filtros) {
  try {
    let query = db('indicacoes')
      .leftJoin('instituicoes', 'indicacoes.instituicao_id', 'instituicoes.id')
      .select(
        'indicacoes.*',
        'instituicoes.nome as instituicao_nome',
        'instituicoes.contato_nome',
        'instituicoes.contato_email'
      );
    
    if (filtros.ano) {
      query = query.where('indicacoes.ano_referencia', filtros.ano);
    }
    
    if (filtros.status) {
      query = query.where('indicacoes.status', filtros.status);
    }
    
    if (filtros.instituicao_id) {
      query = query.where('indicacoes.instituicao_id', filtros.instituicao_id);
    }
    
    if (filtros.data_inicio) {
      query = query.where('indicacoes.created_at', '>=', filtros.data_inicio);
    }
    
    if (filtros.data_fim) {
      query = query.where('indicacoes.created_at', '<=', filtros.data_fim + ' 23:59:59');
    }
    
    const indicacoes = await query.orderBy('indicacoes.created_at', 'desc');
    
    return indicacoes.map(ind => ({
      'ID': ind.id,
      'Ano de Referência': ind.ano_referencia || '',
      'Instituição': ind.instituicao_nome || '',
      'Contato': ind.contato_nome || '',
      'E-mail Contato': ind.contato_email || '',
      'Status': ind.status || '',
      'Prazo Envio': ind.prazo_envio ? new Date(ind.prazo_envio).toLocaleDateString('pt-BR') : '',
      'Recebida Em': ind.recebida_em ? new Date(ind.recebida_em).toLocaleDateString('pt-BR') : '',
      'Arquivo': ind.arquivo_lista || '',
      'Data de Cadastro': ind.created_at ? new Date(ind.created_at).toLocaleDateString('pt-BR') : '',
      'Observações': ind.observacoes || ''
    }));
  } catch (error) {
    console.error('Erro ao gerar relatório de indicações:', error);
    return [];
  }
}

async function gerarRelatorioCedulas(filtros) {
  try {
    let query = db('cedulas')
      .leftJoin('sorteios', 'cedulas.sorteio_id', 'sorteios.id')
      .leftJoin('juizes', 'sorteios.juiz_responsavel_id', 'juizes.id')
      .select(
        'cedulas.*',
        db.raw('cedulas.numero_sequencial as numero_cedula'),
        'sorteios.numero_processo',
        'sorteios.data_juri',
        'sorteios.hora_juri',
        'sorteios.local_sorteio',
        'sorteios.ano_referencia',
        'juizes.nome_completo as juiz_nome'
      );
    
    if (filtros.sorteio_id) {
      query = query.where('cedulas.sorteio_id', filtros.sorteio_id);
    }
    
    if (filtros.status) {
      query = query.where('cedulas.status', filtros.status);
    }
    
    if (filtros.ano) {
      query = query.where('sorteios.ano_referencia', filtros.ano);
    }
    
    const cedulas = await query.orderBy('cedulas.created_at', 'desc');
    
    return cedulas.map(ced => ({
      'ID': ced.id,
      'Número da Cédula': ced.numero_cedula || ced.numero_sequencial || '',
      'Sorteio ID': ced.sorteio_id || '',
      'Número do Processo': ced.numero_processo || '',
      'Ano de Referência': ced.ano_referencia || '',
      'Data do Júri': ced.data_juri ? new Date(ced.data_juri).toLocaleDateString('pt-BR') : '',
      'Hora do Júri': ced.hora_juri || '',
      'Local': ced.local_sorteio || '',
      'Juiz': ced.juiz_nome || '',
      'Status': ced.status || 'Gerada',
      'Data de Criação': ced.created_at ? new Date(ced.created_at).toLocaleDateString('pt-BR') : ''
    }));
  } catch (error) {
    console.error('Erro ao gerar relatório de cédulas:', error);
    return [];
  }
}

async function gerarRelatorioEditais(filtros) {
  try {
    let query = db('editais')
      .leftJoin('juizes', 'editais.juiz_id', 'juizes.id')
      .select(
        'editais.*',
        'juizes.nome_completo as juiz_nome'
      );
    
    if (filtros.ano) {
      query = query.where('editais.ano_referencia', filtros.ano);
    }
    
    if (filtros.data_inicio) {
      query = query.where('editais.created_at', '>=', filtros.data_inicio);
    }
    
    if (filtros.data_fim) {
      query = query.where('editais.created_at', '<=', filtros.data_fim + ' 23:59:59');
    }
    
    const editais = await query.orderBy('editais.created_at', 'desc');
    
    return editais.map(ed => ({
      'ID': ed.id,
      'Número': ed.numero || '',
      'Título': ed.titulo || '',
      'Ano de Referência': ed.ano_referencia || '',
      'Juiz': ed.juiz_nome || '',
      'Status': ed.status || '',
      'Data de Publicação Prevista': ed.data_publicacao_prevista ? new Date(ed.data_publicacao_prevista).toLocaleDateString('pt-BR') : '',
      'Data de Publicação Real': ed.data_publicacao_real ? new Date(ed.data_publicacao_real).toLocaleDateString('pt-BR') : '',
      'Arquivo RTF': ed.arquivo_rtf_gerado || '',
      'Data de Criação': ed.created_at ? new Date(ed.created_at).toLocaleDateString('pt-BR') : '',
      'Observações': ed.observacoes || ''
    }));
  } catch (error) {
    console.error('Erro ao gerar relatório de editais:', error);
    return [];
  }
}

async function gerarRelatorioConsolidado(filtros) {
  try {
    const dados = {
      jurados: await gerarRelatorioJurados(filtros),
      sorteios: await gerarRelatorioSorteios(filtros),
      instituicoes: await gerarRelatorioInstituicoes(filtros),
      indicacoes: await gerarRelatorioIndicacoes(filtros),
      cedulas: await gerarRelatorioCedulas(filtros),
      editais: await gerarRelatorioEditais(filtros)
    };
    
    return dados;
  } catch (error) {
    console.error('Erro ao gerar relatório consolidado:', error);
    return {};
  }
}

async function gerarRelatorioPeriodo(filtros) {
  try {
    const { data_inicio, data_fim } = filtros;
    
    let query = db('jurados')
      .leftJoin('instituicoes', 'jurados.instituicao_id', 'instituicoes.id')
      .select(
        'jurados.*',
        'instituicoes.nome as instituicao_nome'
      );
    
    if (data_inicio) {
      query = query.where('jurados.created_at', '>=', data_inicio);
    }
    
    if (data_fim) {
      query = query.where('jurados.created_at', '<=', data_fim);
    }
    
    return await query.orderBy('jurados.created_at', 'desc');
  } catch (error) {
    console.error('Erro ao gerar relatório por período:', error);
    return [];
  }
}

async function gerarRelatorioPorInstituicao(filtros) {
  try {
    const { instituicao_id } = filtros;
    
    let query = db('jurados')
      .leftJoin('instituicoes', 'jurados.instituicao_id', 'instituicoes.id')
      .select(
        'jurados.*',
        'instituicoes.nome as instituicao_nome'
      );
    
    if (instituicao_id) {
      query = query.where('jurados.instituicao_id', instituicao_id);
    }
    
    return await query.orderBy('jurados.nome_completo');
  } catch (error) {
    console.error('Erro ao gerar relatório por instituição:', error);
    return [];
  }
}

async function gerarRelatorioPorJuiz(filtros) {
  try {
    const { juiz_id } = filtros;
    
    let query = db('sorteios')
      .leftJoin('juizes', 'sorteios.juiz_responsavel_id', 'juizes.id')
      .select(
        'sorteios.*',
        'juizes.nome_completo as juiz_nome'
      );
    
    if (juiz_id) {
      query = query.where('sorteios.juiz_responsavel_id', juiz_id);
    }
    
    return await query.orderBy('sorteios.data_juri', 'desc');
  } catch (error) {
    console.error('Erro ao gerar relatório por juiz:', error);
    return [];
  }
}

// Relatório de E-mails
async function gerarRelatorioEmails(filtros) {
  try {
    let query = db('notificacoes_email')
      .leftJoin('instituicoes', 'notificacoes_email.instituicao_id', 'instituicoes.id')
      .select(
        'notificacoes_email.*',
        'instituicoes.nome as instituicao_nome'
      );
    
    if (filtros.ano) {
      // Extrair ano do corpo_html ou assunto
      query = query.whereRaw("(notificacoes_email.corpo_html LIKE ? OR notificacoes_email.assunto LIKE ?)", 
        [`%ANO:${filtros.ano}%`, `%${filtros.ano}%`]);
    }
    
    if (filtros.status) {
      query = query.where('notificacoes_email.status', filtros.status);
    }
    
    if (filtros.data_inicio) {
      query = query.where('notificacoes_email.enviado_em', '>=', filtros.data_inicio);
    }
    
    if (filtros.data_fim) {
      query = query.where('notificacoes_email.enviado_em', '<=', filtros.data_fim + ' 23:59:59');
    }
    
    const emails = await query.orderBy('notificacoes_email.enviado_em', 'desc');
    
    // Extrair tipo do corpo_html ou assunto
    return emails.map(email => {
      const tipoMatch = email.corpo_html ? email.corpo_html.match(/<!--TIPO:(\w+)-->/) : null;
      const anoMatch = email.corpo_html ? email.corpo_html.match(/<!--ANO:(\d{4})-->/) : null;
      const tipo = tipoMatch ? tipoMatch[1] : (email.assunto && email.assunto.includes('Intimação') ? 'INTIMADO' : 'RECEBIDO');
      const ano = anoMatch ? anoMatch[1] : '';
      
      return {
        'ID': email.id,
        'Instituição': email.instituicao_nome || '',
        'Assunto': email.assunto || '',
        'Status': email.status || '',
        'Tipo': tipo,
        'Ano de Referência': ano,
        'Data de Envio': email.enviado_em ? new Date(email.enviado_em).toLocaleString('pt-BR') : '',
        'Data de Criação': email.created_at ? new Date(email.created_at).toLocaleDateString('pt-BR') : ''
      };
    });
  } catch (error) {
    console.error('Erro ao gerar relatório de e-mails:', error);
    return [];
  }
}

// Relatório de Último Conselho
async function gerarRelatorioUltimoConselho(filtros) {
  try {
    let query = db('jurados')
      .select(
        'jurados.id',
        'jurados.nome_completo',
        'jurados.cpf',
        'jurados.ultimo_conselho',
        'jurados.status',
        'jurados.profissao'
      )
      .whereNotNull('jurados.ultimo_conselho');
    
    if (filtros.ano) {
      query = query.whereRaw("strftime('%Y', jurados.ultimo_conselho) = ?", [filtros.ano.toString()]);
    }
    
    if (filtros.data_inicio) {
      query = query.where('jurados.ultimo_conselho', '>=', filtros.data_inicio);
    }
    
    if (filtros.data_fim) {
      query = query.where('jurados.ultimo_conselho', '<=', filtros.data_fim);
    }
    
    const jurados = await query.orderBy('jurados.ultimo_conselho', 'desc');
    
    return jurados.map(j => ({
      'ID': j.id,
      'Nome Completo': j.nome_completo || '',
      'CPF': j.cpf || '',
      'Profissão': j.profissao || '',
      'Status': j.status || '',
      'Último Conselho': j.ultimo_conselho ? new Date(j.ultimo_conselho).toLocaleDateString('pt-BR') : ''
    }));
  } catch (error) {
    console.error('Erro ao gerar relatório de último conselho:', error);
    return [];
  }
}

// Relatório de Estatísticas
async function gerarRelatorioEstatisticas(filtros) {
  try {
    const anoAtual = filtros.ano || new Date().getFullYear();
    
    const totalJurados = await db('jurados').count('* as total').first();
    const juradosAtivos = await db('jurados').where('status', 'Ativo').count('* as total').first();
    const juradosInativos = await db('jurados').where('status', 'Inativo').count('* as total').first();
    
    const juradosAno = await db('jurados')
      .whereRaw("strftime('%Y', created_at) = ?", [anoAtual.toString()])
      .count('* as total').first();
    
    const totalInstituicoes = await db('instituicoes').count('* as total').first();
    const instituicoesAtivas = await db('instituicoes').where('ativo', 'Sim').count('* as total').first();
    
    const totalSorteios = await db('sorteios').count('* as total').first();
    const sorteiosAno = await db('sorteios')
      .where('ano_referencia', anoAtual)
      .count('* as total').first();
    
    const totalIndicacoes = await db('indicacoes').count('* as total').first();
    const indicacoesAno = await db('indicacoes')
      .where('ano_referencia', anoAtual)
      .count('* as total').first();
    
    const indicacoesRecebidas = await db('indicacoes')
      .where('status', 'recebida')
      .count('* as total').first();
    
    const totalEditais = await db('editais').count('* as total').first();
    const editaisAno = await db('editais')
      .where('ano_referencia', anoAtual)
      .count('* as total').first();
    
    const totalCedulas = await db('cedulas').count('* as total').first();
    const cedulasImpressas = await db('cedulas')
      .where('status', 'Impressa')
      .count('* as total').first();
    
    const totalEmails = await db('notificacoes_email').count('* as total').first();
    const emailsEnviados = await db('notificacoes_email')
      .where('status', 'enviado')
      .count('* as total').first();
    
    const juradosComUltimoConselho = await db('jurados')
      .whereNotNull('ultimo_conselho')
      .count('* as total').first();
    
    const cadastradosAno = `Cadastrados em ${anoAtual}`;
    const emAno = `Em ${anoAtual}`;
    
    return [{
      'Categoria': 'JURADOS',
      'Total Geral': parseInt(totalJurados.total),
      'Ativos': parseInt(juradosAtivos.total),
      'Inativos': parseInt(juradosInativos.total),
      [cadastradosAno]: parseInt(juradosAno.total),
      'Com Último Conselho': parseInt(juradosComUltimoConselho.total),
      'Ano de Referência': anoAtual
    }, {
      'Categoria': 'INSTITUIÇÕES',
      'Total Geral': parseInt(totalInstituicoes.total),
      'Ativas': parseInt(instituicoesAtivas.total),
      'Inativas': parseInt(totalInstituicoes.total) - parseInt(instituicoesAtivas.total),
      'Ano de Referência': anoAtual
    }, {
      'Categoria': 'SORTEIOS',
      'Total Geral': parseInt(totalSorteios.total),
      [emAno]: parseInt(sorteiosAno.total),
      'Ano de Referência': anoAtual
    }, {
      'Categoria': 'INDICAÇÕES',
      'Total Geral': parseInt(totalIndicacoes.total),
      [emAno]: parseInt(indicacoesAno.total),
      'Recebidas': parseInt(indicacoesRecebidas.total),
      'Ano de Referência': anoAtual
    }, {
      'Categoria': 'EDITAIS',
      'Total Geral': parseInt(totalEditais.total),
      [emAno]: parseInt(editaisAno.total),
      'Ano de Referência': anoAtual
    }, {
      'Categoria': 'CÉDULAS',
      'Total Geral': parseInt(totalCedulas.total),
      'Impressas': parseInt(cedulasImpressas.total),
      'Ano de Referência': anoAtual
    }, {
      'Categoria': 'E-MAILS',
      'Total Geral': parseInt(totalEmails.total),
      'Enviados': parseInt(emailsEnviados.total),
      'Ano de Referência': anoAtual
    }];
  } catch (error) {
    console.error('Erro ao gerar relatório de estatísticas:', error);
    return [];
  }
}

function gerarHTML(dados) {
  try {
    if (Array.isArray(dados)) {
      if (dados.length === 0) {
        return '<tr><td colspan="100%" style="text-align: center; padding: 20px;">Nenhum dado disponível para este relatório.</td></tr>';
      }
      
      // Extrair cabeçalhos do primeiro objeto
      const headers = Object.keys(dados[0]);
      if (headers.length === 0) {
        return '<tr><td colspan="100%" style="text-align: center; padding: 20px;">Nenhum dado disponível.</td></tr>';
      }
      
      // Criar linha de cabeçalho
      const headerRow = '<tr>' + headers.map(h => `<th>${escapeHtml(String(h))}</th>`).join('') + '</tr>';
      
      // Criar linhas de dados
      const rows = dados.map(item => {
        const cells = headers.map(header => {
          const value = item[header];
          // Formatar valores vazios, nulos ou indefinidos
          const displayValue = value !== null && value !== undefined ? String(value) : '';
          return `<td>${escapeHtml(displayValue)}</td>`;
        });
        return '<tr>' + cells.join('') + '</tr>';
      });
      
      return headerRow + rows.join('');
    } else if (typeof dados === 'object' && dados !== null) {
      // Para relatórios consolidados (objeto com múltiplas arrays)
      let html = '';
      for (const [tipo, items] of Object.entries(dados)) {
        if (Array.isArray(items) && items.length > 0) {
          html += `<tr><td colspan="100%" style="background-color: #e0e0e0; font-weight: bold; padding: 15px; text-align: center;"><h2 style="margin: 0;">${escapeHtml(tipo.toUpperCase())}</h2></td></tr>`;
          html += gerarHTML(items);
        }
      }
      return html || '<tr><td colspan="100%" style="text-align: center; padding: 20px;">Nenhum dado disponível.</td></tr>';
    }
    
    return '<tr><td colspan="100%" style="text-align: center; padding: 20px;">Nenhum dado disponível.</td></tr>';
  } catch (error) {
    console.error('Erro ao gerar HTML:', error);
    return '<tr><td colspan="100%" style="text-align: center; padding: 20px; color: red;">Erro ao gerar relatório: ' + escapeHtml(error.message) + '</td></tr>';
  }
}

function escapeHtml(text) {
  if (typeof text !== 'string') {
    text = String(text);
  }
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function gerarCSV(dados) {
  if (Array.isArray(dados)) {
    if (dados.length === 0) return '';
    
    const headers = Object.keys(dados[0]);
    const rows = dados.map(item => 
      headers.map(header => {
        const value = item[header] || '';
        // Escapar aspas e quebras de linha
        const escaped = String(value).replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, '');
        return `"${escaped}"`;
      }).join(',')
    );
    
    return [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
  } else if (typeof dados === 'object') {
    // Para relatórios consolidados
    let csv = '';
    for (const [tipo, items] of Object.entries(dados)) {
      if (Array.isArray(items) && items.length > 0) {
        csv += `\n=== ${tipo.toUpperCase()} ===\n`;
        csv += gerarCSV(items);
        csv += '\n';
      }
    }
    return csv;
  }
  
  return '';
}

module.exports = router;