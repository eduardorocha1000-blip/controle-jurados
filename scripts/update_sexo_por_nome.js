/*
  Atualiza o campo `sexo` dos jurados com base no nome próprio (heurística).
  Uso:
    node scripts/update_sexo_por_nome.js
*/

const db = require('../config/database');

function normalizar(str) {
  return (str || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function inferirSexoPorNome(nomeCompleto) {
  if (!nomeCompleto) return null;
  const nome = normalizar(nomeCompleto);
  if (!nome) return null;
  const primeiro = nome.split(/\s+/)[0];
  if (!primeiro) return null;

  // Listas base simples (pode expandir conforme necessário)
  const femininos = new Set([
    'maria','ana','joana','juliana','fernanda','patricia','gabriela','camila','bruna','amanda','paula','luana','elaine','rosangela','cecilia','stefani','viviana','viviane','joice','daiane','marlene','leila','rosangela','samira','alessandra','adriana','ana','marta','marcia','isabela','monica','beatriz','raquel','taina','andreia','aline','carolina','carla','claudia','sandra','sabrina','patricia','aparecida'
  ]);
  const masculinos = new Set([
    'joao','jose','josé','antonio','antonio','luiz','luis','pedro','carlos','paulo','marcos','anderson','eduardo','felipe','thiago','tiago','rodrigo','lucas','mateus','claudio','emerson','odilon','nilson','amadeu','taqueu','tadeu','claudir','edival','helio','jair','alexandre','leonardo','ricardo'
  ]);

  // Indicadores por sufixo (heurística):
  const sufixosF = ['a','ia','na','ara','ela','ila','isa','sia','ine','ane','ene','one','ene','ane','iane','ane','ete','ete'];
  const sufixosM = ['o','io','r','son','ton','el','iel','iel','u','es'];

  // Regras explícitas
  if (femininos.has(primeiro)) return 'Feminino';
  if (masculinos.has(primeiro)) return 'Masculino';

  // Heurística por sufixo
  for (const s of sufixosF) {
    if (primeiro.endsWith(s)) return 'Feminino';
  }
  for (const s of sufixosM) {
    if (primeiro.endsWith(s)) return 'Masculino';
  }

  // Heurística adicional: nomes terminados com 'a' tendem a Feminino, 'o' a Masculino
  if (primeiro.endsWith('a')) return 'Feminino';
  if (primeiro.endsWith('o')) return 'Masculino';

  return null; // indeterminado
}

async function run() {
  try {
    const jurados = await db('jurados').select('id','nome_completo','sexo');
    let atualizados = 0, ignorados = 0;

    for (const j of jurados) {
      const sexoInferido = inferirSexoPorNome(j.nome_completo);
      if (!sexoInferido) { ignorados++; continue; }
      if (j.sexo !== sexoInferido) {
        await db('jurados').where('id', j.id).update({ sexo: sexoInferido });
        atualizados++;
      }
    }

    console.log(`Concluído. Atualizados: ${atualizados}, Indeterminados/inalterados: ${ignorados}`);
    process.exit(0);
  } catch (err) {
    console.error('Erro ao atualizar sexos:', err);
    process.exit(1);
  }
}

run();


