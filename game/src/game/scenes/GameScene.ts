/**
 * GameScene — главная сцена игры (T-032..T-037).
 *
 * Владеет GameEngine (core). Создаёт BoardView, HandView, HudView, EnergyView,
 * FuryView, DragController. Ввод единый: все фигуры (обычные, радужные,
 * спецфигуры-детонаторы) перетаскиваются; тап по двум одинаковым спецфигурам
 * мержит их в следующую ступень (гибрид B).
 *
 * Цикл: ход → engine.placePiece → PlacementResult → детонация (если спецфигура)
 * → FX линий → FX очищения → перерисов → тосты → game over.
 *
 * Не считает сама линии/очки — всё через engine. Phaser — только view/input.
 */
import Phaser from 'phaser';
import { GameEngine } from '../../core/engine';
import { currentMultiplier } from '../../core/fury';
import { findElementalThreads } from '../../core/lines';
import { SPECIAL_ELEMENT } from '../../core/specials';
import type {
  Cell,
  ElementId,
  GameState,
  Piece,
  PlacementResult,
  SpecialType,
  Vec2,
} from '../../core/types';
import {
  COLOR_BG,
  COLOR_BUTTON_SECONDARY,
  COLOR_BUTTON_SECONDARY_EDGE,
  COLOR_GOLD,
  COLOR_MULTI,
  COLOR_OVERLAY,
  COLOR_PANEL,
  COLOR_PANEL_SHADOW,
  COLOR_TEXT,
  COLOR_TEXT_DIM,
  ELEMENT_COLORS,
  ELEMENT_NAMES,
  FONT_FAMILY,
} from '../../config/elements';
import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  BACK_BUTTON_X,
  BACK_BUTTON_Y,
  BOARD_TOP,
  BOARD_X,
  CELL_SIZE,
} from '../layout';
import { BoardView } from '../objects/BoardView';
import { HandView } from '../objects/HandView';
import { HudView } from '../objects/HudView';
import { EnergyView } from '../objects/EnergyView';
import { FuryView } from '../objects/FuryView';
import { DragController } from '../input/DragController';
import { Button } from '../ui/Button';
import { REG_META } from './MenuScene';
import { REG_DEBUG_PRESET } from './DebugHubScene';
import { applyDebugPreset } from '../debug/presets';
import { DebugPanel } from '../debug/DebugPanel';
import { loadMeta, updateMetaAfterGame, type PlayerMeta } from '../../platform/storage';
import { LineClearFx } from '../fx/LineClearFx';
import { CleansingFx } from '../fx/CleansingFx';
import { DetonationFx } from '../fx/DetonationFx';
import { EnergyBoltFx, type BoltSpec } from '../fx/EnergyBoltFx';
import { ToastManager, type ToastData } from '../ui/Toast';
import type { MergeResult } from '../../core/hand';
import { ENERGY_CAPACITY } from '../../config/balance';

/** Частота тика Fury (мс) — для истечения таймера по timestamp. */
const FURY_TICK_MS = 200;

/** Лейблы детонаторов (тосты/рука). */
const SPECIAL_LABELS: Record<SpecialType, string> = {
  fire: '🔥 Пожар',
  tide: '💧 Прилив',
  vortex: '🌀 Вихрь',
  spring: '🌿 Родник',
};

/** Заголовки тостов детонаций. */
const DETONATION_TITLES: Record<SpecialType, string> = {
  fire: 'ПОЖАР!',
  tide: 'ПРИЛИВ!',
  vortex: 'ВИХРЬ!',
  spring: 'РОДНИК!',
};

export class GameScene extends Phaser.Scene {
  private engine!: GameEngine;
  private boardView!: BoardView;
  private handView!: HandView;
  private hudView!: HudView;
  private energyView!: EnergyView;
  private furyView!: FuryView;
  private drag!: DragController;
  private furyTimer!: Phaser.Time.TimerEvent;
  private meta!: PlayerMeta;
  private lineClearFx!: LineClearFx;
  private cleansingFx!: CleansingFx;
  private detonationFx!: DetonationFx;
  private boltFx!: EnergyBoltFx;
  private toasts!: ToastManager;
  private debugPanel: DebugPanel | null = null;

  constructor() {
    super('Game');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLOR_BG);

