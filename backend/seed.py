from werkzeug.security import generate_password_hash # gera o hash da senha (o Werkzeug veio junto com o Flask)

from database import conectar, criar_tabelas # reaproveita as funções do database.py

# Alunos e professores de mentira, só para demonstração: (identificador, nome, senha, perfil)
USUARIOS = [
    ("RGA2026001", "Pedro H Maranhão", "aluno123", "aluno"),
    ("RGA2026002", "Lucas Ferreira", "aluno123", "aluno"),
    ("RGP2026001", "Carlos Mendes", "prof123", "professor"),
    ("RGP2026002", "Rafael Lima", "prof123", "professor"),
    ("RGC2026001", "Rafaela de Souza", "coord123", "coordenacao"),
    ("RGR2026001", "Juliana Ribery", "recep123", "recepcao"),
]

# Os mesmos cursos que aparecem em graduacoes.html: (nome, descrição)
CURSOS = [
    ("Análise e Desenvolvimento de Sistemas", "Desenvolvimento de software, aplicações e soluções digitais."),
    ("Ciência da Computação", "Algoritmos, programação, inteligência artificial e computação."),
    ("Sistemas de Informação", "Tecnologia, dados e processos para organizações."),
    ("Redes de Computadores", "Infraestrutura, conectividade e administração de redes."),
    ("Segurança da Informação", "Proteção de sistemas, dados e ambientes digitais."),
    ("Jogos Digitais", "Criação de jogos, experiências interativas e protótipos."),
    ("Engenharia de Software", "Arquitetura, qualidade e gestão do ciclo de desenvolvimento."),
    ("Inteligência Artificial e Dados", "Dados, automação e aplicações inteligentes."),
]


def popular():
    criar_tabelas() # garante que as tabelas existem antes de inserir
    conexao = conectar()
    for nome, descricao in CURSOS:
        conexao.execute(
            "INSERT OR IGNORE INTO cursos (nome, descricao) VALUES (?, ?)", # OR IGNORE: se já existir, pula
            (nome, descricao),
        )
    for identificador, nome, senha, perfil in USUARIOS:
        conexao.execute(
            "INSERT OR IGNORE INTO usuarios (identificador, nome, senha_hash, perfil) VALUES (?, ?, ?, ?)",
            (identificador, nome, generate_password_hash(senha), perfil), # guarda o hash, nunca a senha
        )
    conexao.commit() # confirma as mudanças: sem isso, nada fica salvo
    conexao.close()
    print("Banco pronto:", len(USUARIOS), "usuários e", len(CURSOS), "cursos.")


if __name__ == "__main__":
    popular()