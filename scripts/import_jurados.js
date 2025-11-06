/*
  Script de importação de jurados a partir de um arquivo JSON.
  Uso:
    node scripts/import_jurados.js "C:\\Users\\cliente\\Downloads\\b.json"
*/

const fs = require('fs');
const path = require('path');
const db = require('../config/database');

function toYYYYMMDD(dateStr) {
  if (!dateStr) return null;
  // Aceita formatos DD/MM/AAAA, AAAA-MM-DD, AAAA/MM/DD
  try {
    const s = String(dateStr).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) return s.replace(/\//g, '-');
    const m = s.match(/^(\d{2})[\/.-](\d{2})[\/.-](\d{4})$/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  } catch (_) {}
  return null;
}

function onlyDigits(str) {
  return (str || '').replace(/\D+/g, '');
}

function formatCPF(cpf) {
  const d = onlyDigits(cpf);
  if (d.length !== 11) return cpf || '';
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}

function pick(obj, keys, fallback = undefined) {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return fallback;
}

async function run() {
  try {
    const inputPath = process.argv[2];
    if (!inputPath) {
      console.error('Informe o caminho do arquivo JSON como parâmetro.');
      process.exit(1);
    }
    const abs = path.isAbsolute(inputPath) ? inputPath : path.resolve(process.cwd(), inputPath);
    if (!fs.existsSync(abs)) {
      console.error('Arquivo não encontrado:', abs);
      process.exit(1);
    }

    const raw = fs.readFileSync(abs, 'utf8');
    let data = JSON.parse(raw);
    if (!Array.isArray(data)) {
      // Tentar detectar se é objeto com propriedade contendo a lista
      const firstArrayKey = Object.keys(data || {}).find(k => Array.isArray(data[k]));
      if (firstArrayKey) data = data[firstArrayKey];
    }
    if (!Array.isArray(data)) {
      console.error('O JSON deve conter um array de jurados.');
      process.exit(1);
    }

    let inseridos = 0, atualizados = 0, ignorados = 0;

    for (const item of data) {
      // Mapear campos com tolerância a nomes diferentes do legado
      const nome = pick(item, ['nome_completo', 'nome', 'Nome', 'NOME'], '').toString().toUpperCase();
      const cpfOrig = pick(item, ['cpf', 'CPF'], '').toString();
      const cpf = formatCPF(cpfOrig);
      const rg = pick(item, ['rg', 'RG'], '');
      const data_nascimento = toYYYYMMDD(pick(item, ['data_nascimento', 'nascimento', 'dataNasc', 'DataNascimento'], ''));
      let sexo = pick(item, ['sexo', 'Sexo', 'SEXO'], '').toString();
      if (sexo) {
        const s = sexo.toLowerCase();
        if (s.startsWith('m')) sexo = 'Masculino';
        else if (s.startsWith('f')) sexo = 'Feminino';
        else sexo = '';
      }
      const endereco = pick(item, ['endereco', 'Endereço', 'Endereco'], '').toString().toUpperCase();
      const numero = pick(item, ['numero', 'nº', 'Numero'], '').toString().toUpperCase();
      const complemento = pick(item, ['complemento', 'Complemento'], '') || null;
      const bairro = pick(item, ['bairro', 'Bairro'], '').toString().toUpperCase();
      const cidade = (pick(item, ['cidade', 'Cidade'], 'Capivari de Baixo') || 'Capivari de Baixo').toString();
      const uf = (pick(item, ['uf', 'UF', 'estado', 'Estado'], 'SC') || 'SC').toString().toUpperCase().slice(0,2);
      const cep = pick(item, ['cep', 'CEP'], '88745-000');
      const email = pick(item, ['email', 'Email', 'E-mail'], '') || null;
      const telefone = pick(item, ['telefone', 'Telefone', 'celular'], '') || null;
      const profissao = pick(item, ['profissao', 'Profissão', 'Profissao'], '').toString().toUpperCase() || 'NÃO INFORMADO';
      const observacoes = pick(item, ['observacoes', 'Observações', 'Observacoes'], '') || null;
      let status = pick(item, ['status', 'Status'], 'Ativo');
      status = status === 'Inativo' ? 'Inativo' : 'Ativo';
      let motivo = pick(item, ['motivo', 'Motivo'], null);
      if (motivo) {
        const m = String(motivo).toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
        if (m.includes('12')) motivo = '12 meses';
        else if (m.includes('falec')) motivo = 'Falecido';
        else if (m.includes('imped')) motivo = 'Impedimento';
        else if (m.includes('idade')) motivo = 'Idade';
        else if (m.includes('outra comarca') || m.includes('outra') && m.includes('comarca')) motivo = 'Outra Comarca';
        else if (m.includes('incapac')) motivo = 'Incapacitado';
        else if (m.includes('tempor')) motivo = 'Temporário';
        else motivo = null;
      }
      const suspenso_ate = toYYYYMMDD(pick(item, ['suspenso_ate', 'suspensoAte', 'suspensoAté'], ''));
      const ultimo_conselho = toYYYYMMDD(pick(item, ['ultimo_conselho', 'ultimoConselho', 'último_conselho'], ''));

      // Atender às constraints: campos notNullable devem receber string vazia se não vierem
      let sexoFinal = sexo;
      if (!sexoFinal || (sexoFinal !== 'Masculino' && sexoFinal !== 'Feminino')) {
        // Banco exige enum; se legado estiver vazio, usar 'Masculino' para não falhar.
        sexoFinal = 'Masculino';
      }

      const registro = {
        nome_completo: nome || '',
        cpf: cpf || '',
        rg: rg || null,
        data_nascimento: data_nascimento || null,
        sexo: sexoFinal,
        endereco: endereco || '',
        numero: numero || '',
        complemento,
        bairro: bairro || '',
        cidade: cidade || 'Capivari de Baixo',
        uf: uf || 'SC',
        cep: cep || '88745-000',
        email,
        telefone,
        profissao: profissao || 'NÃO INFORMADO',
        observacoes,
        status,
        motivo: motivo || null,
        suspenso_ate: suspenso_ate || null,
        ultimo_conselho: ultimo_conselho || null
      };

      try {
        // Tentar upsert por CPF
        const existente = await db('jurados').where('cpf', registro.cpf).first();
        if (existente) {
          await db('jurados').where('id', existente.id).update(registro);
          atualizados++;
        } else {
          await db('jurados').insert(registro);
          inseridos++;
        }
      } catch (e) {
        console.error('Falha ao salvar registro com CPF', registro.cpf, e.message);
        ignorados++;
      }
    }

    console.log(`Importação concluída. Inseridos: ${inseridos}, Atualizados: ${atualizados}, Ignorados: ${ignorados}`);
    process.exit(0);
  } catch (err) {
    console.error('Erro na importação:', err);
    process.exit(1);
  }
}

run();


