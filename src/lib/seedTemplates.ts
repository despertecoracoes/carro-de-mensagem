import { TemplateCategory } from '../types/booking';

export const DEFAULT_TEMPLATES: {
  id: string;
  title: string;
  category: TemplateCategory;
  content: string;
}[] = [
  {
    id: 'tpl-1',
    title: '01. Boas-vindas e Triagem Inicial',
    category: 'Boas-vindas e Triagem',
    content:
      'Olá, {cliente}! Seja muito bem-vindo(a) à Desperte Corações! É uma alegria ajudar você a emocionar quem você ama.\n\nPara eu confirmar a disponibilidade e o valor exato do carro ao vivo, me conte:\n1. Qual a data e o horário desejados?\n2. Em qual bairro e endereço completo será a homenagem?\n3. Qual é a ocasião (aniversário, reconciliação, declaração...)?',
  },
  {
    id: 'tpl-2',
    title: '02. Pedir Endereço Completo e Tipo de Imóvel',
    category: 'Endereço e Orçamento',
    content:
      'Perfeito, {cliente}! Já deixei pré-verificado o dia {data} às {horario}.\n\nPara eu fechar o valor certinho e confirmar o acesso do carro na região ({bairro}), me envia por favor o endereço completo (rua, número e ponto de referência) e me diz se é casa, prédio ou ponto comercial?',
  },
  {
    id: 'tpl-3',
    title: '03. O que vem no Pacote Completo (Brinde + 3 Fogos inclusos)',
    category: 'Pacotes e Opcionais',
    content:
      'Maravilha, {cliente}! Para {bairro} no dia {data} às {horario}, o pacote completo do carro de mensagem ao vivo sai por {valor}.\n\nO que já vai INCLUSO no valor:\n• Carro equipado com som de alta qualidade e iluminação\n• 1 Brinde à sua escolha: Champanhe OU Caixa de Chocolates\n• 3 Queimas de Fogos inclusas: 1x Fogos 12x1, Chuva de Prata e Árvore de Natal (Vulcão)\n• Locução ao vivo personalizada para {homenageado} (texto seu ou criado por nós)\n• 3 músicas da sua escolha\n• Microfone ao vivo (para até 5 pessoas falarem) OU envio de até 10 áudios de até 40 segundos cada\n• Duração média de 30 a 50 minutos no local\n\nOpcional à parte (caso queira):\n• Levar os dois brindes juntos (Champanhe + Chocolate): + R$ 30,00',
  },
  {
    id: 'tpl-4',
    title: '04. Dúvida: Duração, Microfone (5 pessoas) e Áudios (10x 40s)',
    category: 'Dúvidas Frequentes',
    content:
      'Funciona assim, {cliente}: a homenagem dura em média de 30 a 50 minutos no local. Tocamos as 3 músicas que você escolher intercaladas com a locução ao vivo!\n\nSobre as homenagens faladas:\n• No local, o microfone pode ser usado por até 5 pessoas;\n• Se preferir enviar gravado antes, você pode mandar até 10 áudios de no máximo 40 segundos cada pelo WhatsApp para tocarmos no carro.\n\nE sobre a mensagem principal, você pode enviar o texto pronto ou deixar que nossa equipe crie um roteiro personalizado para {homenageado} sem custo adicional.',
  },
  {
    id: 'tpl-5',
    title: '05. Dúvida: E se Chover ou Tiver Trânsito?',
    category: 'Dúvidas Frequentes',
    content:
      'Pode ficar tranquilo(a), {cliente}! Nossa equipe sai sempre com antecedência considerando o trânsito de {bairro}. Em caso de chuva leve a homenagem acontece normalmente; se houver chuva muito forte no horário, ajustamos o horário no mesmo dia ou reagendamos sem taxa extra.',
  },
  {
    id: 'tpl-6',
    title: '06. Fechamento, Reserva e Pagamento via Pix',
    category: 'Fechamento e Pix',
    content:
      'Perfeito, {cliente}! Para garantir oficialmente o horário de {data} às {horario} na nossa agenda:\n\n• Valor total: {valor}\n• Reserva com sinal de 50% via Pix (o restante na chegada do carro ou antes da saída).\n\nAssim que enviar o comprovante, já bloqueio o horário e te envio o protocolo da homenagem de {homenageado}!',
  },
  {
    id: 'tpl-7',
    title: '07. Enviar Link do Agendamento Automático',
    category: 'Fechamento e Pix',
    content:
      'Olá, {cliente}! Se preferir preencher tudo rapidinho (escolher Champanhe ou Chocolate, confirmar os fogos, enviar as 3 músicas, idade e endereço) e já garantir o horário atualizado na hora, é só acessar nosso agendamento online!',
  },
  {
    id: 'tpl-8',
    title: '08. Confirmação no Dia e Aviso de Carro a Caminho',
    category: 'Confirmação e Rota',
    content:
      'Bom dia, {cliente}! Passando para confirmar que está tudo certo com a homenagem de {homenageado} hoje ({data}) às {horario} em {endereco}.\n\nAs 3 músicas e a locução já estão separadas no carro. Avisaremos assim que estivermos chegando próximo ao local!',
  },
];
