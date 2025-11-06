const db = require('../config/database');
const Jurado = require('./Jurado');

class Edital {
  static async criar(dados) {
    // Campos permitidos para criação
    const camposPermitidos = [
      'ano_referencia', 'numero', 'titulo', 'corpo_rtf',
      'data_publicacao_prevista', 'data_publicacao_real', 'arquivo_rtf_gerado', 'juiz_id', 'observacoes', 'status'
    ];
    
    // Filtrar apenas campos permitidos
    const dadosLimpos = {};
    camposPermitidos.forEach(campo => {
      if (dados[campo] !== undefined) {
        dadosLimpos[campo] = dados[campo];
      }
    });
    
    // Converter campos de texto para maiúsculo
    if (dadosLimpos.titulo) {
      dadosLimpos.titulo = dadosLimpos.titulo.toUpperCase();
    }
    
    const [edital] = await db('editais')
      .insert(dadosLimpos)
      .returning('*');
    
    return edital;
  }

  static async listar(filtros = {}) {
    let query = db('editais')
      .leftJoin('juizes', 'editais.juiz_id', 'juizes.id')
      .select(
        'editais.*',
        'juizes.nome_completo as juiz_nome'
      );
    
    if (filtros.ano_referencia) {
      query = query.where('editais.ano_referencia', filtros.ano_referencia);
    }
    
    if (filtros.busca) {
      query = query.where(function() {
        this.where('editais.numero', 'like', `%${filtros.busca}%`)
            .orWhere('editais.titulo', 'like', `%${filtros.busca}%`)
            .orWhere('editais.ano_referencia', 'like', `%${filtros.busca}%`);
      });
    }
    
    return await query.orderBy('editais.created_at', 'desc');
  }

  static async buscarPorId(id) {
    return await db('editais')
      .leftJoin('juizes', 'editais.juiz_id', 'juizes.id')
      .select(
        'editais.*',
        'juizes.nome_completo as juiz_nome'
      )
      .where('editais.id', id)
      .first();
  }

  static async atualizar(id, dados) {
    // Campos permitidos para atualização
    const camposPermitidos = [
      'ano_referencia', 'numero', 'titulo', 'corpo_rtf',
      'data_publicacao_prevista', 'data_publicacao_real', 'arquivo_rtf_gerado', 'juiz_id', 'observacoes', 'status'
    ];
    
    // Filtrar apenas campos permitidos
    const dadosLimpos = {};
    camposPermitidos.forEach(campo => {
      if (dados[campo] !== undefined) {
        dadosLimpos[campo] = dados[campo];
      }
    });
    
    // Converter campos de texto para maiúsculo
    if (dadosLimpos.titulo) {
      dadosLimpos.titulo = dadosLimpos.titulo.toUpperCase();
    }
    
    const [edital] = await db('editais')
      .where('id', id)
      .update(dadosLimpos)
      .returning('*');
    
    return edital;
  }

  static async excluir(id) {
    return await db('editais')
      .where('id', id)
      .del();
  }

