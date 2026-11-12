/* ==========================================================
   FGP — Interações do protótipo
   Comentários em português para facilitar a manutenção.
   ========================================================== */
document.addEventListener('DOMContentLoaded', () => {
  // Abre e fecha o menu principal em telas pequenas.
  document.querySelectorAll('.menu-toggle').forEach((button) => {
    button.addEventListener('click', () => {
      const isPortal = document.body.classList.contains('portal-page');
      const menu = isPortal ? document.querySelector('.portal-sidebar') : document.querySelector('.main-nav');
      if (!menu) return;
      const opened = menu.classList.toggle(isPortal ? 'open' : 'open');
      button.setAttribute('aria-expanded', String(opened));
    });
  });

  // Login de verdade: envia o RGA/RGP e a senha para o backend conferir no banco.
  const loginForm = document.querySelector('#login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault(); // impede o navegador de recarregar a página
      const identificador = document.querySelector('#login-id').value.trim();
      const senha = document.querySelector('#login-password').value;
      const message = document.querySelector('#login-message');
      if (!identificador || !senha) {
        message.textContent = 'Preencha o identificador e a senha para continuar.';
        return;
      }
      message.textContent = 'Verificando seus dados…';
      try {
        const resposta = await fetch('/api/login', { // faz o pedido POST para a rota do app.py
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }, // avisa que o corpo é JSON
          body: JSON.stringify({ identificador, senha }), // transforma o objeto em texto JSON
        });
        const dados = await resposta.json(); // lê a resposta do backend
        if (!resposta.ok) { // ok = status 200 a 299
          message.textContent = dados.erro; // ex.: "RGA/RGP ou senha incorretos."
          return;
        }
        message.textContent = `Bem-vindo, ${dados.nome}! Abrindo seu portal…`;
        window.location.href = dados.destino; // vai para /aluno.html ou /professor.html
      } catch (erro) {
        message.textContent = 'Não foi possível falar com o servidor. Ele está ligado?';
      }
    });
  }

  // Painéis: pergunta ao backend quem está logado, mostra o nome e prepara o botão de sair.
  if (document.body.classList.contains('portal-page')) {
    const mostrarUsuario = async () => {
      const resposta = await fetch('/api/me');
      if (!resposta.ok) {
        window.location.href = '/login.html'; // sem login: volta para a tela de acesso
        return;
      }
      const usuario = await resposta.json();
      document.querySelectorAll('.user-menu strong').forEach((campo) => { campo.textContent = usuario.nome; });
      const titulo = document.querySelector('.portal-welcome h1');
      if (titulo) titulo.textContent = `${usuario.nome}!`;
      const avatar = document.querySelector('.avatar');
      if (avatar) avatar.textContent = usuario.nome.charAt(0); // a inicial do nome no círculo
    };
    mostrarUsuario();

    document.querySelectorAll('.logout-link, .logout-small').forEach((link) => {
      link.addEventListener('click', async (event) => {
        event.preventDefault();
        await fetch('/api/logout', { method: 'POST' }); // o backend apaga a sessão
        window.location.href = '/login.html';
      });
    });
  }

  // Alterna a visualização da senha no formulário de login.
  const passwordToggle = document.querySelector('.password-toggle');
  if (passwordToggle) {
    passwordToggle.addEventListener('click', () => {
      const input = document.querySelector('#login-password');
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      passwordToggle.textContent = show ? '◎' : '◉';
      passwordToggle.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha');
    });
  }

  // Abre caixas de ajuda e recuperação de senha.
  document.querySelectorAll('[data-dialog]').forEach((button) => {
    button.addEventListener('click', () => document.getElementById(button.dataset.dialog)?.showModal());
  });
  document.querySelectorAll('[data-close-dialog]').forEach((button) => {
    button.addEventListener('click', () => button.closest('dialog')?.close());
  });
  document.querySelectorAll('dialog').forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
  });

  // Abre e fecha a lista de graduações.
  const courseToggle = document.querySelector('#course-toggle');
  if (courseToggle) {
    courseToggle.addEventListener('click', () => {
      const list = document.querySelector('#course-list');
      const isOpen = list.hidden;
      list.hidden = !isOpen;
      courseToggle.setAttribute('aria-expanded', String(isOpen));
      courseToggle.innerHTML = isOpen ? '−　Ocultar cursos de graduação　↑' : '♧　Ver todos os cursos de graduação　→';
      if (isOpen) list.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  // Preenche o curso escolhido no formulário de captação de interessados.
  document.querySelectorAll('.choose-course').forEach((button) => {
    button.addEventListener('click', () => {
      const courseInput = document.querySelector('#lead-course');
      if (courseInput) {
        courseInput.value = button.dataset.course || '';
        document.querySelector('#fale-conosco')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        courseInput.focus({ preventScroll: true });
      }
    });
  });

  // Máscara simples de telefone brasileiro para o formulário de contato.
  const phoneInput = document.querySelector('#lead-phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', () => {
      let digits = phoneInput.value.replace(/\D/g, '').slice(0, 11);
      if (digits.length > 10) digits = digits.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3');
      else if (digits.length > 6) digits = digits.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
      else if (digits.length > 2) digits = digits.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
      else if (digits.length > 0) digits = digits.replace(/^(\d*)/, '($1');
      phoneInput.value = digits;
    });
  }

  // Cadastro de interessados: envia os dados para o backend validar e salvar no banco.
  const leadForm = document.querySelector('#lead-form');
  if (leadForm) {
    const campos = { // qual campo do formulário corresponde a cada erro que o backend pode devolver
      nome: '#lead-name', celular: '#lead-phone', email: '#lead-email',
      curso: '#lead-course', turno: 'input[name="turno"]', consentimento: '#lead-consent',
    };
    leadForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!leadForm.reportValidity()) return; // o navegador confere os campos obrigatórios primeiro
      const message = document.querySelector('#lead-message');
      leadForm.querySelectorAll('[aria-invalid]').forEach((campo) => campo.removeAttribute('aria-invalid'));
      const dados = {
        nome: document.querySelector('#lead-name').value,
        celular: document.querySelector('#lead-phone').value,
        email: document.querySelector('#lead-email').value,
        curso: document.querySelector('#lead-course').value,
        turno: leadForm.querySelector('input[name="turno"]:checked')?.value || '',
        consentimento: document.querySelector('#lead-consent').checked, // true ou false
      };
      message.textContent = 'Enviando…';
      try {
        const resposta = await fetch('/api/interessados', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dados),
        });
        const corpo = await resposta.json();
        if (!resposta.ok) {
          Object.keys(corpo.erros).forEach((chave) => {
            leadForm.querySelector(campos[chave])?.setAttribute('aria-invalid', 'true'); // leitores de tela anunciam "inválido"
          });
          message.textContent = Object.values(corpo.erros).join(' '); // todas as mensagens, em texto
          leadForm.querySelector('[aria-invalid="true"]')?.focus(); // leva o foco ao primeiro campo com erro
          return;
        }
        message.textContent = corpo.mensagem; // "Obrigado, Maria! ..."
        leadForm.reset();
      } catch (erro) {
        message.textContent = 'Não foi possível enviar agora. Confira se o servidor está ligado e tente de novo.';
      }
    });
  }

  // Navegação interna nos painéis de aluno e professor.
  const dashboardCards = document.querySelectorAll('[data-section]');
  const homeSection = document.querySelector('.portal-section#inicio');
  const detailSection = document.querySelector('#detail-section');
  const welcome = document.querySelector('#portal-welcome');
  const detailTitle = document.querySelector('#detail-title');
  const detailDescription = document.querySelector('#detail-description');
  const detailContent = document.querySelector('#detail-content');
  const backHome = document.querySelector('#back-home');

  const sectionData = {
    avaliacoes: { title: 'Minhas avaliações', description: 'Consulte prazos e acompanhe os resultados das suas avaliações.', cards: [['Próxima avaliação', 'Fundamentos de Programação — 20/10/2026', 'Confira as datas no calendário acadêmico.'], ['Avaliações anteriores', 'Nenhum resultado real conectado', 'As informações são demonstrativas até a integração com o sistema acadêmico.']] },
    notas: { title: 'Meu boletim', description: 'Suas notas por disciplina no semestre 2026.2. Média para aprovação: 6,0.', boletim: true },
    'lancar-notas': { title: 'Lançar notas', description: 'Escolha o aluno e a disciplina, digite as notas e salve. O aluno vê na hora, no boletim dele.', lancarNotas: true },
        chamada: { title: 'Chamada', description: 'Escolha a disciplina e o dia, desmarque quem faltou e salve. A presença fica guardada no banco.', chamada: true },
    'materias-prof': { title: 'Minhas matérias', description: 'Suas próximas aulas. Use o calendário para ver só um dia.', aulasProfessor: true },
    desempenho: { title: 'Desempenho dos alunos', description: 'Média de cada aluno por disciplina. A linha tracejada marca a média 6,0, necessária para aprovação.', desempenho: true },
    aula: { title: 'Aula on-line', description: 'Entre na sala virtual da sua próxima aula.', cards: [['Próxima aula', 'Cálculo I · Sexta-feira · 19h', 'O link abre o Google Meet em uma nova aba. Use fone de ouvido e mantenha o microfone desligado ao entrar.']], link: { texto: 'Entrar na aula on-line ↗', url: 'https://meet.google.com/' } },
    materias: { title: 'Minhas matérias', description: 'Disciplinas em andamento neste semestre.', cards: [['Lógica de Programação', 'Segunda-feira · 19h', 'Algoritmos, variáveis e estruturas de decisão.'], ['Banco de Dados', 'Quarta-feira · 19h', 'Modelagem de dados e consultas SQL.'], ['Cálculo I', 'Sexta-feira · 19h', 'Conteúdo e horários demonstrativos.']] },
    horas: { title: 'Horas complementares', description: 'Organize atividades e acompanhe suas horas complementares.', cards: [['Horas validadas', '48 de 100 horas (exemplo)', 'O total real deve ser obtido do sistema acadêmico.'], ['Adicionar atividade', 'Registre uma atividade para revisão', 'Preencha os dados abaixo para simular um registro.']], form: 'atividade' },
    grade: { title: 'Grade de matérias', description: 'Uma visão ilustrativa da grade semanal.', table: [['Dia', '19h–20h', '20h–21h40'], ['Segunda', 'Lógica de Programação', 'Lógica de Programação'], ['Terça', 'Banco de Dados', 'Banco de Dados'], ['Quarta', 'Cálculo I', 'Cálculo I'], ['Quinta', 'Desenvolvimento Web', 'Desenvolvimento Web']] },
    semestre: { title: 'Meu semestre', description: 'Calendário e marcos acadêmicos do semestre 2026.2 (dados de exemplo).', cards: [['Outubro', 'Avaliações parciais', 'Consulte o calendário oficial para confirmar datas.'], ['Novembro', 'Entrega de projetos', 'Organize as atividades das disciplinas.'], ['Dezembro', 'Encerramento do semestre', 'Datas ilustrativas para o protótipo.']] },
    tutor: { title: 'Falar com o tutor', description: 'Escreva sua dúvida para simular o envio de uma mensagem.', form: 'mensagem' },
    turmas: { title: 'Minhas turmas', description: 'Visão demonstrativa das turmas sob sua responsabilidade.', table: [['Turma', 'Disciplina', 'Alunos'], ['ADS-2A', 'Lógica de Programação', '32 (exemplo)'], ['CC-1B', 'Introdução à Computação', '28 (exemplo)']] },
    projetos: { title: 'Meus projetos', description: 'Organize projetos e acompanhe o andamento das atividades.', cards: [['Projeto integrador', 'Em andamento', 'Revisar entregas e orientar as equipes.'], ['Laboratório prático', 'Planejamento', 'Organizar objetivos, recursos e prazos.']], form: 'projeto' },
    espaco: { title: 'Espaço do professor', description: 'Materiais e recursos de apoio à rotina docente.', cards: [['Materiais didáticos', 'Biblioteca de recursos', 'Área demonstrativa para organizar materiais.'], ['Orientações acadêmicas', 'Normas e comunicados', 'Conecte este espaço aos documentos institucionais.']] },
    anotacoes: { title: 'Anotações', description: 'Crie notas locais para organizar ideias. Elas permanecem nesta página até atualizar ou fechar o navegador.', form: 'anotacao' },
        // ----- Área da coordenação -----
    'cursos-coord': { title: 'Cursos e turmas', description: 'Turmas abertas em 2026.2 (dados de exemplo).', table: [['Curso', 'Turmas', 'Alunos'], ['Análise e Desenvolvimento de Sistemas', 'ADS-1A, ADS-2A', '64'], ['Ciência da Computação', 'CC-1B', '28'], ['Segurança da Informação', 'SI-1A', '31']] },
    professores: { title: 'Professores', description: 'Professores e disciplinas deste semestre (dados de exemplo).', table: [['Professor', 'Disciplina', 'Turmas'], ['Carlos Mendes', 'Lógica de Programação', 'ADS-2A'], ['Rafael Lima', 'Introdução à Computação', 'CC-1B']] },
    comunicados: { title: 'Comunicados', description: 'Avisos enviados para professores e alunos (dados de exemplo).', cards: [['Semana de provas', '23 a 27 de novembro', 'Professores devem lançar as notas até 04/12.'], ['Rematrícula', 'Aberta até 15 de dezembro', 'Avisar as turmas em sala.']] },
    reunioes: { title: 'Reuniões', description: 'Próximas reuniões pedagógicas (dados de exemplo).', cards: [['Conselho de classe', '18/11 · 19h', 'Sala 204 ou on-line.'], ['Planejamento 2027.1', '02/12 · 18h', 'Trazer o plano de ensino atualizado.']] },
    cadastros: { title: 'Cadastros de interessados', description: 'Pessoas que preencheram o "Fale conosco" do site. Os dados vêm direto do banco.', cadastros: true },
    // ----- Área da recepção -----
    atendimentos: { title: 'Atendimentos', description: 'Contatos feitos com os interessados (dados de exemplo).', cards: [['Hoje', '3 ligações retornadas', 'Interessados em ADS e Jogos Digitais.'], ['Pendentes', '2 retornos para amanhã', 'Confira os cadastros mais recentes.']] },
    matriculas: { title: 'Matrículas', description: 'Matrículas em andamento (dados de exemplo).', table: [['Aluno', 'Curso', 'Situação'], ['Mateus Rocha', 'Ciência da Computação', 'Documentos pendentes'], ['Gabriel Alves', 'Redes de Computadores', 'Concluída']] },
    agenda: { title: 'Agenda de visitas', description: 'Visitas marcadas ao campus (dados de exemplo).', table: [['Data', 'Horário', 'Visitante', 'Curso de interesse'], ['12/11', '10h', 'Família Souza', 'Jogos Digitais'], ['14/11', '15h', 'Escola Estadual Centro', 'Vários cursos']] },
    coordenacao: { title: 'Área de coordenação', description: 'Comunicados e atividades de coordenação (conteúdo ilustrativo).', cards: [['Próxima reunião', 'Reunião pedagógica', 'Data e pauta devem ser confirmadas pela coordenação.'], ['Comunicados', 'Nenhum comunicado conectado', 'Integre ao back-end para exibir avisos oficiais.']] }
  };

  function renderSection(key) {
    if (!detailSection || !sectionData[key]) return;
    const data = sectionData[key];
    if (homeSection) homeSection.hidden = true;
    detailSection.hidden = false;
    if (welcome) welcome.hidden = true;
    detailTitle.textContent = data.title;
    detailDescription.textContent = data.description;
    detailContent.innerHTML = '';

    if (data.cards) {
      data.cards.forEach(([title, subtitle, description]) => {
        const card = document.createElement('article');
        card.className = 'detail-panel';
        const h = document.createElement('h3'); h.textContent = title;
        const strong = document.createElement('p'); strong.innerHTML = `<strong>${subtitle}</strong>`;
        const p = document.createElement('p'); p.textContent = description;
        card.append(h, strong, p);
        detailContent.append(card);
      });
    }
    if (data.table) {
      const table = document.createElement('table'); table.className = 'detail-table';
      data.table.forEach((row, index) => {
        const tr = document.createElement('tr');
        row.forEach((cell) => {
          const el = document.createElement(index === 0 ? 'th' : 'td');
          el.textContent = cell; tr.append(el);
        });
        table.append(tr);
      });
      detailContent.append(table);
    }
        if (data.link) { // cartão com um botão que abre um endereço externo, como a sala do Google Meet
      const cartao = document.createElement('article');
      cartao.className = 'detail-panel';
      const titulo = document.createElement('h3'); titulo.textContent = 'Sala virtual';
      const botao = document.createElement('a');
      botao.className = 'button button-primary';
      botao.href = data.link.url;
      botao.target = '_blank'; // abre em uma nova aba, sem sair do portal
      botao.rel = 'noopener'; // segurança: a nova aba não consegue controlar o portal
      botao.textContent = data.link.texto;
      cartao.append(titulo, botao);
      detailContent.append(cartao);
    }
    if (data.cadastros) carregarCadastros(); // busca a lista no backend
    if (data.form) renderDemoForm(data.form);
    document.querySelectorAll('.portal-nav [data-section]').forEach((link) => link.classList.toggle('active', link.dataset.section === key));
    history.replaceState(null, '', `#${key}`);
    detailSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (data.boletim) carregarBoletim(); // notas do aluno logado
    if (data.lancarNotas) carregarLancarNotas(); // formulário do professor
    if (data.desempenho) carregarDesempenho(); // gráfico do professor

    if (data.chamada) carregarChamada(); // chamada do professor
    if (data.aulasProfessor) carregarMateriasProfessor(); // minhas matérias com filtro
  }

    // Busca os cadastros de interessados no backend e mostra em uma tabela, com o botão de baixar a planilha.
  async function carregarCadastros() {
    const barra = document.createElement('div');
    barra.className = 'cadastros-barra';
    barra.textContent = 'Carregando cadastros…';
    detailContent.append(barra);
    try {
      const resposta = await fetch('/api/interessados'); // GET: só lê, não grava nada
      const dados = await resposta.json();
      if (location.hash !== '#cadastros') return; // a pessoa já foi para outra seção enquanto carregava
      if (!resposta.ok) {
        barra.textContent = dados.erro; // ex.: "Somente a recepção e a coordenação..."
        return;
      }
      const lista = dados.interessados;
      const total = document.createElement('strong');
      total.textContent = lista.length === 1 ? '1 cadastro' : `${lista.length} cadastros`;
      const baixar = document.createElement('a');
      baixar.className = 'button button-primary';
      baixar.href = '/api/interessados.csv'; // o backend devolve o arquivo e o navegador baixa
      baixar.textContent = 'Baixar planilha ↓';
      barra.textContent = '';
      barra.append(total, baixar);
      if (lista.length === 0) {
        const vazio = document.createElement('p');
        vazio.textContent = 'Ninguém se cadastrou ainda. Teste pelo formulário da página Graduações.';
        barra.after(vazio);
        return;
      }
      const tabela = document.createElement('table');
      tabela.className = 'detail-table';
      const linhas = [['Nome', 'Celular', 'E-mail', 'Curso', 'Turno', 'Data']];
      lista.forEach((pessoa) => {
        linhas.push([pessoa.nome, formatarCelular(pessoa.celular), pessoa.email, pessoa.curso || 'Ainda decidindo', pessoa.turno, formatarData(pessoa.criado_em)]);
      });
      linhas.forEach((linha, indice) => {
        const tr = document.createElement('tr');
        linha.forEach((valor) => {
          const celula = document.createElement(indice === 0 ? 'th' : 'td');
          celula.textContent = valor; // textContent: o texto aparece como texto, nunca vira código
          tr.append(celula);
        });
        tabela.append(tr);
      });
      const rolagem = document.createElement('div');
      rolagem.className = 'tabela-rolagem';
      rolagem.append(tabela);
      detailContent.append(rolagem);
    } catch (erro) {
      barra.textContent = 'Não foi possível carregar os cadastros. Confira se o servidor está ligado.';
    }
  }

  // "11912345678" vira "(11) 91234-5678"
  function formatarCelular(numero) {
    if (numero.length === 11) return `(${numero.slice(0, 2)}) ${numero.slice(2, 7)}-${numero.slice(7)}`;
    if (numero.length === 10) return `(${numero.slice(0, 2)}) ${numero.slice(2, 6)}-${numero.slice(6)}`;
    return numero;
  }

  // O banco guarda "2026-11-10 18:43:00" no horário universal (UTC); aqui vira "10/11/2026, 15:43" no horário do Brasil
  function formatarData(texto) {
    const data = new Date(texto.replace(' ', 'T') + 'Z'); // o Z avisa que o horário é UTC
    return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

    // ---------- Notas: ferramentas usadas pelo boletim, pelo lançamento e pelo gráfico ----------

  // Faz o fetch, lê o JSON e, se o backend respondeu com erro, "lança" esse erro para o catch de quem chamou.
  async function buscarJSON(endereco, opcoes) {
    const resposta = await fetch(endereco, opcoes);
    const dados = await resposta.json();
    if (!resposta.ok) throw new Error(dados.erro || 'Algo deu errado.');
    return dados;
  }

  // Cria uma mensagem dentro da seção (ex.: "Carregando...") e devolve o elemento, para trocar o texto depois.
  function criarAviso(texto) {
    const aviso = document.createElement('p');
    aviso.className = 'aviso-secao';
    aviso.textContent = texto;
    detailContent.append(aviso);
    return aviso;
  }

  // Monta uma tabela a partir de uma lista de linhas; a primeira linha vira o cabeçalho.
  function criarTabela(linhas) {
    const tabela = document.createElement('table');
    tabela.className = 'detail-table';
    linhas.forEach((linha, indice) => {
      const tr = document.createElement('tr');
      linha.forEach((valor) => {
        const celula = document.createElement(indice === 0 ? 'th' : 'td');
        celula.textContent = valor;
        if (valor === 'Aprovado') celula.className = 'situacao-aprovado';
        if (valor === 'Reprovado') celula.className = 'situacao-reprovado';
        tr.append(celula);
      });
      tabela.append(tr);
    });
    const rolagem = document.createElement('div');
    rolagem.className = 'tabela-rolagem';
    rolagem.append(tabela);
    return rolagem;
  }

  // 7.5 vira "7,5"; nota vazia (null) vira um traço
  function formatarNota(nota) {
    return nota === null ? '—' : nota.toFixed(1).replace('.', ',');
  }

  // Boletim do aluno: as notas vêm do banco, lançadas pelo professor.
  async function carregarBoletim() {
    const aviso = criarAviso('Carregando seu boletim…');
    try {
      const { notas } = await buscarJSON('/api/minhas-notas'); // { notas } pega só a parte "notas" da resposta
      if (location.hash !== '#notas') return;
      aviso.remove();
      const linhas = [['Disciplina', 'Nota 1', 'Nota 2', 'Média', 'Situação']];
      notas.forEach((n) => linhas.push([n.disciplina, formatarNota(n.nota1), formatarNota(n.nota2), formatarNota(n.media), n.situacao]));
      detailContent.append(criarTabela(linhas));
    } catch (erro) {
      aviso.textContent = erro.message;
    }
  }

  // Professor: formulário para lançar notas + tabela com todas as notas da turma.
  async function carregarLancarNotas() {
    const aviso = criarAviso('Carregando alunos e notas…');
    let notas;
    try {
      notas = (await buscarJSON('/api/notas')).notas;
    } catch (erro) {
      aviso.textContent = erro.message;
      return;
    }
    if (location.hash !== '#lancar-notas') return;
    aviso.remove();

    const formulario = document.createElement('form');
    formulario.className = 'detail-panel';
    formulario.innerHTML = `
      <h3>Lançar ou corrigir notas</h3>
      <label for="nota-aluno">Aluno</label><select id="nota-aluno" required></select>
      <label for="nota-disciplina">Disciplina</label><select id="nota-disciplina" required></select>
      <div class="notas-linha">
        <div><label for="nota-1">Nota 1</label><input id="nota-1" type="number" min="0" max="10" step="0.1" placeholder="0 a 10"></div>
        <div><label for="nota-2">Nota 2</label><input id="nota-2" type="number" min="0" max="10" step="0.1" placeholder="0 a 10"></div>
      </div>
      <button class="button button-primary" type="submit">Salvar notas</button>
      <p class="form-message" aria-live="polite"></p>`;
    const campoAluno = formulario.querySelector('#nota-aluno');
    const campoDisciplina = formulario.querySelector('#nota-disciplina');
    const campoNota1 = formulario.querySelector('#nota-1');
    const campoNota2 = formulario.querySelector('#nota-2');
    const mensagem = formulario.querySelector('.form-message');

    // Map = dicionário do JavaScript; repetir a mesma chave não duplica, então cada aluno aparece uma vez só.
    const alunos = new Map(notas.map((n) => [n.rga, n.aluno]));
    const disciplinas = new Map(notas.map((n) => [String(n.disciplina_id), n.disciplina]));
    alunos.forEach((nome, rga) => campoAluno.append(new Option(`${nome} (${rga})`, rga)));
    disciplinas.forEach((nome, id) => campoDisciplina.append(new Option(nome, id)));

    // Quando troca o aluno ou a disciplina, mostra as notas que já existem (para corrigir).
    const preencherNotas = () => {
      const atual = notas.find((n) => n.rga === campoAluno.value && String(n.disciplina_id) === campoDisciplina.value);
      campoNota1.value = atual && atual.nota1 !== null ? atual.nota1 : '';
      campoNota2.value = atual && atual.nota2 !== null ? atual.nota2 : '';
      mensagem.textContent = '';
    };
    campoAluno.addEventListener('change', preencherNotas);
    campoDisciplina.addEventListener('change', preencherNotas);
    preencherNotas();

    let tabela = criarTabelaDeNotas(notas);
    detailContent.append(formulario, tabela);

    formulario.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!formulario.reportValidity()) return; // o navegador confere 0 a 10 antes de enviar
      mensagem.textContent = 'Salvando…';
      try {
        const resposta = await buscarJSON('/api/notas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rga: campoAluno.value, disciplina_id: campoDisciplina.value, nota1: campoNota1.value, nota2: campoNota2.value }),
        });
        mensagem.textContent = resposta.mensagem;
        notas = (await buscarJSON('/api/notas')).notas; // busca de novo para a tabela mostrar a média nova
        const novaTabela = criarTabelaDeNotas(notas);
        tabela.replaceWith(novaTabela); // troca a tabela velha pela nova, sem recarregar a página
        tabela = novaTabela;
      } catch (erro) {
        mensagem.textContent = erro.message;
      }
    });
  }

  function criarTabelaDeNotas(notas) {
    const linhas = [['Aluno', 'Disciplina', 'Nota 1', 'Nota 2', 'Média', 'Situação']];
    notas.forEach((n) => linhas.push([n.aluno, n.disciplina, formatarNota(n.nota1), formatarNota(n.nota2), formatarNota(n.media), n.situacao]));
    return criarTabela(linhas);
  }

  // Professor: um gráfico de barras por aluno, feito só com HTML e CSS (a largura da barra = média x 10%).
  async function carregarDesempenho() {
    const aviso = criarAviso('Montando o gráfico…');
    try {
      const { notas } = await buscarJSON('/api/notas');
      if (location.hash !== '#desempenho') return;
      aviso.remove();
      const porAluno = new Map(); // RGA -> lista de notas daquele aluno
      notas.forEach((n) => {
        if (!porAluno.has(n.rga)) porAluno.set(n.rga, []);
        porAluno.get(n.rga).push(n);
      });
      porAluno.forEach((lista) => {
        const cartao = document.createElement('article');
        cartao.className = 'detail-panel';
        const titulo = document.createElement('h3');
        titulo.textContent = lista[0].aluno;
        const grafico = document.createElement('div');
        grafico.className = 'grafico';
        lista.forEach((n) => {
          const linha = document.createElement('div');
          linha.className = 'grafico-linha';
          const nome = document.createElement('span');
          nome.textContent = n.disciplina;
          const trilho = document.createElement('div');
          trilho.className = 'grafico-trilho';
          const barra = document.createElement('div');
          barra.className = n.situacao === 'Reprovado' ? 'grafico-barra reprovado' : 'grafico-barra';
          const valor = n.media !== null ? n.media : (n.nota1 ?? n.nota2 ?? 0); // sem média ainda: mostra a nota que existe
          barra.style.width = `${valor * 10}%`; // nota 7 = 70% da largura
          trilho.append(barra);
          const numero = document.createElement('strong');
          numero.textContent = n.media !== null ? formatarNota(n.media) : '…';
          linha.append(nome, trilho, numero);
          grafico.append(linha);
        });
        cartao.append(titulo, grafico);
        detailContent.append(cartao);
      });
      const legenda = criarAviso('Azul = aprovado · Vermelho = reprovado · "…" = ainda falta lançar uma nota.');
      legenda.classList.add('grafico-legenda');
    } catch (erro) {
      aviso.textContent = erro.message;
    }
  }
  
    // ---------- Chamada e Minhas matérias (professor) ----------

  // Data de hoje no formato do campo de data: "2026-11-16" (o horário do computador de quem está usando)
  function hojeISO() {
    const hoje = new Date();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0'); // getMonth começa em 0 (janeiro = 0)
    const dia = String(hoje.getDate()).padStart(2, '0'); // padStart: 5 vira "05"
    return `${hoje.getFullYear()}-${mes}-${dia}`;
  }

  // "2026-11-16" vira "16/11/2026"
  function formatarDia(iso) {
    const [ano, mes, dia] = iso.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  // Chamada: escolhe disciplina e dia, marca quem veio e salva no banco.
  async function carregarChamada() {
    const aviso = criarAviso('Carregando disciplinas…');
    let disciplinas;
    try {
      disciplinas = (await buscarJSON('/api/disciplinas')).disciplinas;
    } catch (erro) {
      aviso.textContent = erro.message;
      return;
    }
    if (location.hash !== '#chamada') return;
    aviso.remove();

    const formulario = document.createElement('form');
    formulario.className = 'detail-panel chamada';
    formulario.innerHTML = `
      <h3>Fazer chamada</h3>
      <div class="notas-linha">
        <div><label for="chamada-disciplina">Disciplina</label><select id="chamada-disciplina"></select></div>
        <div><label for="chamada-data">Dia da aula</label><input id="chamada-data" type="date" required></div>
      </div>
      <p class="chamada-status" aria-live="polite"></p>
      <div class="chamada-lista"></div>
      <div class="chamada-botoes">
        <button class="button button-outline" type="button" id="chamada-todos">Marcar todos presentes</button>
        <button class="button button-primary" type="submit">Salvar chamada</button>
      </div>
      <p class="form-message" aria-live="polite"></p>`;
    const campoDisciplina = formulario.querySelector('#chamada-disciplina');
    const campoData = formulario.querySelector('#chamada-data');
    const status = formulario.querySelector('.chamada-status');
    const lista = formulario.querySelector('.chamada-lista');
    const mensagem = formulario.querySelector('.form-message');
    disciplinas.forEach((d) => campoDisciplina.append(new Option(d.nome, d.id)));
    campoData.value = hojeISO(); // já abre no dia de hoje
    detailContent.append(formulario);

    // Busca no backend a lista de alunos daquela disciplina e daquele dia
    let pedidoAtual = 0; // conta os pedidos: se o professor trocar rápido de dia, só a ÚLTIMA resposta vale
    const carregarLista = async () => {
      const meuPedido = ++pedidoAtual;
      mensagem.textContent = '';
      status.textContent = 'Carregando alunos…';
      try {
        const endereco = `/api/chamada?disciplina_id=${campoDisciplina.value}&data=${campoData.value}`;
        const resposta = await buscarJSON(endereco);
        if (meuPedido !== pedidoAtual) return; // chegou um pedido mais novo enquanto este esperava: descarta
        lista.textContent = ''; // limpa a lista antiga só agora, na hora de desenhar a nova
        status.textContent = resposta.ja_feita
          ? `Chamada de ${formatarDia(campoData.value)} já feita. Você pode corrigir e salvar de novo.`
          : `Chamada de ${formatarDia(campoData.value)} ainda não feita.`;
        resposta.alunos.forEach((aluno) => {
          const linha = document.createElement('label'); // label: clicar no nome também marca a caixa
          linha.className = 'chamada-aluno';
          const caixa = document.createElement('input');
          caixa.type = 'checkbox';
          caixa.value = aluno.rga;
          caixa.checked = aluno.presente !== 0; // ainda sem chamada (null) começa marcado como presente
          const nome = document.createElement('span');
          nome.textContent = `${aluno.aluno} (${aluno.rga})`;
          linha.append(caixa, nome);
          lista.append(linha);
        });
      } catch (erro) {
        status.textContent = erro.message;
      }
    };
    campoDisciplina.addEventListener('change', carregarLista);
    campoData.addEventListener('change', carregarLista);
    carregarLista();

    formulario.querySelector('#chamada-todos').addEventListener('click', () => {
      lista.querySelectorAll('input[type="checkbox"]').forEach((caixa) => { caixa.checked = true; });
    });

    formulario.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!formulario.reportValidity()) return;
      const presencas = [...lista.querySelectorAll('input[type="checkbox"]')].map((caixa) => ({ rga: caixa.value, presente: caixa.checked }));
      mensagem.textContent = 'Salvando…';
      try {
        const resposta = await buscarJSON('/api/chamada', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ disciplina_id: campoDisciplina.value, data: campoData.value, presencas }),
        });
        mensagem.textContent = resposta.mensagem;
        status.textContent = `Chamada de ${formatarDia(campoData.value)} já feita. Você pode corrigir e salvar de novo.`;
      } catch (erro) {
        mensagem.textContent = erro.message;
      }
    });
  }

  // Aulas do professor (dados de exemplo). A data fica no formato "ano-mês-dia" para comparar com o calendário.
  const AULAS_PROFESSOR = [
    { data: '2026-11-16', horario: '19h às 20h40', disciplina: 'Lógica de Programação', turma: 'ADS-2A', sala: 'Lab 3' },
    { data: '2026-11-17', horario: '19h às 20h40', disciplina: 'Banco de Dados', turma: 'ADS-2A', sala: 'Lab 1' },
    { data: '2026-11-19', horario: '20h50 às 22h30', disciplina: 'Cálculo I', turma: 'CC-1B', sala: 'Sala 204' },
    { data: '2026-11-20', horario: '19h às 20h40', disciplina: 'Lógica de Programação', turma: 'ADS-2A', sala: 'Lab 3' },
    { data: '2026-11-23', horario: '19h às 20h40', disciplina: 'Lógica de Programação', turma: 'ADS-2A', sala: 'Lab 3' },
    { data: '2026-11-24', horario: '19h às 20h40', disciplina: 'Banco de Dados', turma: 'ADS-2A', sala: 'Lab 1' },
    { data: '2026-11-26', horario: '20h50 às 22h30', disciplina: 'Cálculo I', turma: 'CC-1B', sala: 'Sala 204' },
  ];

  // Minhas matérias: lista de aulas com um filtro por calendário.
  function carregarMateriasProfessor() {
    const filtro = document.createElement('div');
    filtro.className = 'detail-panel filtro-calendario';
    filtro.innerHTML = `
      <label for="filtro-data">Filtrar por dia</label>
      <div class="filtro-linha">
        <input id="filtro-data" type="date">
        <button class="button button-outline" type="button" id="filtro-limpar">Mostrar todas</button>
      </div>
      <p class="chamada-status" aria-live="polite"></p>`;
    const campoData = filtro.querySelector('#filtro-data');
    const resumo = filtro.querySelector('.chamada-status');
    const area = document.createElement('div');
    area.className = 'aulas-lista';
    detailContent.append(filtro, area);

    const mostrar = () => {
      const dia = campoData.value; // vazio = sem filtro
      const aulas = dia ? AULAS_PROFESSOR.filter((aula) => aula.data === dia) : AULAS_PROFESSOR; // filter = só as que passam no teste
      area.textContent = '';
      resumo.textContent = dia
        ? `${aulas.length} aula(s) em ${formatarDia(dia)}.`
        : `${aulas.length} aulas nas próximas semanas.`;
      if (aulas.length === 0) {
        const vazio = document.createElement('p');
        vazio.className = 'aviso-secao';
        vazio.textContent = 'Nenhuma aula neste dia. Escolha outra data ou clique em "Mostrar todas".';
        area.append(vazio);
        return;
      }
      aulas.forEach((aula) => {
        const cartao = document.createElement('article');
        cartao.className = 'detail-panel';
        const titulo = document.createElement('h3');
        titulo.textContent = aula.disciplina;
        const quando = document.createElement('p');
        quando.innerHTML = '<strong></strong>';
        quando.firstChild.textContent = `${formatarDia(aula.data)} · ${aula.horario}`;
        const onde = document.createElement('p');
        onde.textContent = `Turma ${aula.turma} · ${aula.sala}`;
        cartao.append(titulo, quando, onde);
        area.append(cartao);
      });
    };
    campoData.addEventListener('change', mostrar);
    filtro.querySelector('#filtro-limpar').addEventListener('click', () => {
      campoData.value = '';
      mostrar();
    });
    mostrar();
  }

  function renderDemoForm(type) {
    const wrapper = document.createElement('form');
    wrapper.className = 'detail-panel';
    wrapper.innerHTML = type === 'mensagem'
      ? '<h3>Nova mensagem para o tutor</h3><label for="demo-subject">Assunto</label><input id="demo-subject" required placeholder="Digite o assunto"><label for="demo-message">Mensagem</label><textarea id="demo-message" required placeholder="Escreva sua dúvida"></textarea><button class="button button-primary" type="submit">Enviar mensagem</button><p class="form-message" aria-live="polite"></p>'
      : type === 'atividade'
      ? '<h3>Registrar atividade complementar</h3><label for="demo-activity">Nome da atividade</label><input id="demo-activity" required placeholder="Ex.: palestra de tecnologia"><label for="demo-hours">Quantidade de horas</label><input id="demo-hours" type="number" min="1" max="200" required placeholder="Ex.: 4"><button class="button button-primary" type="submit">Registrar atividade</button><p class="form-message" aria-live="polite"></p>'
      : type === 'projeto'
      ? '<h3>Novo projeto</h3><label for="demo-project">Nome do projeto</label><input id="demo-project" required placeholder="Nome do projeto"><label for="demo-project-desc">Descrição</label><textarea id="demo-project-desc" required placeholder="Objetivo e próximos passos"></textarea><button class="button button-primary" type="submit">Adicionar projeto</button><p class="form-message" aria-live="polite"></p>'
      : '<h3>Nova anotação</h3><label for="demo-note-title">Título</label><input id="demo-note-title" required placeholder="Título da anotação"><label for="demo-note">Anotação</label><textarea id="demo-note" required placeholder="Escreva aqui..."></textarea><button class="button button-primary" type="submit">Salvar anotação</button><p class="form-message" aria-live="polite"></p>';
    wrapper.addEventListener('submit', (event) => {
      event.preventDefault();
      const message = wrapper.querySelector('.form-message');
      message.textContent = 'Pronto! A ação foi simulada neste protótipo. Para salvar de forma permanente, conecte um back-end.';
      wrapper.reset();
    });
    detailContent.append(wrapper);
  }

    // Volta para a tela inicial do painel (usado pelo "Início" do menu e pelo "Voltar ao início").
  function voltarAoInicio() {
    if (!detailSection) return;
    detailSection.hidden = true;
    if (homeSection) homeSection.hidden = false;
    if (welcome) welcome.hidden = false;
    document.querySelectorAll('.portal-nav [data-section]').forEach((link) => link.classList.toggle('active', link.dataset.section === 'inicio'));
    history.replaceState(null, '', '#inicio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  dashboardCards.forEach((button) => {
    button.addEventListener('click', (event) => {
      const key = button.dataset.section;
      document.querySelector('.portal-sidebar')?.classList.remove('open'); // no celular, fecha o menu depois do clique
      if (key === 'inicio') { // "inicio" não está no sectionData: tem um caminho só dele
        event.preventDefault();
        voltarAoInicio();
        return;
      }
      if (!sectionData[key]) return;
      event.preventDefault();
      renderSection(key);
    });
  });
  if (backHome) {
        backHome.addEventListener('click', voltarAoInicio);
  }

  // Caso o usuário abra o portal com um link direto para uma seção.
  if (detailSection && location.hash.length > 1) {
    const key = location.hash.slice(1);
    if (sectionData[key]) renderSection(key);
  }
});
