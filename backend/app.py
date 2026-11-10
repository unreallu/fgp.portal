import csv
import io
import os # acessa as variáveis de ambiente do sistema
import posixpath # funções para lidar com caminhos no formato dos endereços web
import re # "expressões regulares": procura padrões em textos (usado no e-mail e no celular)

from flask import Flask, Response, redirect, request, session # request = o pedido que chegou; session = a memória do login
from werkzeug.security import check_password_hash # confere a senha digitada contra o hash guardado

from database import conectar # a função que abre o banco, do seu database.py

app = Flask(__name__, static_folder="../frontend", static_url_path="") #Cria o servidor e guarda na variável app

# Chave secreta que "assina" o cookie do login, para ninguém conseguir falsificar uma sessão.
# Ela vem de uma variável de ambiente; o texto depois da vírgula serve só para testar no seu computador.
app.secret_key = os.environ.get("FGP_SECRET_KEY", "chave-so-para-desenvolvimento")
app.config["SESSION_COOKIE_SAMESITE"] = "Lax" # o cookie do login não vai junto em formulários de outros sites

PAGINAS_PROTEGIDAS = { # página: perfil exigido
    "aluno.html": "aluno",
    "professor.html": "professor",
    "coordenacao.html": "coordenacao",
    "recepcao.html": "recepcao",
}
DESTINOS = { # perfil: página para onde o login leva
    "aluno": "/aluno.html",
    "professor": "/professor.html",
    "coordenacao": "/coordenacao.html",
    "recepcao": "/recepcao.html",
}
PERFIS_CADASTROS = {"recepcao", "coordenacao"} # quem pode ver a lista de interessados
TURNOS = {"EAD", "Manhã", "Tarde", "Noite"} # os únicos turnos aceitos
EMAIL_VALIDO = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$") # algo@algo.algo, sem espaços


# ---------- O porteiro ----------

@app.before_request # roda ANTES de todo pedido, como um porteiro na entrada
def proteger_paineis():
    caminho = posixpath.normpath(request.path) # endireita caminhos tortos: "/css/../aluno.html/" vira "/aluno.html"
    arquivo = posixpath.basename(caminho).lower() # fica só o nome do arquivo: "aluno.html"
    perfil_exigido = PAGINAS_PROTEGIDAS.get(arquivo) # None quando a página não é protegida
    if perfil_exigido and session.get("perfil") != perfil_exigido:
        return redirect("/login.html") # responder aqui faz o pedido parar no porteiro


# ---------- Páginas ----------

@app.route("/") # é o 'decorador': diz que a função abaixo responde ao endereço "/" (página inicial)
def inicio(): #função que roda quando alguém acessa "/"
    return app.send_static_file("index.html") # entrega o arquivo index.html da pasta frontend


# ---------- API do login ----------

@app.route("/api/login", methods=["POST"]) # só aceita POST: senha nunca vai no endereço
def login():
    dados = request.get_json(silent=True) or {} # lê o JSON enviado pelo app.js (ou um dicionário vazio)
    identificador = str(dados.get("identificador", "")).strip().upper() # "rga2026001" vira "RGA2026001"
    senha = str(dados.get("senha", ""))

    if not identificador or not senha:
        return {"erro": "Preencha o RGA/RGP e a senha."}, 400

    conexao = conectar()
    usuario = conexao.execute(
        "SELECT id, nome, senha_hash, perfil FROM usuarios WHERE identificador = ?", # o ? evita injeção de SQL
        (identificador,), # a vírgula faz disto uma tupla de um item só
    ).fetchone() # pega a linha encontrada, ou None se não achou
    conexao.close()

    if usuario is None or not check_password_hash(usuario["senha_hash"], senha):
        return {"erro": "RGA/RGP ou senha incorretos."}, 401 # mesma mensagem nos dois casos, de propósito

    session.clear() # apaga qualquer login antigo
    session["usuario_id"] = usuario["id"] # o Flask guarda isto num cookie assinado, no navegador
    session["nome"] = usuario["nome"]
    session["perfil"] = usuario["perfil"]

    destino = DESTINOS[usuario["perfil"]] # ex.: "recepcao" vira "/recepcao.html"
    return {"nome": usuario["nome"], "perfil": usuario["perfil"], "destino": destino}


@app.route("/api/me") # "eu": quem está logado agora?
def quem_sou_eu():
    if "usuario_id" not in session:
        return {"erro": "Faça login para continuar."}, 401
    return {"nome": session["nome"], "perfil": session["perfil"]}


