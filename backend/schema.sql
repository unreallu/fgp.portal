CREATE TABLE IF NOT EXISTS cursos (          -- cria a tabela, só se ela ainda não existir
    id INTEGER PRIMARY KEY AUTOINCREMENT,    -- número inteiro, chave única, que o banco preenche sozinho (1, 2, 3...)
    nome TEXT NOT NULL UNIQUE,               -- texto, obrigatório (NOT NULL), sem repetir (UNIQUE)
    descricao TEXT                           -- texto opcional (sem NOT NULL, pode ficar vazio)
);

CREATE TABLE IF NOT EXISTS usuarios(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identificador TEXT not null unique,
    nome TEXT NOT NULL,
    senha_hash TEXT not null,
    perfil TEXT NOT NULL CHECK (perfil in ('aluno', 'professor', 'coordenacao', 'recepcao'))
);

CREATE TABLE IF NOT EXISTS interessados(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    celular TEXT NOT NULL,  -- somente os números, com DDD
    email TEXT NOT NULL,
    curso_id INTEGER REFERENCES cursos (id), -- aponta para um curso; vazio = "ainda estou me decidindo"
    turno TEXT NOT NULL CHECK (turno in ('EAD', 'Manhã', 'Tarde', 'Noite')),
    consentimento INTEGER NOT NULL CHECK (consentimento = 1), -- 1 = a pessoa autorizou o contato
    criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP  -- data e hora do cadastro, preenchidas pelo banco
);
