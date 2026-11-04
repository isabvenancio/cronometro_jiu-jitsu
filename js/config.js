// Opções do treino, valores padrão e validação dos ajustes.

export const OPCOES_ROUND = [[180, '3 min'], [240, '4 min'], [300, '5 min'], [360, '6 min'], [420, '7 min'], [480, '8 min'], [600, '10 min']];
export const OPCOES_DESCANSO = [[0, 'Sem'], [30, '30 s'], [60, '1 min'], [90, '1:30'], [120, '2 min'], [180, '3 min']];
export const OPCOES_QTD_ROUNDS = [[1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5'], [6, '6'], [8, '8'], [10, '10'], [0, 'Livre']];
export const OPCOES_PREPARACAO = [[0, 'Sem'], [5, '5 s'], [10, '10 s'], [15, '15 s'], [30, '30 s']];

// Tempo de luta IBJJF, adulto, por faixa: [nome, segundos, cor da faixa, cor da ponteira].
// A ponteira é preta em todas, menos na faixa preta, que tem ponteira vermelha.
export const FAIXAS = [
  ['Branca', 300, '#f1efe8', '#151515'],
  ['Azul', 360, '#1f4fbf', '#151515'],
  ['Roxa', 420, '#6a3d9e', '#151515'],
  ['Marrom', 480, '#6b4428', '#151515'],
  ['Preta', 600, '#161616', '#c8202b'],
];

// work = duração do round, rest = descanso, rounds = quantidade (0 = livre),
// prep = preparação antes do 1º round, warn = aviso de 30 segundos. Tudo em segundos.
export const CONFIG_PADRAO = { work: 300, rest: 60, rounds: 5, prep: 10, warn: true };

export const NOME_FASE = { idle: 'Pronto', prep: 'Preparar', work: 'Luta', rest: 'Descanso', done: 'Fim do treino' };

function escolher(valor, opcoes, padrao) {
  return opcoes.some(o => o[0] === valor) ? valor : padrao;
}

// Garante que os ajustes recebidos (do celular, do localStorage) só tenham valores válidos.
export function validarConfig(c) {
  c = (c && typeof c === 'object') ? c : {};
  return {
    work: escolher(c.work, OPCOES_ROUND, CONFIG_PADRAO.work),
    rest: escolher(c.rest, OPCOES_DESCANSO, CONFIG_PADRAO.rest),
    rounds: escolher(c.rounds, OPCOES_QTD_ROUNDS, CONFIG_PADRAO.rounds),
    prep: escolher(c.prep, OPCOES_PREPARACAO, CONFIG_PADRAO.prep),
    warn: c.warn !== false,
  };
}
