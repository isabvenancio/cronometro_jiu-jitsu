// Motor do cronômetro. Roda só na TV: é ela quem conta o tempo.
// O celular apenas envia comandos e mostra o estado que a TV devolve.
//
// Fases: idle (parado) -> prep (preparação) -> work (luta) -> rest (descanso) -> work ... -> done (fim)

import { validarConfig } from './config.js';
import { duracaoDaFase } from './formato.js';

export class Cronometro {
  /**
   * @param {object} cfg ajustes iniciais
   * @param {{aoMudar?: Function, sons?: object}} opcoes
   *   aoMudar é chamado sempre que o estado muda (para redesenhar e avisar os celulares).
   */
  constructor(cfg, { aoMudar = () => {}, sons = {} } = {}) {
    this.aoMudar = aoMudar;
    this.sons = sons;
    this.estado = Cronometro.novoEstado(validarConfig(cfg));
    this.terminaEm = 0;      // performance.now() em que a fase atual acaba
    this.ultimoBipe = null;  // último segundo em que tocou a contagem 3-2-1
  }

  static novoEstado(cfg) {
    return { cfg: { ...cfg }, phase: 'idle', round: 0, remaining: cfg.work * 1000, running: false, warned: false };
  }

  get cfg() { return this.estado.cfg; }

  // ----- comandos (vindos do celular, do teclado ou dos botões da TV) -----

  comando(dados) {
    if (!dados || typeof dados !== 'object') return;
    const s = this.estado;
    switch (dados.a) {
      case 'toggle':
        if (s.phase === 'idle') this.comecar();
        else if (s.phase === 'done') { this.estado = Cronometro.novoEstado(s.cfg); this.comecar(); }
        else if (s.running) this.pausar();
        else this.continuar();
        break;
      case 'reset':
        this.estado = Cronometro.novoEstado(s.cfg);
        this.aoMudar();
        break;
      case 'skip':
        if (s.phase === 'idle') this.comecar();
        else if (s.phase !== 'done') this.avancar();
        break;
      case 'config':
        this.estado = Cronometro.novoEstado(validarConfig(dados.cfg));
        this.aoMudar();
        break;
    }
  }

  comecar() {
    if (this.cfg.prep > 0) this.entrar('prep', 0);
    else this.entrar('work', 1);
  }

  pausar() {
    this.estado.remaining = Math.max(0, this.terminaEm - performance.now());
    this.estado.running = false;
    this.aoMudar();
  }

  continuar() {
    this.terminaEm = performance.now() + this.estado.remaining;
    this.estado.running = true;
    this.aoMudar();
  }

  // ----- transições -----

  entrar(fase, round) {
    const s = this.estado;
    s.phase = fase;
    s.round = round;
    s.remaining = duracaoDaFase(s.cfg, fase);
    s.running = true;
    s.warned = false;
    this.ultimoBipe = null;
    this.terminaEm = performance.now() + s.remaining;
    if (fase === 'work') this.sons.inicioLuta?.();
    else if (fase === 'rest') this.sons.fimRound?.();
    else if (fase === 'prep') this.sons.preparacao?.();
    this.aoMudar();
  }

  avancar() {
    const s = this.estado, c = s.cfg;
    if (s.phase === 'prep') return this.entrar('work', 1);
    if (s.phase === 'work') {
      if (c.rounds && s.round >= c.rounds) return this.terminar();
      return c.rest > 0 ? this.entrar('rest', s.round) : this.entrar('work', s.round + 1);
    }
    if (s.phase === 'rest') return this.entrar('work', s.round + 1);
  }

  terminar() {
    const s = this.estado;
    s.phase = 'done';
    s.running = false;
    s.remaining = 0;
    this.sons.fimTreino?.();
    this.aoMudar();
  }

  // Chamado várias vezes por segundo pelo laço principal.
  tique() {
    const s = this.estado;
    if (!s.running) return;
    s.remaining = Math.max(0, this.terminaEm - performance.now());
    const seg = Math.ceil(s.remaining / 1000);

    // contagem 3-2-1 antes de voltar a lutar
    if ((s.phase === 'prep' || s.phase === 'rest') && seg >= 1 && seg <= 3 && seg !== this.ultimoBipe) {
      this.ultimoBipe = seg;
      this.sons.contagem?.();
    }
    // aviso de 30 segundos
    if (s.phase === 'work' && s.cfg.warn && !s.warned && s.cfg.work > 30 && s.remaining <= 30000) {
      s.warned = true;
      this.sons.aviso30s?.();
      this.aoMudar();
    }
    if (s.remaining <= 0) this.avancar();
  }

  // Versão enxuta do estado que vai para os celulares.
  foto() {
    const s = this.estado;
    return { phase: s.phase, round: s.round, remaining: Math.round(s.remaining), running: s.running, warned: s.warned, cfg: s.cfg };
  }
}
