// Funções puras que transformam o estado do cronômetro em texto para a tela.

import { NOME_FASE } from './config.js';

const pad = n => String(n).padStart(2, '0');

// 299400 ms -> "05:00" (arredonda para cima, como um cronômetro regressivo)
export function formatarTempo(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return pad(Math.floor(s / 60)) + ':' + pad(s % 60);
}

// 300 -> "5 min", 90 -> "1:30", 30 -> "30 s"
export function formatarDuracao(seg) {
  if (seg < 60) return seg + ' s';
  return seg % 60 ? Math.floor(seg / 60) + ':' + pad(seg % 60) : (seg / 60) + ' min';
}

export function duracaoDaFase(cfg, fase) {
  const seg = fase === 'prep' ? cfg.prep : fase === 'work' ? cfg.work : fase === 'rest' ? cfg.rest : 0;
  return seg * 1000;
}

// Fração da fase atual já cumprida, de 0 a 1 (barra de progresso).
export function progresso(s) {
  if (s.phase === 'done') return 1;
  if (s.phase === 'idle') return 0;
  const d = duracaoDaFase(s.cfg, s.phase);
  return d ? Math.min(1, Math.max(0, 1 - s.remaining / d)) : 0;
}

export function nomeFase(s) {
  return NOME_FASE[s.phase];
}

export function textoRound(s) {
  const c = s.cfg;
  const total = c.rounds ? ' de ' + c.rounds : '';
  switch (s.phase) {
    case 'idle': return c.rounds ? c.rounds + ' rounds de ' + formatarDuracao(c.work) : 'Rounds livres de ' + formatarDuracao(c.work);
    case 'prep': return 'Round 1' + total + ' a seguir';
    case 'work': return 'Round ' + s.round + total;
    case 'rest': return 'Round ' + s.round + total + ' concluído';
    case 'done': return s.round + (s.round === 1 ? ' round concluído' : ' rounds concluídos');
  }
}

export function textoProximo(s, dicaParado) {
  const c = s.cfg;
  switch (s.phase) {
    case 'idle': return dicaParado;
    case 'prep': return 'Depois: round 1 · ' + formatarDuracao(c.work);
    case 'work':
      if (c.rounds && s.round >= c.rounds) return 'Último round';
      return c.rest > 0 ? 'Depois: descanso de ' + formatarDuracao(c.rest) : 'Depois: round ' + (s.round + 1);
    case 'rest': return 'Depois: round ' + (s.round + 1) + ' · ' + formatarDuracao(c.work);
    case 'done': return 'Iniciar começa um treino novo';
  }
}

export function estaPausado(s) {
  return !s.running && s.phase !== 'idle' && s.phase !== 'done';
}

export function textoAviso(s) {
  if (estaPausado(s)) return 'Pausado';
  if (s.phase === 'work' && s.warned) return 'Últimos 30 segundos';
  return '';
}

export function textoBotaoPrincipal(s) {
  if (!s || s.phase === 'idle') return 'Iniciar';
  if (s.phase === 'done') return 'Recomeçar';
  return s.running ? 'Pausar' : 'Continuar';
}
