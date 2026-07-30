/**
 * GameScene — главная сцена игры (T-032..T-037).
 *
 * Владеет GameEngine (core). Создаёт BoardView, HandView, HudView, EnergyView,
 * FuryView, DragController, SpecialInputController. Маршрутизирует ввод:
 * pointerdown сначала идёт в SpecialInputController (если тап по спецфигуре или
 * спец-режим активен), иначе — в DragController.
 *
 * Цикл: ход → engine.placePiece/useSpecial → PlacementResult → перерисов.
 * Game over → in-scene оверлей (Restart/Menu). Rewarded-continue — T-046 (M3).
 *
 * Не считает сама линии/очки — всё через engine. Phaser — только view/input.
 */
import Phaser from 'phaser';
import { GameEngine } from '../../core/engine';
import { currentMultiplier } from '../../core/fury';
import type { GameState, PlacementResult, SpecialType } from '../../core/types';
import {
  COLOR_BG,
  COLOR_GOLD,
  COLOR_MULTI,
  COLOR_TEXT,
  COLOR_TEXT_DIM,
  ELEMENT_COLORS,
} from '../../config/elements';
import { DESIGN_HEIGHT, DESIGN_WIDTH, BACK_BUTTON_X, BACK_BUTTON_Y } from '../layout';
import { BoardView } from '../objects/BoardView';
import { HandView } from '../objects/HandView';
import { HudView } from '../objects/HudView';
import { EnergyView } from '../objects/EnergyView';
import { FuryView } from '../objects/FuryView';
import { DragController } from '../input/DragController';
import { SpecialInputController } from '../input/SpecialInputController';
import { Button } from '../ui/Button';
import { REG_META } from './MenuScene';
import { loadMeta, updateMetaAfterGame, type PlayerMeta } from '../../platform/storage';
import { LineClearFx } from '../fx/LineClearFx';
import { CleansingFx } from '../fx/CleansingFx';
import { ToastManager, type ToastData } from '../ui/Toast';

/** Частота тика Fury (мс) — для истечения таймера по timestamp. */
const FURY_TICK_MS = 200;

export class GameScene extends Phaser.Scene {
  private engine!: GameEngine;
  private boardView!: BoardView;
  private handView!: HandView;
  private hudView!: HudView;
  private energyView!: EnergyView;
  private furyView!: FuryView;
  private drag!: DragController;
  private specialInput!: SpecialInputController;
  private furyTimer!: Phaser.Time.TimerEvent;
  private meta!: PlayerMeta;
  private lineClearFx!: LineClearFx;
  private cleansingFx!: CleansingFx;
  private toasts!: ToastManager;

  constructor() {
    super('Game');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLOR_BG);

    // Engine + новая партия.
    this.engine = new GameEngine();
    this.engine.startGame();
    this.meta = (this.registry.get(REG_META) as PlayerMeta | undefined) ?? loadMeta();

    // View-объекты.
    this.hudView = new HudView(this);
    this.boardView = new BoardView(this);
    this.energyView = new EnergyView(this);
    this.furyView = new FuryView(this);
    this.handView = new HandView(this);

    // FX и UI.
    this.lineClearFx = new LineClearFx(this, this.boardView);
    this.cleansingFx = new CleansingFx(this);
    this.toasts = new ToastManager(this);

    // Кнопка «назад в меню».
    new Button(this, BACK_BUTTON_X, BACK_BUTTON_Y, '← МЕНЮ', () => this.scene.start('Menu'), {
      width: 220,
      height: 80,
      fontSize: 32,
    });

    // Ввод. GameScene — единый маршрутизатор pointerdown.
    this.drag = new DragController({
      scene: this,
      engine: this.engine,
      boardView: this.boardView,
      handView: this.handView,
      onPlaced: (result) => this.afterMove(result),
    });
    this.specialInput = new SpecialInputController({
      scene: this,
      engine: this.engine,
      boardView: this.boardView,
      handView: this.handView,
      onUsed: (result) => this.afterMove(result),
    });

