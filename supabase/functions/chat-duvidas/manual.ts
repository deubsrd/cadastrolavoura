// Conteúdo do Manual de Operações da Lavoura (public/manual-operacoes-lavoura.pdf),
// extraído e limpo para servir de contexto ao assistente de dúvidas.
// Se o manual for atualizado, atualize este texto também.

export const MANUAL_OPERACOES = `
# Manual de Operações — Lavoura (Lavanderia de Autosserviço)

## Seção 01 — Bem-vindo(a) à Lavoura
Este manual reúne as informações essenciais para operar bem uma unidade Lavoura no dia a dia — do
primeiro atendimento ao cliente até a manutenção preventiva das máquinas. Como franqueado(a), você
é responsável por garantir que a loja funcione de forma consistente com o padrão da marca: máquinas
configuradas corretamente, ambiente limpo e seguro, e um atendimento simples para quem nunca usou
uma lavanderia de autosserviço antes.
As lavadoras desta unidade são máquinas comerciais de carga frontal, com pagamento feito no totem da
loja — não há inserção de cartão pelo cliente na máquina.

## Seção 02 — O fluxo do cliente na loja
Seis passos, do momento em que o cliente chega até a roupa pronta:
1. Medir a roupa no cesto de 60L. É a referência oficial de carga correta e a base da garantia de lavagem.
2. Separar e carregar a roupa: bolsos vazios, zíperes fechados, sem itens impermeáveis ou muito
   pesados isolados. A carga medida no cesto não deve ultrapassar a metade do tambor em peças grandes.
3. Pagamento no totem: o cliente paga no totem e escolhe a máquina. Não escolhe ciclo — todos os
   botões da máquina (Quente, Morno, Frio, Delicados) rodam o mesmo programa padrão da unidade
   (ver Seção 04). Não há inserção de cartão na máquina.
4. Aguardar a liberação e apertar Início: depois do pagamento, o totem libera eletronicamente a
   máquina escolhida; o cliente pressiona Início para começar o ciclo.
5. Trava de segurança: assim que o ciclo começa, a porta trava automaticamente e permanece travada
   até o fim — não pode ser aberta manualmente.
6. Fim do ciclo: o visor mostra "End" com sinal sonoro e a porta destrava.

Por que medir no cesto de 60L é obrigatório: as câmeras da loja registram o uso das máquinas. Em caso
de reclamação (roupa mal lavada, sem perfume, não centrifugada), a equipe confere nas imagens se o
cliente mediu a carga no cesto antes de lavar. Só se garante o resultado da lavagem quando esse passo
foi seguido — carga acima do cesto de 60L é a causa mais comum de reclamação e não é coberta pela
garantia.

Importante: nunca force a porta durante o ciclo. Se a máquina parecer travada com a porta fechada e o
ciclo já tiver terminado, siga o procedimento de erro dE1/dE2 (Seção 07) antes de qualquer intervenção
manual.

O que o painel mostra (o pagamento é no totem, então o visor da máquina não mostra preço, só tempo):
- Wash: luz de etapa, lavagem em andamento (pisca).
- Rinse: luz de etapa, enxágue em andamento (pisca).
- Spin: luz de etapa, centrifugação em andamento (pisca).
- Door Lock: acesa enquanto a trava de segurança da porta está ativa.
- Visor numérico: mostra apenas o tempo restante até o fim do ciclo.

## Seção 03 — Perfume e amaciante: como orientar o cliente
Nesta unidade, detergente e amaciante são dosados pela loja em quantidade fixa a cada ciclo — o cliente
não traz nem adiciona produto próprio.

Produtos oficiais (usar somente estes): Detergente OMO Lavanderia Profissional; Amaciante Comfort
Super Concentrado. Qualquer produto diferente pode danificar a máquina (entupimento do sistema de
dosagem, reação com componentes) e não vai render o mesmo resultado.

Dosagem:
- Lavagem (detergente OMO): dosador configurado em 40 ml. A máquina libera 40 ml automaticamente
  na pré-lavagem e mais 40 ml na lavagem principal — duas dosagens separadas, 80 ml no total por ciclo.
- Amaciante (Comfort Super Concentrado): 60 ml (máximo 70 ml — mais que isso é desnecessário e não
  melhora o resultado). Liberado automaticamente durante o enxágue final, sem ação extra do cliente ou
  da loja.

Pérolas/grânulos perfumantes (scent boosters): é a única coisa que o próprio cliente pode adicionar,
se quiser perfume extra. Diferente do amaciante, NÃO vão no compartimento de dosagem — entopem o
sistema. Orientar o cliente a colocá-las direto no tambor, junto com a roupa seca, antes de fechar a porta
e iniciar o ciclo.

Boas práticas para a equipe:
- Reabastecer os reservatórios somente com os produtos indicados, nunca misturando marcas diferentes
  no mesmo reservatório.
- Se o cheiro ou a limpeza da roupa parecer abaixo do padrão, verificar primeiro se a dose/reservatório
  está correta antes de acionar o suporte técnico.
- Nunca misturar alvejante com amônia ou vinagre — libera gases tóxicos. Esta unidade não usa
  alvejante como parte do padrão, mas a regra vale para qualquer produto extra.
- Roupas com manchas de óleo ou gordura de cozinha não devem ser lavadas junto com outras peças —
  risco de reação química e combustão do tecido ao secar.

Receita interna do aromatizante ("perfume de cheirinho", uso interno da loja): 1,5 L de Comfort Super
Concentrado + 2,5 L de álcool 46º, completando o restante com água até fechar um galão de 20 L.
Misturar bem e deixar descansar 12 horas antes de usar. Cuidado: álcool 46º é inflamável — preparar
longe de fontes de calor/chama, em local ventilado, e guardar o galão bem fechado e identificado, fora
do alcance de crianças e longe de equipamento elétrico.

## Seção 04 — O programa de lavagem padrão da unidade
Ciclo total de 30 minutos, dividido em quatro etapas, igual para os quatro botões (Quente, Morno, Frio,
Delicados):
- Pré-lavagem: minuto 30 → 25 (5 min). Ciclo curto para amolecer a sujeira antes da lavagem principal.
- Lavagem principal: minuto 25 → 15 (10 min). Detergente liberado e agitado com a carga.
- Enxágue: minuto 15 → 8 (7 min). Amaciante liberado automaticamente no enxágue final.
- Centrifugação: minuto 8 → 0 (8 min). Reduz a umidade da roupa.

Configuração técnica de referência: liberação da máquina é automática, por pulso enviado pelo totem
assim que o pagamento é confirmado — sem inserção de cartão/ficha na máquina. Porta trava
automaticamente durante lavagem, enxágue e centrifugação, e destrava quando o tambor para
completamente (inclusive ao pausar o ciclo). Alterações nesses parâmetros só devem ser feitas por quem
tem acesso técnico ao modo de programação da máquina (acesso + senha).

## Seção 05 — Como cancelar ou encerrar uma máquina
Pausar o ciclo (uso pelo próprio cliente):
1. Pressionar Início/Pausa no painel.
2. O tambor para e, alguns segundos depois, a porta destrava para adicionar/remover peças.
3. Para retomar, fechar a porta e pressionar Início/Pausa novamente.

Encerrar/cancelar um ciclo em definitivo (procedimento da equipe da loja — pré-condição obrigatória:
porta fechada e ciclo já iniciado e depois colocado em pausa):
1. Pressionar Quente e Frio ao mesmo tempo.
2. Pressionar Morno até aparecer o número 3, depois pressionar Início.
3. Pressionar Morno até aparecer "hILL" no visor.
4. Pressionar Morno até aparecer o número 17, depois pressionar Início.
5. A máquina ativa o esgoto e finaliza o ciclo. Visor mostra "End" com sinal sonoro e a porta destrava.
Uso restrito: esse caminho mexe no menu técnico da máquina — reservar para equipe treinada, e só
dentro da pré-condição acima.

## Seção 06 — Situações especiais e reclamações
Cliente veio só secar e a roupa saiu úmida: é comum trazer roupa já lavada em casa só para secar.
Máquinas domésticas centrifugam pior que as comerciais da loja, então a roupa chega mais encharcada
— o tempo padrão de secagem (45 minutos) pode não ser suficiente. Orientar: avisar o cliente na entrada
que pode ser necessário um ciclo extra de secagem (tempo adicional pago à parte).

Reclamação de falta ou pouco perfume na roupa — conferir as câmeras da loja, nesta ordem:
1. Verificar se o cliente mediu a carga no cesto de 60L antes de colocar na máquina.
2. Se mediu corretamente e mesmo assim há falha real (ex.: compartimento de amaciante vazio, máquina
   com erro), tratar como problema da loja e resolver/compensar o cliente.
3. Se não mediu no cesto, é provável excesso de roupa — carga acima do previsto dilui o efeito do
   amaciante. Explicar ao cliente, com cordialidade, que a medição no cesto é etapa obrigatória para
   acionar a garantia.

Roupa não centrifugou bem (ficou mais molhada que o normal) — duas causas prováveis, nesta ordem:
1. Excesso de roupa — conferir nas câmeras se o cesto de 60L foi usado (ver também erro UE, Seção 07).
2. Filtro pequeno da entrada de água sujo (diferente do filtro da bomba de desagüe) — quando entope,
   prejudica o ciclo, incluindo a centrifugação. Limpar seguindo o procedimento de filtro de entrada da
   Seção 08.

## Seção 07 — Erros comuns e o que fazer
Sempre seguir a coluna "O que fazer" antes de chamar o suporte técnico — a maioria é resolvida pela
própria equipe da loja em poucos minutos.

- IE — Falha no abastecimento de água. Causa provável: registro fechado, mangueira dobrada ou filtro
  de entrada entupido. O que fazer: verificar e abrir os registros de água quente/fria; desentortar a
  mangueira; se persistir, limpar o filtro de entrada de água.
- OE — Falha no escoamento. Causa: mangueira de desagüe dobrada/tampada ou filtro da bomba
  entupido. O que fazer: endireitar e desobstruir a mangueira; limpar o filtro da bomba (Seção 08).
- UE — Desbalanceamento da carga. Causa: carga muito pequena, desbalanceada, ou peças pesadas
  isoladas (roupão, tapete). O que fazer: redistribuir a carga manualmente ou adicionar 1–2 peças
  similares para equilibrar; reiniciar o ciclo.
- dE1 — Porta aberta ou mal fechada. Causa: a porta não fechou completamente. O que fazer: fechar
  bem a porta; se não travar, acionar o suporte técnico (pode ser falha no interruptor da porta).
- dE2 — Falha na trava da porta. Causa: interruptor de trava com defeito. O que fazer: não usar a
  máquina, sinalizar como indisponível e chamar suporte técnico.
- FE — Excesso de água (falha de válvula). Causa: válvula de entrada presa aberta. O que fazer: fechar
  o registro de água imediatamente, desligar a máquina e chamar suporte técnico.
- PE — Sensor de nível de água com defeito. Causa: falha no sensor de pressão de água. O que fazer:
  desligar a máquina e chamar suporte técnico.
- LE — Sobrecarga do motor. Causa: motor exigido além do normal (carga excessiva, obstrução). O que
  fazer: aguardar 30 minutos e tentar reiniciar; se o código não sumir, chamar suporte técnico.
- CrE — Falha de comunicação com o sistema de controle. Causa: cabeamento interno da placa
  desconectado. O que fazer: chamar suporte técnico; a máquina não deve ser liberada pelo totem até
  corrigido.
- SUdS — Excesso de espuma. Causa: cliente usou detergente em excesso ou tipo errado (não-HE). Não é
  falha da máquina — aguardar até o aviso desaparecer sozinho; orientar o cliente a usar menos
  detergente, preferencialmente detergente HE.
- tE — Sensor de temperatura (termistor) aberto ou rompido. Componente com defeito. O que fazer:
  sinalizar a máquina como indisponível e chamar suporte técnico para substituição do termistor.

Regra prática: erros de fluxo de água e desbalanceamento (IE, OE, UE, SUdS) costumam ser resolvidos
na própria loja. Erros de componente (FE, PE, dE2, CrE, tE) exigem suporte técnico — não tentar
reparar a máquina sozinho(a).

## Seção 08 — Manutenção preventiva de rotina
Diariamente: deixar a porta das máquinas sempre entreaberta fora do horário de uso (retentor
magnético), para o interior secar e não mofar.

Semanalmente — higienização das borrachas:
- Limpar a borracha da junta da porta com esponja e um pouco de água sanitária, em toda a volta.
- Retirar o resto do produto com pano/esponja úmida e secar bem — não deixar resíduo de água
  sanitária acumulado na borracha.
- Limpar a gaveta do dispensador e seus compartimentos com água quente.
- Limpar o filtro de entrada de água (atrás das mangueiras) e o filtro da bomba de desagüe.
- Conferir vazamentos nas conexões de mangueira de água e desagüe.
Antes de qualquer limpeza: desligar a máquina da tomada e fechar os registros de água antes de abrir o
filtro da bomba de desagüe ou desconectar mangueiras — pode haver água retida sob pressão.

Semanalmente — ciclo TUB CLEAN (limpeza de cuba, máquina vazia, sem roupa):
1. Ligar a máquina normalmente.
2. Pressionar Quente e Frio ao mesmo tempo.
3. Pressionar Morno até aparecer o número 3, depois pressionar Início — o visor mostra "LqC1".
4. Pressionar Morno até aparecer "tCL" no visor.
5. Pressionar Início e deixar o ciclo rodar até o fim (mostra tempo restante e depois "End").
6. Com o ciclo completo, fazer a limpeza do filtro da bomba de desagüe.

A cada 6 meses: chamar o técnico responsável para visita de manutenção preventiva em todas as
máquinas — inspeção de peças de desgaste (correias, retentores, mangueiras, vedações da porta) e
substituição do que for necessário antes de virar problema.

## Seção 09 — Segurança
- Nunca forçar a porta aberta com a máquina em funcionamento ou com o indicador Door Lock aceso.
- Não permitir que crianças brinquem em cima ou dentro das máquinas.
- Não lavar nem orientar clientes a lavar peças contaminadas com óleo, gasolina ou solventes — risco de
  incêndio.
- Manter a área ao redor das máquinas livre de papel, panos e produtos químicos.
- Antes de qualquer manutenção ou limpeza interna, desligar a máquina da tomada.
- Reparos e ajustes internos só por técnico qualificado — a equipe da loja deve se limitar aos
  procedimentos deste manual.
- Em caso de vazamento de água ou cheiro de queimado: desligar a máquina imediatamente e isolar a
  área até a chegada do suporte técnico.
- Emergência (choque elétrico, fumaça ou princípio de incêndio): desligar a chave geral da loja (não
  apenas a máquina), afastar os clientes e acionar os serviços de emergência antes de qualquer outra
  ação.
`.trim();
