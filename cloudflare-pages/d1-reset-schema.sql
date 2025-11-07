-- Reinicia completamente o schema do banco D1 para ficar idêntico ao projeto Express original
-- ATENÇÃO: isso remove todos os dados existentes. Execute apenas se tiver backup.

PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS auditoria;
DROP TABLE IF EXISTS ultimo_conselho;
DROP TABLE IF EXISTS notificacoes_email;
DROP TABLE IF EXISTS editais;
DROP TABLE IF EXISTS cedulas;
DROP TABLE IF EXISTS sorteio_jurados;
DROP TABLE IF EXISTS sorteios;
DROP TABLE IF EXISTS indicacoes;
DROP TABLE IF EXISTS jurados;
DROP TABLE IF EXISTS instituicoes;
DROP TABLE IF EXISTS juizes;
DROP TABLE IF EXISTS usuarios;

CREATE TABLE usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL,
    perfil TEXT DEFAULT 'servidor',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE juizes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome_completo TEXT NOT NULL,
    matricula TEXT,
    sexo TEXT CHECK (sexo IN ('Masculino','Feminino')) NOT NULL,
    vara TEXT DEFAULT 'Vara Única',
    comarca TEXT DEFAULT 'Capivari de Baixo',
    email TEXT,
    titular TEXT CHECK (titular IN ('Sim','Não')) DEFAULT 'Não',
    telefone TEXT,
    status TEXT CHECK (status IN ('Ativo','Inativo')) DEFAULT 'Ativo',
    observacoes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE instituicoes (
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
    ativo TEXT CHECK (ativo IN ('Sim','Não')) NOT NULL DEFAULT 'Sim',
    quantidade INTEGER DEFAULT 10 CHECK (quantidade BETWEEN 1 AND 99),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE jurados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome_completo TEXT NOT NULL,
    cpf TEXT NOT NULL UNIQUE,
    rg TEXT,
    data_nascimento DATE,
    sexo TEXT CHECK (sexo IN ('Masculino','Feminino')) NOT NULL,
    endereco TEXT NOT NULL,
    numero TEXT NOT NULL,
    complemento TEXT,
    bairro TEXT NOT NULL,
    cidade TEXT NOT NULL DEFAULT 'Capivari de Baixo',
    uf TEXT NOT NULL DEFAULT 'SC',
    cep TEXT NOT NULL DEFAULT '88745-000',
    email TEXT,
    telefone TEXT,
    profissao TEXT NOT NULL,
    observacoes TEXT,
    status TEXT CHECK (status IN ('Ativo','Inativo')) DEFAULT 'Ativo',
    motivo TEXT CHECK (motivo IN ('Outra Comarca','Falecido','Incapacitado','12 meses','Impedimento','Idade','Temporário')),
    suspenso_ate DATE,
    ultimo_conselho DATE,
    instituicao_id INTEGER REFERENCES instituicoes(id) ON DELETE SET NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE indicacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instituicao_id INTEGER REFERENCES instituicoes(id) ON DELETE CASCADE,
    ano_referencia INTEGER NOT NULL,
    arquivo_lista TEXT,
    status TEXT CHECK (status IN ('pendente','recebida','validada')) DEFAULT 'pendente',
    observacoes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sorteios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ano_referencia INTEGER NOT NULL,
    data_realizacao DATE NOT NULL,
    juiz_responsavel_id INTEGER REFERENCES juizes(id) ON DELETE SET NULL,
    data_juri DATE NOT NULL,
    hora_juri TIME NOT NULL,
    local_sorteio TEXT,
    numero_processo TEXT,
    status TEXT CHECK (status IN ('Agendado','Realizado','Cancelado')) DEFAULT 'Agendado',
    observacoes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sorteio_jurados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sorteio_id INTEGER REFERENCES sorteios(id) ON DELETE CASCADE,
    jurado_id INTEGER REFERENCES jurados(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('titular','suplente')) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cedulas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sorteio_id INTEGER REFERENCES sorteios(id) ON DELETE CASCADE,
    jurado_id INTEGER REFERENCES jurados(id) ON DELETE CASCADE,
    codigo_barras TEXT,
    numero_sequencial INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE editais (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ano_referencia INTEGER NOT NULL,
    numero TEXT NOT NULL,
    titulo TEXT NOT NULL,
    corpo_rtf TEXT,
    data_publicacao_prevista DATE,
    data_publicacao_real DATE,
    arquivo_rtf_gerado TEXT,
    juiz_id INTEGER REFERENCES juizes(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'rascunho',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notificacoes_email (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instituicao_id INTEGER REFERENCES instituicoes(id) ON DELETE CASCADE,
    assunto TEXT NOT NULL,
    corpo_html TEXT,
    corpo_texto TEXT,
    enviado_em DATETIME,
    status TEXT CHECK (status IN ('enviado','erro')) DEFAULT 'enviado',
    resposta_servidor TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ultimo_conselho (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sorteio_id INTEGER REFERENCES sorteios(id) ON DELETE CASCADE,
    jurado_id INTEGER REFERENCES jurados(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE auditoria (
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

PRAGMA foreign_keys = ON;