  static async gerarRTF(editalId, dados) {
    const edital = await this.buscarPorId(editalId);
    if (!edital) {
      throw new Error('Edital não encontrado');
    }

    // Template RTF básico
    const templateRTF = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}
{\\colortbl;\\red0\\green0\\blue0;}
\\f0\\fs24

{\\b\\fs28 EDITAL Nº ${edital.numero || 'XXX'} - ${edital.ano_referencia}\\par}
\\par
{\\b\\fs24 ${edital.titulo || 'CONVOCAÇÃO DE JURADOS'}\\par}
\\par

{\\fs20 ${dados.fundamento_legal || 'Fundamento legal conforme legislação vigente.'}\\par}
\\par

{\\fs20 A Comarca de ${dados.comarca || 'Capivari de Baixo'} convoca os cidadãos abaixo relacionados para comporem o corpo de jurados no ano de ${edital.ano_referencia}.\\par}
\\par

{\\fs20 Total de jurados convocados: ${dados.quantitativo_jurados || 'XXX'}\\par}
\\par

{\\fs20 Data de publicação: ${dados.data_publicacao || new Date().toLocaleDateString('pt-BR')}\\par}
\\par

{\\fs20 Os jurados convocados devem comparecer conforme cronograma a ser divulgado.\\par}
\\par

{\\fs20 ${dados.assinatura_autoridade || 'Dr. João Silva Santos'}\\par}
{\\fs20 Juiz Titular da Vara Única\\par}
{\\fs20 Comarca de Capivari de Baixo\\par}
\\par

{\\fs20 Capivari de Baixo, ${new Date().toLocaleDateString('pt-BR')}.\\par}
}`;

    // Salvar RTF no banco
    await this.atualizar(editalId, {
      corpo_rtf: templateRTF,
      arquivo_rtf_gerado: `edital_${edital.numero}_${edital.ano_referencia}.rtf`
    });

    return templateRTF;
  }

  static async buscarUltimo() {
    return await db('editais')
      .orderBy('created_at', 'desc')
      .first();
  }

  static gerarTemplatePadrao(anoReferencia, nomeJuiz = '') {
    const dataAtual = new Date();
    const dataPorExtenso = dataAtual.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `ESTADO DE SANTA CATARINA
PODER JUDICIÁRIO
COMARCA DE CAPIVARI DE BAIXO
EDITAL DE ALISTAMENTO DE JURADOS PARA O ANO {ANO DE REFERÊNCIA}

O(A) EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) {NOME DO JUIZ}, JUIZ(A) DE DIREITO E PRESIDENTE(A) DO TRIBUNAL DO JÚRI DA COMARCA DE CAPIVARI DE BAIXO, NA FORMA DA LEI, ETC.

FAZ SABER, A TODOS QUANTO O PRESENTE VIREM, OU DELE CONHECIMENTO TIVEREM, QUE, DE CONFORMIDADE COM OS ARTIGOS 425 E 426 DO CÓDIGO DE PROCESSO PENAL, COM A REDAÇÃO DADA PELA LEI 11.689, DE 09/06/2008 E LEI DE ORGANIZAÇÃO JUDICIÁRIA DO ESTADO PROCEDEU A QUALIFICAÇÃO ANUAL DOS JURADOS DESTA COMARCA PARA O ANO DE {ANO DE REFERÊNCIA}, A QUAL SERÁ AFIXADA NA SEDE DESTE JUÍZO E NO DIÁRIO DA JUSTIÇA DO ESTADO.

{LISTA COM OS NOMES DOS JURADOS SEGUIDOS DA PROFISSÃO}

