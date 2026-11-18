import { OccasionType } from '../types/booking';

export interface GenerateTributeParams {
  occasion: OccasionType | string;
  honoreeName: string;
  honoreeAge?: string;
  senderName: string;
  songs: string[];
  tone?: string;
  extraDetails?: string;
}

export function generateLocalTributeMessage(
  params: GenerateTributeParams
): string {
  const honoree = params.honoreeName.trim() || 'você';
  const sender = params.senderName.trim() || 'quem te ama muito';
  const age = params.honoreeAge?.trim();
  const ageText = age
    ? age.toLowerCase().includes('ano')
      ? age
      : `${age} anos`
    : '';
  const cleanSongs = params.songs.map((s) => s.trim()).filter(Boolean);
  const firstSong = cleanSongs[0]
    ? `Preparamos uma trilha sonora especial começando com "${cleanSongs[0]}"`
    : 'Preparamos uma trilha sonora escolhida a dedo';

  if (params.occasion === 'Aniversário') {
    const ageLine = ageText
      ? `Celebrar os seus ${ageText} é celebrar a alegria que você espalha por onde passa.`
      : 'Celebrar mais um ano da sua vida é motivo de imensa gratidão e alegria.';
    const toneEnding =
      params.tone === 'Alegre e festivo'
        ? 'Hoje é dia de sorrir, brindar, agradecer a Deus pela sua vida e comemorar em grande estilo com quem torce por você!'
        : 'Que este novo ciclo venha cheio de saúde, paz, conquistas e muitos motivos para sorrir ao lado de quem te ama.';

    return [
      `Atenção especial para ${honoree}! Hoje a Desperte Corações parou bem na sua porta a pedido de ${sender} para te entregar este abraço em forma de música e emoção.`,
      ageLine,
      `${firstSong} porque você merece sentir todo o carinho guardado para este dia. ${toneEnding}`,
      `Feliz aniversário, ${honoree}! Receba todo o amor e a homenagem de ${sender}.`,
    ].join('\n\n');
  }

  if (params.occasion === 'Reconciliação') {
    return [
      `${honoree}, por favor dê uma pausa por alguns instantes e ouça o que o coração de ${sender} pediu para dizer hoje ao vivo.`,
      `Nem sempre as palavras ditas no dia a dia dão conta do que a gente sente de verdade. O que importa agora é a sinceridade do desejo de recomeçar com mais diálogo, calma, respeito e carinho.`,
      `${firstSong} para lembrar tudo de bonito que vocês já construíram juntos. Quando o sentimento é verdadeiro, sempre vale a pena abrir a porta para a paz e para uma nova chance. Com todo carinho, ${sender}.`,
    ].join('\n\n');
  }

  if (params.occasion === 'Declaração de Amor') {
    return [
      `Boa tarde, ou melhor, um momento inesquecível para ${honoree}! ${sender} preparou esta surpresa porque existem sentimentos que não cabem mais apenas em mensagens de celular.`,
      `Você faz os dias comuns ficarem mais leves, traz paz para a rotina e dá sentido aos planos do futuro. ${firstSong} para marcar este capítulo lindo da história de vocês.`,
      `Receba esta declaração ao vivo como prova de admiração, cuidado e amor verdadeiro de ${sender}!`,
    ].join('\n\n');
  }

  return [
    `Hoje a homenagem especial da Desperte Corações é dedicada a ${honoree}, um pedido cheio de gratidão e carinho enviado por ${sender}.`,
    ageText
      ? `Nesta etapa especial de ${ageText}, queremos reconhecer o quanto a sua presença, força e dedicação fazem diferença na vida de todos à sua volta.`
      : `Queremos reconhecer o quanto a sua presença, história e dedicação fazem diferença na vida de todos à sua volta.`,
    `${firstSong} para tornar este instante ainda mais marcante. Receba este aplauso e esta homenagem ao vivo com todo o carinho de ${sender}!`,
  ].join('\n\n');
}