@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear() # esquece o login
    return {"mensagem": "Você saiu da sua conta."}


# ---------- API do cadastro de interessados ----------

@app.route("/api/interessados", methods=["POST"])
def cadastrar_interessado():
    dados = request.get_json(silent=True) or {}
    nome = str(dados.get("nome", "")).strip()
    celular = re.sub(r"\D", "", str(dados.get("celular", ""))) # deixa só os números: "(11) 9..." vira "119..."
    email = str(dados.get("email", "")).strip().lower()
    curso = str(dados.get("curso", "")).strip()
    turno = str(dados.get("turno", "")).strip()
    consentimento = dados.get("consentimento") is True # só vale se a caixa foi marcada de verdade

    erros = {} # cada campo com problema ganha uma mensagem clara
    if not nome or len(nome) > 100:
        erros["nome"] = "Informe seu nome completo."
    if len(celular) not in (10, 11):
        erros["celular"] = "Informe o celular com DDD, como (11) 91234-5678."
    if not EMAIL_VALIDO.match(email):
        erros["email"] = "Informe um e-mail válido, como nome@exemplo.com."
    if turno not in TURNOS:
        erros["turno"] = "Escolha um turno: EAD, Manhã, Tarde ou Noite."
    if not consentimento:
        erros["consentimento"] = "Marque a caixa de consentimento para podermos entrar em contato."

    conexao = conectar()
    curso_id = None # vazio = "ainda estou decidindo"
    if curso and curso != "Ainda estou decidindo":
        linha = conexao.execute("SELECT id FROM cursos WHERE nome = ?", (curso,)).fetchone()
        if linha is None:
            erros["curso"] = "Escolha um curso da lista."
        else:
            curso_id = linha["id"]

    if erros:
        conexao.close()
        return {"erros": erros}, 400 # 400 = quem enviou mandou algo errado

    conexao.execute(
        "INSERT INTO interessados (nome, celular, email, curso_id, turno, consentimento) VALUES (?, ?, ?, ?, ?, 1)",
        (nome, celular, email, curso_id, turno),
    )
    conexao.commit() # confirma a gravação: sem isso, nada fica salvo
    conexao.close()
    primeiro_nome = nome.split()[0]
    return {"mensagem": f"Obrigado, {primeiro_nome}! Recebemos seu interesse e entraremos em contato."}, 201


# ---------- Lista de interessados (recepção e coordenação) ----------

def buscar_interessados():
    conexao = conectar()
    linhas = conexao.execute(
        """SELECT interessados.nome, celular, email, cursos.nome AS curso, turno, criado_em
           FROM interessados
           LEFT JOIN cursos ON cursos.id = interessados.curso_id
           ORDER BY criado_em DESC""" # LEFT JOIN: traz o nome do curso, e mantém quem ainda está decidindo
    ).fetchall()
    conexao.close()
    return [dict(linha) for linha in linhas] # cada linha vira um dicionário comum


@app.route("/api/interessados", methods=["GET"]) # GET = ler; o POST lá em cima é para gravar
def listar_interessados():
    if session.get("perfil") not in PERFIS_CADASTROS:
        return {"erro": "Somente a recepção e a coordenação podem ver os cadastros."}, 403 # 403 = proibido
    return {"interessados": buscar_interessados()}


@app.route("/api/interessados.csv")
def baixar_interessados():
    if session.get("perfil") not in PERFIS_CADASTROS:
        return {"erro": "Somente a recepção e a coordenação podem baixar os cadastros."}, 403
    arquivo = io.StringIO() # o "arquivo de mentira" na memória
    escritor = csv.writer(arquivo, delimiter=";") # ponto e vírgula: o Excel em português separa as colunas assim
    escritor.writerow(["Nome", "Celular", "E-mail", "Curso", "Turno", "Cadastrado em"]) # cabeçalho
    for pessoa in buscar_interessados():
        escritor.writerow([pessoa["nome"], pessoa["celular"], pessoa["email"],
                           pessoa["curso"] or "Ainda decidindo", pessoa["turno"], pessoa["criado_em"]])
    return Response(
        "﻿" + arquivo.getvalue(), # ﻿ avisa o Excel que o texto tem acentos (UTF-8)
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=cadastros-fgp.csv"}, # faz o navegador baixar
    )

# ---------- Rotas de estudo (Aula 1) ----------

@app.route("/sobre")
def sobre():
    return "Backend da FGP em construção!"

@app.route("/api/status")
def status():
    return {"status": "ok", "projeto": "FGP"}