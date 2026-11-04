// Sons gerados na hora com a Web Audio API (não precisa de arquivos de áudio).
// Os navegadores só liberam som depois de um toque ou tecla, por isso existe ativar().

import { salvar, carregar } from './armazenamento.js';

let contexto = null;
let ligado = carregar('sound') !== false;

export function ativarSom() {
  try {
    if (!contexto) contexto = new (window.AudioContext || window.webkitAudioContext)();
    if (contexto.state === 'suspended') contexto.resume();
  } catch (e) { /* navegador sem áudio */ }
}

export function somLiberado() {
  return !!(contexto && contexto.state === 'running');
}

export function somLigado() {
  return ligado;
}

export function alternarSom() {
  ligado = !ligado;
  salvar('sound', ligado);
  if (ligado) { ativarSom(); tom(880, 0.1); }
  return ligado;
}

function tom(freq, duracao, { tipo = 'square', volume = 0.2, atraso = 0 } = {}) {
  if (!ligado || !somLiberado()) return;
  const t = contexto.currentTime + atraso;
  const osc = contexto.createOscillator();
  const ganho = contexto.createGain();
  osc.type = tipo;
  osc.frequency.value = freq;
  ganho.gain.setValueAtTime(0, t);
  ganho.gain.linearRampToValueAtTime(volume, t + 0.01);
  ganho.gain.setValueAtTime(volume, t + duracao - 0.04);
  ganho.gain.linearRampToValueAtTime(0, t + duracao);
  osc.connect(ganho);
  ganho.connect(contexto.destination);
  osc.start(t);
  osc.stop(t + duracao + 0.02);
}

function buzina(atraso = 0) {
  tom(196, 0.9, { tipo: 'sawtooth', volume: 0.24, atraso });
  tom(208, 0.9, { tipo: 'square', volume: 0.1, atraso });
}

export const sons = {
  inicioLuta() { buzina(); },
  fimRound() { buzina(); buzina(1.05); },
  aviso30s() { tom(1320, 0.14); tom(1320, 0.14, { atraso: 0.22 }); },
  contagem() { tom(880, 0.12); },
  preparacao() { tom(660, 0.1); },
  fimTreino() { buzina(); buzina(1.05); buzina(2.1); },
};
