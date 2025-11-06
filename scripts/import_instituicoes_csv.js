/*
  Importa instituições a partir de um CSV com cabeçalho:
  nome,cnpj,contato_nome,contato_email,contato_telefone,endereco,cidade,uf,cep,ativo,quantidade

  Uso:
    node scripts/import_instituicoes_csv.js scripts/instituicoes_capivari.csv
*/

const fs = require('fs');
const path = require('path');
const db = require('../config/database');

function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = splitCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = cols[idx] !== undefined ? cols[idx] : '';
    });
    rows.push(obj);
  }
  return rows;
}

function splitCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === ',') {
        result.push(cur);
        cur = '';
      } else if (ch === '"') {
        inQuotes = true;
      } else {
        cur += ch;
      }
    }
  }
  result.push(cur);
  return result.map(s => s.trim());
}

function sanitizeQty(value) {
  if (!value) return null;
  const n = parseInt(String(value).replace(/\D+/g, ''), 10);
  if (Number.isNaN(n) || n < 1 || n > 99) return null;
  return n;
}

async function run() {
  try {
    const inputPath = process.argv[2];
    if (!inputPath) {
      console.error('Informe o caminho do CSV como parâmetro.');
      process.exit(1);
    }
    const abs = path.isAbsolute(inputPath) ? inputPath : path.resolve(process.cwd(), inputPath);
    if (!fs.existsSync(abs)) {
      console.error('Arquivo não encontrado:', abs);
      process.exit(1);
    }

    const csv = fs.readFileSync(abs, 'utf8');
    const data = parseCSV(csv);
    if (!Array.isArray(data) || data.length === 0) {
      console.error('CSV vazio ou inválido.');
      process.exit(1);
    }

    let inseridos = 0, atualizados = 0, ignorados = 0;

    for (const row of data) {
      const nome = (row.nome || '').toString().trim();
      if (!nome) { ignorados++; continue; }

      const registro = {
        nome: nome,
        cnpj: (row.cnpj || null) || null,
        contato_nome: (row.contato_nome || 'Sr.(a). Diretor'),
        contato_email: (row.contato_email || null),
        contato_telefone: (row.contato_telefone || null),
        endereco: (row.endereco || null),
        cidade: (row.cidade || 'Capivari de Baixo'),
        uf: (row.uf || 'SC'),
        cep: (row.cep || '88745-000'),
        ativo: (row.ativo && row.ativo.trim() ? row.ativo.trim() : 'Sim'),
        quantidade: sanitizeQty(row.quantidade) || 10
      };

      try {
        // Upsert por nome (alternativa: por CNPJ quando disponível)
        const existente = await db('instituicoes').where('nome', registro.nome).first();
        if (existente) {
          await db('instituicoes').where('id', existente.id).update(registro);
          atualizados++;
        } else {
          await db('instituicoes').insert(registro);
          inseridos++;
        }
      } catch (e) {
        console.error('Falha ao salvar instituição', registro.nome, e.message);
        ignorados++;
      }
    }

    console.log(`Instituições importadas. Inseridos: ${inseridos}, Atualizados: ${atualizados}, Ignorados: ${ignorados}`);
    process.exit(0);
  } catch (err) {
    console.error('Erro na importação:', err);
    process.exit(1);
  }
}

run();


