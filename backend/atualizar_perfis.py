# Atualiza a tabela de usuários para aceitar os perfis novos (coordenação e recepção).
# Roda UMA vez em cada banco (no seu computador e no PythonAnywhere). Os interessados não são tocados.
from database import conectar
from seed import popular

conexao = conectar()
conexao.execute("DROP TABLE IF EXISTS usuarios") # apaga só a tabela de usuários (são todos fictícios, o seed recria)
conexao.commit()
conexao.close()
print("Tabela de usuários apagada. Recriando com os perfis novos...")

popular() # cria a tabela de novo, já com a regra nova do schema.sql, e coloca os 6 usuários