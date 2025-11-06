exports.seed = async function(knex) {
  // Limpar tabelas existentes
  await knex('auditoria').del();
  await knex('ultimo_conselho').del();
  await knex('notificacoes_email').del();
  await knex('editais').del();
  await knex('cedulas').del();
  await knex('sorteio_jurados').del();
  await knex('sorteios').del();
  await knex('indicacoes').del();
  await knex('jurados').del();
  await knex('instituicoes').del();
  await knex('juizes').del();
  await knex('usuarios').del();

  // Inserir dados de exemplo
  await knex('usuarios').insert([
    {
      id: 1,
      nome: 'ADMINISTRADOR',
      email: 'admin@tjsc.jus.br',
      senha_hash: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
      perfil: 'admin',
      matricula: 'ADM001',
      telefone: '(48) 99999-9999',
      cargo: 'Administrador do Sistema'
    }
  ]);

  await knex('juizes').insert([
    {
      id: 1,
      nome_completo: 'DR. JOÃO SILVA SANTOS',
      matricula: '1234567',
      sexo: 'Masculino',
      vara: 'Vara Única',
      comarca: 'Capivari de Baixo',
      email: 'joao.santos@tjsc.jus.br',
      titular: 'Sim'
    }
  ]);

  await knex('instituicoes').insert([
    {
      id: 1,
      nome: 'PREFEITURA MUNICIPAL DE CAPIVARI DE BAIXO',
      cnpj: '12.345.678/0001-90',
      contato_nome: 'SR. PREFEITO',
      contato_email: 'prefeito@capivaridebaixo.sc.gov.br',
      contato_telefone: '(48) 3645-1234',
      endereco: 'RUA DA REPÚBLICA, 123',
      cidade: 'Capivari de Baixo',
      uf: 'SC',
      cep: '88745-000',
      ativo: 'Sim',
      quantidade: 15
    },
    {
      id: 2,
      nome: 'CÂMARA MUNICIPAL DE CAPIVARI DE BAIXO',
      cnpj: '98.765.432/0001-10',
      contato_nome: 'SR. PRESIDENTE',
      contato_email: 'presidente@camaracapivari.sc.gov.br',
      contato_telefone: '(48) 3645-5678',
      endereco: 'RUA DA LIBERDADE, 456',
      cidade: 'Capivari de Baixo',
      uf: 'SC',
      cep: '88745-000',
      ativo: 'Sim',
      quantidade: 10
    },
    {
      id: 3,
      nome: 'ASSOCIAÇÃO COMERCIAL E INDUSTRIAL',
      cnpj: '11.222.333/0001-44',
      contato_nome: 'SR. PRESIDENTE',
      contato_email: 'presidente@acicapivari.com.br',
      contato_telefone: '(48) 3645-9999',
      endereco: 'AV. CENTRAL, 789',
      cidade: 'Capivari de Baixo',
      uf: 'SC',
      cep: '88745-000',
      ativo: 'Sim',
      quantidade: 8
    },
    {
      id: 4,
      nome: 'SINDICATO DOS TRABALHADORES RURAIS',
      cnpj: '55.666.777/0001-88',
      contato_nome: 'SR. PRESIDENTE',
      contato_email: 'presidente@strcapivari.org.br',
      contato_telefone: '(48) 3645-7777',
      endereco: 'RUA RURAL, S/N',
      cidade: 'Capivari de Baixo',
      uf: 'SC',
      cep: '88745-000',
      ativo: 'Sim',
      quantidade: 12
    },
    {
      id: 5,
      nome: 'IGREJA MATRIZ SÃO JOÃO BATISTA',
      contato_nome: 'PADRE JOÃO',
      contato_email: 'paroquia@igrejasaocapivari.org.br',
      contato_telefone: '(48) 3645-1111',
      endereco: 'PRAÇA DA MATRIZ, S/N',
      cidade: 'Capivari de Baixo',
      uf: 'SC',
      cep: '88745-000',
      ativo: 'Sim',
      quantidade: 20
    }
  ]);

  // Gerar 50 jurados de exemplo
  const jurados = [];
  const nomes = [
    'MARIA SILVA SANTOS', 'JOÃO PEDRO OLIVEIRA', 'ANA PAULA COSTA', 'CARLOS ALBERTO LIMA',
    'FERNANDA RODRIGUES', 'RICARDO MENDES', 'JULIANA FERREIRA', 'ANTONIO CARLOS SILVA',
    'PATRICIA SOUZA', 'MARCOS VINICIUS', 'LUCIA HELENA', 'ROBERTO SANTOS',
    'CARMEN LUCIA', 'JOSE CARLOS', 'MARIA HELENA', 'PEDRO PAULO',
    'ANA MARIA', 'CARLOS EDUARDO', 'FERNANDA MARIA', 'RICARDO JOSE',
    'JULIANA CAROLINA', 'ANTONIO JOSE', 'PATRICIA MARIA', 'MARCOS ANTONIO',
    'LUCIA MARIA', 'ROBERTO CARLOS', 'CARMEN MARIA', 'JOSE ANTONIO',
    'MARIA APARECIDA', 'PEDRO CARLOS', 'ANA CAROLINA', 'CARLOS ROBERTO',
    'FERNANDA CAROLINA', 'RICARDO ANTONIO', 'JULIANA MARIA', 'ANTONIO CARLOS',
    'PATRICIA CAROLINA', 'MARCOS CARLOS', 'LUCIA CAROLINA', 'ROBERTO ANTONIO',
    'CARMEN CAROLINA', 'JOSE CARLOS', 'MARIA CAROLINA', 'PEDRO ANTONIO',
    'ANA APARECIDA', 'CARLOS ANTONIO', 'FERNANDA APARECIDA', 'RICARDO CARLOS',
    'JULIANA APARECIDA', 'ANTONIO ROBERTO'
  ];

  const profissoes = [
    'COMERCIANTE', 'AGRICULTOR', 'APOSENTADO', 'FUNCIONÁRIO PÚBLICO',
    'PROFESSOR', 'MÉDICO', 'ENGENHEIRO', 'ADVOGADO', 'CONTADOR',
    'VETERINÁRIO', 'FARMACÊUTICO', 'DENTISTA', 'ENFERMEIRO',
    'TÉCNICO', 'MOTORISTA', 'PEDREIRO', 'CARPINTEIRO', 'ELETRICISTA',
    'MECÂNICO', 'BARBEIRO', 'COZINHEIRO', 'GARÇOM', 'VENDEDOR',
    'RECEPCIONISTA', 'SECRETÁRIO', 'AUXILIAR ADMINISTRATIVO'
  ];

  for (let i = 0; i < 50; i++) {
    const cpf = `${String(Math.floor(Math.random() * 900) + 100)}.${String(Math.floor(Math.random() * 900) + 100)}.${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 90) + 10)}`;
    const telefone = `(48) 9${String(Math.floor(Math.random() * 9000) + 1000)}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    
    jurados.push({
      nome_completo: nomes[i],
      cpf: cpf,
      rg: `${String(Math.floor(Math.random() * 9000000) + 1000000)}`,
      data_nascimento: new Date(1950 + Math.floor(Math.random() * 50), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
      sexo: Math.random() > 0.5 ? 'Masculino' : 'Feminino',
      endereco: `RUA ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
      numero: String(Math.floor(Math.random() * 9999) + 1),
      complemento: Math.random() > 0.7 ? 'CASA' : null,
      bairro: `BAIRRO ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
      cidade: 'Capivari de Baixo',
      uf: 'SC',
      cep: '88745-000',
      email: Math.random() > 0.5 ? `email${i}@exemplo.com` : null,
      telefone: telefone,
      profissao: profissoes[Math.floor(Math.random() * profissoes.length)],
      observacoes: Math.random() > 0.8 ? 'OBSERVAÇÃO IMPORTANTE' : null,
      status: 'Ativo'
    });
  }

  await knex('jurados').insert(jurados);
};