    // Engine + новая партия.
    this.engine = new GameEngine();
    this.engine.startGame();
    this.meta = (this.registry.get(REG_META) as PlayerMeta | undefined) ?? loadMeta();

    // Дебаг: пресет или песочница (только из DebugHubScene).
    const debugPreset = this.registry.get(REG_DEBUG_PRESET) as string | undefined;
    if (debugPreset) {
      applyDebugPreset(this.engine, debugPreset);
    }

    // View-объекты.
    this.hudView = new HudView(this);
    this.boardView = new BoardView(this);
    this.energyView = new EnergyView(this);
    this.furyView = new FuryView(this);
    this.handView = new HandView(this);

    // FX и UI.
    this.lineClearFx = new LineClearFx(this, this.boardView);
    this.cleansingFx = new CleansingFx(this);
    this.detonationFx = new DetonationFx(this, this.boardView);
    this.boltFx = new EnergyBoltFx(this);
    this.toasts = new ToastManager(this);

    // Кнопка «назад в меню».
    new Button(this, BACK_BUTTON_X, BACK_BUTTON_Y, '← МЕНЮ', () => this.scene.start('Menu'), {
      width: 220,
      height: 80,
      fontSize: 32,
    });

    // Ввод: все фигуры (обычные, радужные, спец) идут через единый drag.
    this.drag = new DragController({
      scene: this,
      engine: this.engine,
      boardView: this.boardView,
      handView: this.handView,
      onPlaced: (result, piece) => this.afterMove(result, piece),
      onMerged: (result) => this.afterMerge(result),
    });

