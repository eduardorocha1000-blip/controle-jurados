-- Schema SQL para Cloudflare D1 - Comandos Individuais
-- Copie e cole CADA comando separadamente no Console do D1

-- ============================================
-- COMANDO 1: Tabela de usuários
-- ============================================
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL,
    perfil TEXT DEFAULT 'servidor',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- COMANDO 2: Tabela de juízes
-- ============================================
CREATE TABLE IF NOT EXISTS juizes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome_completo TEXT NOT NULL,
    matricula TEXT,
    sexo TEXT NOT NULL CHECK(sexo IN ('Masculino', 'Feminino')),
    vara TEXT DEFAULT 'Vara Única',
    comarca TEXT DEFAULT 'Capivari de Baixo',
    email TEXT,
    titular TEXT DEFAULT 'Não' CHECK(titular IN ('Sim', 'Não')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- COMANDO 3: Tabela de instituições
-- ============================================
CREATE TABLE IF NOT EXISTS instituicoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cnpj TEXT,
    contato_nome TEXT DEFAULT 'Sr.(a). Diretor' NOT NULL,
    contato_email TEXT NOT NULL,
    contato_telefone TEXT,
    endereco TEXT,
    cidade TEXT DEFAULT 'Capivari de Baixo',
    uf TEXT DEFAULT 'SC',
    cep TEXT DEFAULT '88745-000',
    ativo TEXT DEFAULT 'Sim' NOT NULL CHECK(ativo IN ('Sim', 'Não')),
    quantidade INTEGER DEFAULT 10 CHECK(quantidade >= 1 AND quantidade <= 99),
    observacoes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- COMANDO 4: Tabela de jurados
-- ============================================
CREATE TABLE IF NOT EXISTS jurados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome_completo TEXT NOT NULL,
    cpf TEXT NOT NULL UNIQUE,
    rg TEXT,
    data_nascimento DATE,
    sexo TEXT NOT NULL CHECK(sexo IN ('Masculino', 'Feminino')),
    endereco TEXT NOT NULL,
    numero TEXT NOT NULL,
    complemento TEXT,
    bairro TEXT NOT NULL,
    cidade TEXT DEFAULT 'Capivari de Baixo' NOT NULL,
    uf TEXT DEFAULT 'SC' NOT NULL,
    cep TEXT DEFAULT '88745-000' NOT NULL,
    email TEXT,
    telefone TEXT,
    profissao TEXT NOT NULL,
    observacoes TEXT,
    status TEXT DEFAULT 'Ativo' CHECK(status IN ('Ativo', 'Inativo')),
    motivo TEXT CHECK(motivo IN ('Outra Comarca', 'Falecido', 'Incapacitado', '12 meses', 'Impedimento', 'Idade', 'Temporário')),
    suspenso_ate DATE,
    ultimo_conselho DATE,
    instituicao_id INTEGER REFERENCES instituicoes(id) ON DELETE SET NULL,
    foto_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- COMANDO 5: Tabela de indicações
-- ============================================
CREATE TABLE IF NOT EXISTS indicacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instituicao_id INTEGER REFERENCES instituicoes(id) ON DELETE CASCADE,
    ano_referencia INTEGER NOT NULL,
    arquivo_lista TEXT,
    status TEXT DEFAULT 'pendente' CHECK(status IN ('pendente', 'recebida', 'validada')),
    observacoes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- COMANDO 6: Tabela de sorteios
-- ============================================
CREATE TABLE IF NOT EXISTS sorteios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ano_referencia INTEGER NOT NULL,
    data_realizacao DATE NOT NULL,
    juiz_responsavel_id INTEGER REFERENCES juizes(id) ON DELETE SET NULL,
    data_juri DATE NOT NULL,
    hora_juri TIME NOT NULL,
    observacoes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- COMANDO 7: Tabela de sorteio_jurados
-- ============================================
CREATE TABLE IF NOT EXISTS sorteio_jurados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sorteio_id INTEGER NOT NULL REFERENCES sorteios(id) ON DELETE CASCADE,
    jurado_id INTEGER NOT NULL REFERENCES jurados(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK(status IN ('titular', 'suplente')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- COMANDO 8: Tabela de cédulas
-- ============================================
CREATE TABLE IF NOT EXISTS cedulas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sorteio_id INTEGER NOT NULL REFERENCES sorteios(id) ON DELETE CASCADE,
    jurado_id INTEGER NOT NULL REFERENCES jurados(id) ON DELETE CASCADE,
    codigo_barras TEXT,
    numero_sequencial INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- COMANDO 9: Tabela de editais
-- ============================================
CREATE TABLE IF NOT EXISTS editais (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ano_referencia INTEGER NOT NULL,
    numero TEXT NOT NULL,
    titulo TEXT NOT NULL,
    corpo_rtf TEXT,
    data_publicacao_prevista DATE,
    data_publicacao_real DATE,
    arquivo_rtf_gerado TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- COMANDO 10: Tabela de notificações de email
-- ============================================
CREATE TABLE IF NOT EXISTS notificacoes_email (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instituicao_id INTEGER REFERENCES instituicoes(id) ON DELETE CASCADE,
    assunto TEXT NOT NULL,
    corpo_html TEXT,
    corpo_texto TEXT,
    enviado_em DATETIME,
    status TEXT DEFAULT 'enviado' CHECK(status IN ('enviado', 'erro')),
    resposta_servidor TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- COMANDO 11: Tabela de último conselho
-- ============================================
CREATE TABLE IF NOT EXISTS ultimo_conselho (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sorteio_id INTEGER NOT NULL REFERENCES sorteios(id) ON DELETE CASCADE,
    jurado_id INTEGER NOT NULL REFERENCES jurados(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- COMANDO 12: Tabela de auditoria
-- ============================================
CREATE TABLE IF NOT EXISTS auditoria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    tabela TEXT NOT NULL,
    acao TEXT NOT NULL,
    registro_id INTEGER,
    dados_anteriores TEXT,
    dados_novos TEXT,
    ip TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- COMANDO 13: Índices (pode executar todos juntos)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_jurados_cpf ON jurados(cpf);
CREATE INDEX IF NOT EXISTS idx_jurados_status ON jurados(status);
CREATE INDEX IF NOT EXISTS idx_jurados_instituicao ON jurados(instituicao_id);
CREATE INDEX IF NOT EXISTS idx_sorteios_ano ON sorteios(ano_referencia);
CREATE INDEX IF NOT EXISTS idx_indicacoes_ano ON indicacoes(ano_referencia);

-- ============================================
-- COMANDO 14: Criar primeiro usuário (opcional)
-- ============================================
-- Descomente e ajuste o email e hash da senha:
-- INSERT INTO usuarios (nome, email, senha_hash, perfil)
-- VALUES ('Administrador', 'seu-email@exemplo.com', 'hash-temporario', 'Administrador');