EM CUMPRIMENTO AO DISPOSTO NO § 2º DO ARTIGO 426 DO CPP, NA REDAÇÃO DADA PELA LEI Nº 11.689, DE 09/06/2008, TRANSCREVEM-SE OS ARTIGOS 436 A 446 DO REFERIDO DIPLOMA LEGAL: ART. 436. O SERVIÇO DO JÚRI É OBRIGATÓRIO. O ALISTAMENTO COMPREENDERÁ OS CIDADÃOS MAIORES DE 18 (DEZOITO) ANOS DE NOTÓRIA IDONEIDADE. § 1º NENHUM CIDADÃO PODERÁ SER EXCLUÍDO DOS TRABALHOS DO JÚRI OU DEIXAR DE SER ALISTADO EM RAZÃO DE COR OU ETNIA, RAÇA, CREDO, SEXO, PROFISSÃO, CLASSE SOCIAL OU ECONÔMICA, ORIGEM OU GRAU DE INSTRUÇÃO. § 2º A RECUSA INJUSTIFICADA AO SERVIÇO DO JÚRI ACARRETARÁ MULTA NO VALOR DE 1(M) A 10(DEZ) SALÁRIOS MÍNIMOS, A CRITÉRIO DO JUIZ, DE ACORDO COM A CONDIÇÃO ECONÔMICA DO JURADO. ART. 437. ESTÃO ISENTOS DO SERVIÇO DO JÚRI: I - O PRESIDENTE DA REPÚBLICA E OS MINISTROS DE ESTADO; II - OS GOVERNADORES E SEUS RESPECTIVOS SECRETÁRIOS; III - OS MEMBROS DO CONGRESSO NACIONAL, DAS ASSEMBLEIAS LEGISLATIVAS E DAS CÂMARAS DISTRITAL E MUNICIPAIS; IV - OS PREFEITOS MUNICIPAIS; V - OS MAGISTRADOS E MEMBROS DO MINISTÉRIO PÚBLICO E DA DEFENSORIA PÚBLICA; VI - OS SERVIDORES DO PODER JUDICIÁRIO, DO MINISTÉRIO PÚBLICO E DA DEFENSORIA PÚBLICA; VII - AS AUTORIDADES E OS SERVIDORES DA POLÍCIA E DA SEGURANÇA PÚBLICA; VIII- OS MILITARES EM SERVIÇO ATIVO; IX - OS CIDADÃOS MAIORES DE 70 (SETENTA) ANOS QUE REQUEIRAM SUA DISPENSA; X - AQUELES QUE O REQUEREREM, DEMONSTRANDO JUSTO IMPEDIMENTO. ART. 438. A RECUSA AO SERVIÇO DO JÚRI FUNDADA EM CONVICÇÃO RELIGIOSA, FILOSÓFICA OU POLÍTICA IMPORTARÁ NO DEVER DE PRESTAR SERVIÇO ALTERNATIVO, SOB PENA DE SUSPENSÃO DOS DIREITOS POLÍTICOS, ENQUANTO NÃO PRESTAR O SERVIÇO IMPOSTO. § 1º ENTENDE-SE POR SERVIÇO ALTERNATIVO O EXERCÍCIO DE ATIVIDADES DE CARÁTER ADMINISTRATIVO, ASSISTENCIAL, FILANTRÓPICO OU MESMO PRODUTIVO, NO PODER JUDICIÁRIO, NA DEFENSORIA PÚBLICA, NO MINISTÉRIO PÚBLICO OU EM ENTIDADE CONVENIADA PARA ESSES FINS. § 2º O JUIZ FIXARÁ O SERVIÇO ALTERNATIVO ATENDENDO AOS PRINCÍPIOS DA PROPORCIONALIDADE E DA RAZOABILIDADE. ART. 439. O EXERCÍCIO EFETIVO DA FUNÇÃO DE JURADO CONSTITUIRÁ SERVIÇO PÚBLICO RELEVANTE, ESTABELECERÁ PRESUNÇÃO DE IDONEIDADE MORAL ASSEGURARÁ PRISÃO ESPECIAL, EM CASO DE CRIME COMUM, ATÉ O JULGAMENTO DEFINITIVO. ART. 440. CONSTITUI TAMBÉM DIREITO DO JURADO, NA CONDIÇÃO DO ART. 439 DESTE CÓDIGO, PREFERÊNCIA, EM IGUALDADE DE CONDIÇÕES, NAS LICITAÇÕES PÚBLICAS E NO PROVIMENTO, MEDIANTE CONCURSO, DE CARGO OU FUNÇÃO, BEM COMO NOS CASOS DE PROMOÇÃO FUNCIONAL OU REMOÇÃO VOLUNTÁRIA. ART. 441. NENHUM DESCONTO SERÁ FEITO NOS VENCIMENTOS OU SALÁRIO DO JURADO SORTEADO QUE COMPARECER À SESSÃO DO JÚRI. ART. 442. AO JURADO QUE, SEM CAUSA LEGÍTIMA, DEIXAR DE COMPARECER NO DIA MARCADO PARA A SESSÃO OU RETIRAR-SE ANTES DE SER DISPENSADO PELO PRESIDENTE SERÁ APLICADA MULTA DE 01(UM) A 10(DEZ) SALÁRIOS MÍNIMOS, A CRITÉRIO DO JUIZ, DE ACORDO COM A SUA CONDIÇÃO ECONÔMICA. ART. 443. SOMENTE SERÁ ACEITA ESCUSA FUNDADA EM MOTIVO RELEVANTE DEVIDAMENTE COMPROVADO E APRESENTADA, RESSALVADAS AS HIPÓTESES DE FORÇA MAIOR, ATÉ O MOMENTO DA CHAMADA DOS JURADOS. ART. 444. O JURADO SOMENTE SERÁ DISPENSADO POR DECISÃO MOTIVADA DO JUIZ PRESIDENTE, CONSIGNADA NA ATA DOS TRABALHOS. ART. 445. O JURADO, NO EXERCÍCIO DA FUNÇÃO OU A PRETEXTO DE EXERCÊ-LA, SERÁ RESPONSÁVEL CRIMINALMENTE NOS MESMOS TERMOS EM QUE O SÃO OS JUÍZES TOGADOS. ART. 446. AOS SUPLENTES, QUANDO CONVOCADOS, SERÃO APLICÁVEIS OS DISPOSITIVOS REFERENTES ÀS DISPENSAS, FALTAS E ESCUSAS E À EQUIPARAÇÃO DE RESPONSABILIDADE PENAL PREVISTA NO ART. 445 DESTE CÓDIGO. CAPIVARI DE BAIXO-SC, {DATA ATUAL POR EXTENSO}. Dr.(a) {NOME DO JUIZ}, JUIZ(A) DE DIREITO.`;
  }

  static async gerarListaJurados() {
    try {
      // Buscar todos os jurados ativos
      const jurados = await Jurado.listar({ status: 'Ativo' });
      
      if (jurados.length === 0) {
        return 'Nenhum jurado ativo encontrado.';
      }
      
      // Ordenar jurados alfabeticamente por nome
      jurados.sort((a, b) => {
        const nomeA = (a.nome_completo || '').toUpperCase();
        const nomeB = (b.nome_completo || '').toUpperCase();
        return nomeA.localeCompare(nomeB, 'pt-BR');
      });
      
      // Gerar lista simples de texto (um jurado por linha)
      let lista = '';
      jurados.forEach((jurado, index) => {
        const nome = jurado.nome_completo || '';
        const profissao = jurado.profissao || 'Não informado';
        
        if (index === 0) {
          lista += `${nome}, ${profissao}`;
        } else {
          lista += `\n${nome}, ${profissao}`;
        }
      });
      
      return lista;
    } catch (error) {
      console.error('Erro ao gerar lista de jurados:', error);
      return 'Erro ao carregar lista de jurados.';
    }
  }

  static async substituirPlaceholders(template, dados) {
    let conteudo = template;
    
    // Substituir placeholders pelos valores reais
    conteudo = conteudo.replace(/{ANO DE REFERÊNCIA}/g, dados.anoReferencia || '');
    conteudo = conteudo.replace(/{NOME DO JUIZ}/g, dados.nomeJuiz || '');
    // Forçar maiúsculas na data por extenso
    const dataExtensoUpper = (dados.dataPorExtenso || '').toString().toUpperCase();
    conteudo = conteudo.replace(/{DATA ATUAL POR EXTENSO}/g, dataExtensoUpper);
    conteudo = conteudo.replace(/{NUMERO_EDITAL}/g, dados.numeroEdital || '');
    
    // Substituir lista de jurados por lista de texto
    if (conteudo.includes('{LISTA COM OS NOMES DOS JURADOS SEGUIDOS DA PROFISSÃO}')) {
      const listaJurados = await this.gerarListaJurados();
      conteudo = conteudo.replace(/{LISTA COM OS NOMES DOS JURADOS SEGUIDOS DA PROFISSÃO}/g, listaJurados);
    }
    
    return conteudo;
  }
}

module.exports = Edital;