    // Единый обработчик pointerdown: спец-режим имеет приоритет.
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) =>
      this.handlePointerDown(pointer),
    );

    // Дебаг-панель: только если зашли из DebugHubScene.
    if (debugPreset) {
      this.debugPanel = new DebugPanel({
        scene: this,
        engine: this.engine,
        onBoardChanged: () => this.refreshBoard(),
        onHandChanged: () => this.refreshHand(),
        onEnergyChanged: () => this.refreshEnergy(),
      });
      this.registry.remove(REG_DEBUG_PRESET);
    }

    // Таймер Fury: тик engine (истечение по timestamp) + перерисов HUD/Fury.
    this.furyTimer = this.time.addEvent({
      delay: FURY_TICK_MS,
      loop: true,
      callback: () => {
        this.engine.tickFury();
        const now = Date.now();
        const state = this.engine.state;
        this.furyView.update(state.fury, now);
        this.hudView.update(state, currentMultiplier(state.stars, state.fury, now));
      },
    });

    this.refresh();
  }

  /** Единый обработчик pointerdown: кисть дебага над полем, иначе drag. */
  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    // Кисть дебага: тап по клетке красит/стирает, drag не начинается.
    const brush = this.debugPanel?.brushElement;
    if (brush !== null && brush !== undefined) {
      const cellPos = this.pointerToCell(pointer);
      if (cellPos) {
        this.paintCell(cellPos.x, cellPos.y, brush);
        return;
      }
    }
    this.drag.tryStartDrag(pointer);
  }

  /** Клетка поля под указателем (или null вне поля). */
  private pointerToCell(pointer: Phaser.Input.Pointer): Vec2 | null {
    const x = Math.floor((pointer.x - BOARD_X) / CELL_SIZE);
    const y = Math.floor((pointer.y - BOARD_TOP) / CELL_SIZE);
    return x >= 0 && x < 8 && y >= 0 && y < 8 ? { x, y } : null;
  }

  /** Кисть дебага: положить стихию / ластик (-1) в клетку. */
  private paintCell(x: number, y: number, brush: ElementId | -1): void {
    this.engine.state.grid[y]![x] =
      brush === -1 ? null : { element: brush, multi: false, special: false };
    this.refreshBoard();
  }

  /** Мердж двух спецфигур в руке: перерисов руки + тост. */
  private afterMerge(result: MergeResult): void {
    this.refreshHand();
    if (!result.ok || !result.piece) return;
    const label =
      result.piece.kind === 'special' ? this.specialLabel(result.piece.special!) : '🌈 Радужная';
    this.toasts.showAll([
      {
        title: 'МЕРДЖ!',
        subtitle: label,
        accent: COLOR_GOLD,
        big: false,
      },
    ]);
  }

  /** После успешного хода: анимации → перерисов → тосты → game over. */
  private afterMove(result: PlacementResult, piece: Piece): void {
    // Рука и счёт уже изменились в engine — обновляем сразу.
    this.refreshHand();
    this.refreshHud();
    this.debugPanel?.showResult(result);

    if (result.clearedLines.length === 0) {
      this.refreshBoard();
      this.playEnergyGain(result, () => {
        if (!result.gameOver) {
          this.toasts.showAll(this.buildToasts(result));
        }

        this.checkGameOver(result);
      });
      return;
    }

    // На время анимаций блокируем ввод.
    this.drag.cancel();
    this.lockInput();

    this.showPlacedCells(result.placedCells, piece);

    // Детонация спецфигуры: вспышки разрушения/следа, затем линии/очищение.
    const startLineClear = () => {
      this.lineClearFx.play(result.clearedLines, () => {
        this.refreshBoard();

        // Молнии энергии → слоты шкалы (или пипсы переполнения → церемония).
        this.playEnergyGain(result, () => {
          if (!result.gameOver) {
            this.toasts.showAll(this.buildToasts(result));
          }

          this.checkGameOver(result);
        });
      });
    };

    if (result.detonation) {
      this.detonationFx.play(result.detonation, () => {
        this.refreshBoard();
        startLineClear();
      });
    } else {
      startLineClear();
    }
  }

  /** Game over по результату хода или по отсутствию ходов. */
  private checkGameOver(result: PlacementResult): void {
    if (result.gameOver || !this.engine.hasAnyMove()) {
      this.showGameOver();
    }
  }

  /** Показать поставленные клетки на поле до анимации очистки линий. */
  private showPlacedCells(cells: Vec2[], piece: Piece): void {
    const cell = this.cellFromPiece(piece);
    for (const c of cells) {
      this.boardView.getCell(c.x, c.y)?.updateCell(cell);
    }
  }

  /** Как выглядит клетка поставленной фигуры (для отрисовки до очистки). */
  private cellFromPiece(piece: Piece): Cell {
    if (piece.kind === 'special') {
      // Детонатор кладётся как обычная клетка своей стихии (детонация сразу).
      return { element: SPECIAL_ELEMENT[piece.special ?? 'fire'], multi: false, special: false };
    }
    if (piece.kind === 'rainbow') {
      return { element: -1, multi: true, special: false };
    }
    return { element: piece.element ?? 0, multi: false, special: false };
  }

  /** Собрать тосты по результату хода (комбо → очищение → мелкие). */
  private buildToasts(result: PlacementResult): ToastData[] {
    const toasts: ToastData[] = [];

    // Ось Б — комбо.
    if (result.combo) {
      const special = result.specialAdded;
      toasts.push({
        title: `КОМБО ×${result.combo.lines}`,
        subtitle: `+${this.fmt(result.combo.bonusScore)}${
          special ? ` · ${this.specialLabel(special.type)} ×${special.count}` : ''
        }`,
        accent: COLOR_GOLD,
        big: true,
      });
    }

    // Ось В/Г — очищение / чистое очищение.
    if (result.cleansing) {
      const c = result.cleansing;
      toasts.push({
        title: c.isPure ? 'ЧИСТОЕ ОЧИЩЕНИЕ!' : 'ОЧИЩЕНИЕ!',
        subtitle: `+${this.fmt(c.baseScore)} · +${c.stars}★ · +${result.rainbowAdded}🌈`,
        accent: c.isPure ? COLOR_GOLD : ELEMENT_COLORS[c.element]!,
        big: true,
      });
    }

    // Детонация спецфигуры — заметный тост (разрушение/след в цифрах).
    if (result.detonation) {
      const d = result.detonation;
      const parts: string[] = [];
      if (d.destroyed.length > 0) parts.push(`−${d.destroyed.length} клеток`);
      if (d.seeded.length > 0)
        parts.push(`+${d.seeded.length} ${ELEMENT_NAMES[d.element]!.toLowerCase()}`);
      if (d.repainted.length > 0) parts.push(`~${d.repainted.length} перекрашено`);
      toasts.push({
        title: DETONATION_TITLES[d.type],
        subtitle: `+${this.fmt(result.scoreGained)}${parts.length > 0 ? ` · ${parts.join(' · ')}` : ''}`,
        accent: ELEMENT_COLORS[d.element]!,
        big: true,
      });
    }

    // Мелкий тост за обычные ходы с очками.
    if (toasts.length === 0 && result.scoreGained > 0) {
      const firstElemental = result.clearedLines.find((l) => l.isElemental);
      const accent =
        firstElemental && firstElemental.element !== null
          ? ELEMENT_COLORS[firstElemental.element]!
          : COLOR_MULTI;

      toasts.push({
        title: `+${this.fmt(result.scoreGained)}`,
        subtitle:
          result.elementalLines > 0
            ? 'Стихийная линия! +1⚡'
            : result.clearedLines.length > 0
              ? `Линии: ${result.clearedLines.length}`
              : undefined,
        accent,
        big: false,
      });
    }

    return toasts;
  }

  /** Человекочитаемое имя детонатора для тостов. */
  private specialLabel(type: SpecialType): string {
    return SPECIAL_LABELS[type];
  }

  /** Блокировка ввода на время анимаций. */
  private lockInput(): void {
    this.input.enabled = false;
  }

  /** Разблокировка ввода после анимаций. */
  private unlockInput(): void {
    this.input.enabled = true;
  }

  /** Полный перерисов из состояния engine. */
  private refresh(): void {
    this.refreshBoard();
    this.refreshHand();
    this.refreshEnergy();
    this.refreshHud();
  }

  /** Обновить только поле. */
  private refreshBoard(): void {
    this.boardView.update(this.engine.state.grid);
    // Нити неполных стихийных линий (DES-6); радуга в руке → радужная обводка.
    this.boardView.showThreads(
      findElementalThreads(this.engine.state.grid),
      this.engine.state.hand.some((p) => p?.kind === 'rainbow'),
    );
  }

  /** Обновить руку. */
  private refreshHand(): void {
    this.handView.update(this.engine.state.hand);
  }

  /** Обновить энергию и Fury-индикатор. */
  private refreshEnergy(): void {
    const now = Date.now();
    const state: GameState = this.engine.state;

    this.energyView.update(state.energy);
    this.furyView.update(state.fury, now);
  }

  /**
   * Молнии энергии (DES-7): из мест источников в слоты шкалы, по завершении —
   * обновление шкалы, разблокировка ввода и продолжение. При Очищении лишние
   * молнии летят в пипсы переполнения, затем церемония (CleansingFx).
   */
  private playEnergyGain(result: PlacementResult, onDone: () => void): void {
    const cleansing = result.cleansing;
    const gains = this.collectEnergyGains(result);

    if (gains.length === 0) {
      this.refreshEnergy();
      this.unlockInput();
      onDone();
      return;
    }

    this.lockInput();

    // Цель: i-й слот шкалы; лишние заряды (переполнение) — в зону пипсов.
    const bolts: BoltSpec[] = gains.map((g, i) => ({
      element: g.element,
      from: {
        x: BOARD_X + (g.from.x + 0.5) * CELL_SIZE,
        y: BOARD_TOP + (g.from.y + 0.5) * CELL_SIZE,
      },
      to: i < ENERGY_CAPACITY ? this.energyView.slotCenter(i) : this.energyView.overflowTarget(),
    }));

    this.boltFx.play(bolts, {
      onAll: () => {
        if (cleansing) {
          // Пипсы «+N» и множитель → вспышка/кольца церемонии → шкала пуста.
          this.energyView.showOverflow(cleansing.overflow, cleansing.furyMult);
          this.cleansingFx.play(cleansing.element, cleansing.overflow, cleansing.isPure, () => {
            this.energyView.hideOverflow();
            this.refreshEnergy();
            this.unlockInput();
            onDone();
          });
        } else {
          this.refreshEnergy();
          this.unlockInput();
          onDone();
        }
      },
    });
  }

  /**
   * Источники энергии хода с координатами (центр области). Порядок повторяет
   * core (engine.ts: [...detonationEnergy, ...scan.gainedElements]; snapshot.ts:
   * стихийные линии — строки, затем столбцы). clearedLines приходит в том же
   * порядке скана, поэтому фильтр isElemental даёт порядок gainedElements.
   */
  private collectEnergyGains(result: PlacementResult): { element: ElementId; from: Vec2 }[] {
    const gains: { element: ElementId; from: Vec2 }[] = [];

    const det = result.detonation;
    if (det && det.region.length > 0) {
      const sum = det.region.reduce((a, c) => ({ x: a.x + c.x, y: a.y + c.y }), { x: 0, y: 0 });
      gains.push({
        element: det.element,
        from: { x: sum.x / det.region.length, y: sum.y / det.region.length },
      });
    }

    for (const line of result.clearedLines) {
      if (!line.isElemental || line.element === null) continue;
      const sum = line.cells.reduce((a, c) => ({ x: a.x + c.x, y: a.y + c.y }), { x: 0, y: 0 });
      gains.push({
        element: line.element,
        from: { x: sum.x / line.cells.length, y: sum.y / line.cells.length },
      });
    }

    return gains;
  }

  /** Обновить HUD (счёт/рекорд/звёзды/множитель). */
  private refreshHud(): void {
    const now = Date.now();
    const state: GameState = this.engine.state;

    const mult = currentMultiplier(state.stars, state.fury, now);
    this.hudView.update(state, mult);
  }

  /** Game over: сохраняем meta, показываем оверлей. */
  private showGameOver(): void {
    this.furyTimer.remove();
    this.drag.cancel();

    const state = this.engine.state;
    this.meta = updateMetaAfterGame(state.score, state.stars, this.meta);
    this.registry.set(REG_META, this.meta);

    const overlay = this.add
      .rectangle(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, COLOR_OVERLAY, 0.55)
      .setOrigin(0)
      .setDepth(200);

    const panel = this.add.container(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2).setDepth(201);

    const bg = this.add.graphics();
    bg.fillStyle(COLOR_PANEL_SHADOW, 0.3);
    bg.fillRoundedRect(-436, -336, 880, 680, 32);
    bg.fillStyle(COLOR_PANEL, 1);
    bg.fillRoundedRect(-440, -340, 880, 680, 32);
    panel.add(bg);

    panel.add(
      this.add
        .text(0, -240, 'ИГРА ОКОНЧЕНА', {
          fontFamily: FONT_FAMILY,
          fontSize: '64px',
          color: this.hex(COLOR_GOLD),
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    );

    panel.add(
      this.add
        .text(0, -130, `СЧЁТ\n${this.fmt(state.score)}`, {
          fontFamily: FONT_FAMILY,
          fontSize: '48px',
          color: this.hex(COLOR_TEXT),
          align: 'center',
        })
        .setOrigin(0.5),
    );

    const isBest = state.score >= this.meta.best;
    panel.add(
      this.add
        .text(0, 0, isBest ? '★ НОВЫЙ РЕКОРД!' : `Рекорд: ${this.fmt(this.meta.best)}`, {
          fontFamily: FONT_FAMILY,
          fontSize: '36px',
          color: this.hex(isBest ? COLOR_GOLD : COLOR_TEXT_DIM),
        })
        .setOrigin(0.5),
    );

    panel.add(
      this.add
        .text(0, 70, `★ ${this.meta.stars}`, {
          fontFamily: FONT_FAMILY,
          fontSize: '40px',
          color: this.hex(COLOR_GOLD),
        })
        .setOrigin(0.5),
    );

    // Кнопки.
    new Button(this, DESIGN_WIDTH / 2 - 220, DESIGN_HEIGHT / 2 + 180, 'ЗАНОВО', () => {
      overlay.destroy();
      panel.destroy();
      this.scene.restart();
    });
    new Button(
      this,
      DESIGN_WIDTH / 2 + 220,
      DESIGN_HEIGHT / 2 + 180,
      'МЕНЮ',
      () => {
        overlay.destroy();
        panel.destroy();
        this.scene.start('Menu');
      },
      {
        fillColor: COLOR_BUTTON_SECONDARY,
        edgeColor: COLOR_BUTTON_SECONDARY_EDGE,
        textColor: COLOR_TEXT,
      },
    );

    // Подсказка про continue (Milestone 3, T-046).
    panel.add(
      this.add
        .text(0, 250, '(continue будет в M3)', {
          fontFamily: FONT_FAMILY,
          fontSize: '26px',
          color: this.hex(COLOR_TEXT_DIM),
        })
        .setOrigin(0.5),
    );

    void overlay;
  }

  private hex(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }

  private fmt(n: number): string {
    return n.toLocaleString('ru-RU');
  }
}
