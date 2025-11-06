const db = require('../config/database');

async function main() {
  try {
    console.log('[Popular] Iniciando...');

    // Criar 10 instituições
    const baseNames = [
      'Instituição Alfa', 'Instituição Beta', 'Instituição Gama', 'Instituição Delta', 'Instituição Épsilon',
      'Instituição Zeta', 'Instituição Eta', 'Instituição Teta', 'Instituição Iota', 'Instituição Kappa'
    ];
    const email = 'eduardorocha1000@gmail.com';

    for (let i = 0; i < 10; i++) {
      const nome = `${baseNames[i]} ${String(i+1).padStart(2,'0')}`;
      const existente = await db('instituicoes').where({ nome }).first();
      if (!existente) {
        await db('instituicoes').insert({
          nome,
          cnpj: `00.000.000/000${i+1}-00`,
          contato_nome: `Contato ${i+1}`,
          contato_email: email,
          contato_telefone: '(48) 99999-0000',
          endereco: `Rua Exemplo, ${100 + i}`,
          cidade: 'Capivari de Baixo',
          uf: 'SC',
          cep: '88745-000',
          ativo: 'Sim',
          quantidade: 10,
          created_at: new Date(),
          updated_at: new Date()
        });
        console.log(`[Popular] Instituição criada: ${nome}`);
      } else {
        console.log(`[Popular] Instituição já existe: ${nome}`);
      }
    }

    const instituicoes = await db('instituicoes').orderBy('id', 'asc').limit(10);
    const ano = new Date().getFullYear();

    // Criar 10 indicações (uma por instituição) como pendente
    for (const inst of instituicoes) {
      const existenteInd = await db('indicacoes')
        .where({ instituicao_id: inst.id, ano_referencia: ano })
        .first();
      if (!existenteInd) {
        const registro = {
          instituicao_id: inst.id,
          ano_referencia: ano,
          status: 'pendente',
          observacoes: 'Carga de exemplo',
          created_at: new Date(),
          updated_at: new Date()
        };
        await db('indicacoes').insert(registro);
        console.log(`[Popular] Indicação criada: inst ${inst.id} (${inst.nome}), ano ${ano}`);
      } else {
        console.log(`[Popular] Indicação já existe: inst ${inst.id} (${inst.nome}), ano ${ano}`);
      }
    }

    console.log('[Popular] Concluído com sucesso.');
    process.exit(0);
  } catch (err) {
    console.error('[Popular] Erro:', err);
    process.exit(1);
  }
}

main();