    // Единый обработчик pointerdown: спец-режим имеет приоритет.
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) =>
      this.handlePointerDown(pointer),
    );

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

  /**
   * Маршрутизатор pointerdown.
   * 1. Если спец-режим активен — тап по полю меняет target, тап по другой
   *    спецфигуре переключает выбор. (тап по обычной фигуре во время спец-режима
   *    игнорируем — пусть сначала отменит.)
   * 2. Иначе если тап по спецфигуре — запускаем спец-режим.
   * 3. Иначе — отдаём DragController (обычная/rainbow фигура).
   */
  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.specialInput.isActive()) {
      // Тап по полю → обновить target спецфигуры.
      if (this.specialInput.handleBoardTap(pointer.x, pointer.y)) return;
      // Тап по другой спецфигуре → переключение.
      const id = this.pieceIdAt(pointer);
      if (id && this.isSpecialPiece(id)) {
        this.specialInput.handlePieceTap(id);
        return;
      }
      return; // в спец-режиме обычные тапы поглощаются
    }

    // Тап по спецфигуре → запуск спец-режима.
    const id = this.pieceIdAt(pointer);
    if (id && this.isSpecialPiece(id)) {
      this.specialInput.handlePieceTap(id);
      return;
    }

    // Иначе — drag обычной/rainbow фигуры.
    this.drag.tryStartDrag(pointer);
  }

  /** id фигуры под курсором или null. */
  private pieceIdAt(pointer: Phaser.Input.Pointer): string | null {
    const view = this.handView.getPieceViews().find((v) => this.hitPieceView(pointer, v));
    return view?.pieceId ?? null;
  }

  private isSpecialPiece(pieceId: string): boolean {
    const piece = this.engine.state.hand.find((p) => p?.id === pieceId);
    return piece?.kind === 'special';
  }

  private hitPieceView(
    pointer: Phaser.Input.Pointer,
    view: { x: number; y: number; slotSize: number },
  ): boolean {
    const half = view.slotSize / 2;
    return (
      pointer.x >= view.x - half &&
      pointer.x <= view.x + half &&
      pointer.y >= view.y - half &&
      pointer.y <= view.y + half
    );
  }

  /** После успешного хода: анимации → перерисов → тосты → game over. */
  private afterMove(result: PlacementResult): void {
    // Рука и счёт уже изменились в engine — обновляем сразу.
    this.refreshHand();
    this.refreshHud();

    if (result.clearedLines.length === 0) {
      this.refreshBoard();
      this.refreshEnergy();

      if (!result.gameOver) {
        this.toasts.showAll(this.buildToasts(result));
      }

      this.checkGameOver(result);
      return;
    }

    // На время анимаций блокируем ввод.
    this.drag.cancel();
    this.specialInput.cancel();
    this.lockInput();

    this.lineClearFx.play(result.clearedLines, () => {
      this.refreshBoard();

      const cleansing = result.cleansing;

      if (cleansing) {
        // Очищение: вспышка + кольца, затем энергия/радужные/Fury и тосты.
        this.cleansingFx.play(cleansing.element, cleansing.overflow, cleansing.isPure, () => {
          this.refreshEnergy();
          this.unlockInput();

          if (!result.gameOver) {
            this.toasts.showAll(this.buildToasts(result));
          }

          this.checkGameOver(result);
        });
      } else {
        this.refreshEnergy();
        this.unlockInput();

        if (!result.gameOver) {
          this.toasts.showAll(this.buildToasts(result));
        }

        this.checkGameOver(result);
      }
    });
  }

  /** Game over по результату хода или по отсутствию ходов. */
  private checkGameOver(result: PlacementResult): void {
    if (result.gameOver || !this.engine.hasAnyMove()) {
      this.showGameOver();
    }
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

  /** Человекочитаемое имя спецфигуры для тостов. */
  private specialLabel(type: SpecialType): string {
    switch (type) {
      case 'bomb':
        return '💣 Bomb';
      case 'line':
        return '⚡ Line';
      case 'cross':
        return '✚ Cross';
      case 'apocalypse':
        return '☄ Apocalypse';
      default:
        return type;
    }
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
      .rectangle(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, 0x000000, 0.75)
      .setOrigin(0)
      .setDepth(200);

    const panel = this.add.container(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2).setDepth(201);

    const bg = this.add.graphics();
    bg.fillStyle(0x2d2b40, 1);
    bg.fillRoundedRect(-440, -340, 880, 680, 32);
    panel.add(bg);

    panel.add(
      this.add
        .text(0, -240, 'ИГРА ОКОНЧЕНА', {
          fontFamily: 'system-ui, Arial, sans-serif',
          fontSize: '64px',
          color: this.hex(COLOR_GOLD),
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    );

    panel.add(
      this.add
        .text(0, -130, `СЧЁТ\n${this.fmt(state.score)}`, {
          fontFamily: 'system-ui, Arial, sans-serif',
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
          fontFamily: 'system-ui, Arial, sans-serif',
          fontSize: '36px',
          color: this.hex(isBest ? COLOR_GOLD : COLOR_TEXT_DIM),
        })
        .setOrigin(0.5),
    );

    panel.add(
      this.add
        .text(0, 70, `★ ${this.meta.stars}`, {
          fontFamily: 'system-ui, Arial, sans-serif',
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
    new Button(this, DESIGN_WIDTH / 2 + 220, DESIGN_HEIGHT / 2 + 180, 'МЕНЮ', () => {
      overlay.destroy();
      panel.destroy();
      this.scene.start('Menu');
    });

    // Подсказка про continue (Milestone 3, T-046).
    panel.add(
      this.add
        .text(0, 250, '(continue будет в M3)', {
          fontFamily: 'system-ui, Arial, sans-serif',
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
