import {
  LitElement,
  html,
  css,
  CSSResultGroup,
  TemplateResult,
  nothing,
} from "lit";
import { customElement, state } from "lit/decorators.js";
import { LovelaceCard } from "custom-card-helpers";

import type {
  SleepCalculatorCardConfig,
  SleepOption,
  CalculatorMode,
} from "./types";

// Register card for Home Assistant card picker
const win = window as { customCards?: unknown[] };
win.customCards = win.customCards || [];
win.customCards.push({
  type: "sleep-calculator-card",
  name: "Sleep Calculator",
  description:
    "Calculate optimal wake-up or bedtimes based on sleep cycles to avoid waking mid-cycle.",
  preview: true,
  documentationURL:
    "https://github.com/gonzalo-ruiz/sleep-calculator-card#readme",
});

const MAX_SLEEP_MINUTES = 600; // 10 hours

function qualityLabel(
  cycles: number,
  cycleLength: number
): "recommended" | "good" | "short" {
  const sleepMinutes = cycles * cycleLength;
  if (sleepMinutes >= 420 && sleepMinutes <= 540) return "recommended"; // 7–9 h
  if (sleepMinutes >= 360) return "good"; // 6–7 h
  return "short";
}

@customElement("sleep-calculator-card")
export class SleepCalculatorCard extends LitElement implements LovelaceCard {
  @state() private _config!: SleepCalculatorCardConfig;
  @state() private _mode: CalculatorMode = "wakeup";
  @state() private _wakeTarget = "";
  @state() private _now: Date = new Date();

  private _ticker?: ReturnType<typeof setInterval>;

  public setConfig(config: SleepCalculatorCardConfig): void {
    if (!config) throw new Error("Invalid configuration");
    this._config = {
      time_to_fall_asleep: 15,
      sleep_cycle_length: 90,
      ...config,
    };
  }

  public getCardSize(): number {
    return 5;
  }

  public connectedCallback(): void {
    super.connectedCallback();
    // Guard against double-registration on reconnect
    if (this._ticker !== undefined) clearInterval(this._ticker);
    this._ticker = setInterval(() => {
      // Only re-render for the clock display in wakeup mode
      if (this._mode === "wakeup") this._now = new Date();
    }, 60_000);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._ticker !== undefined) clearInterval(this._ticker);
  }

  private get _fallAsleep(): number {
    return this._config.time_to_fall_asleep!;
  }

  private get _cycleLength(): number {
    return this._config.sleep_cycle_length!;
  }

  private get _maxCycles(): number {
    return Math.floor(MAX_SLEEP_MINUTES / this._cycleLength);
  }

  /** Wake-up times when going to sleep NOW */
  private _wakeupOptions(): SleepOption[] {
    const sleepStart = new Date(this._now.getTime() + this._fallAsleep * 60_000);
    return Array.from({ length: this._maxCycles }, (_, i) => {
      const cycles = i + 1;
      return {
        time: new Date(sleepStart.getTime() + cycles * this._cycleLength * 60_000),
        cycles,
        totalMinutes: this._fallAsleep + cycles * this._cycleLength,
      };
    });
  }

  /** Bedtimes to hit N full cycles before a target wake-up time */
  private _bedtimeOptions(): SleepOption[] {
    if (!this._wakeTarget) return [];

    const [h, m] = this._wakeTarget.split(":").map(Number);
    const wake = new Date(this._now);
    wake.setHours(h, m, 0, 0);
    // If the chosen time has already passed today, move to tomorrow
    if (wake <= this._now) wake.setDate(wake.getDate() + 1);

    // Most sleep first (max cycles → 1 cycle)
    return Array.from({ length: this._maxCycles }, (_, i) => {
      const cycles = this._maxCycles - i;
      const bedTime = new Date(
        wake.getTime() - (this._fallAsleep + cycles * this._cycleLength) * 60_000
      );
      return {
        time: bedTime,
        cycles,
        totalMinutes: this._fallAsleep + cycles * this._cycleLength,
      };
    });
  }

  private _fmt(date: Date): string {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  private _fmtDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  private readonly _onSetModeWakeup = () => {
    this._now = new Date(); // refresh stale clock when switching back
    this._mode = "wakeup";
  };

  private readonly _onSetModeBedtime = () => {
    this._mode = "bedtime";
  };

  private readonly _onWakeTargetChange = (e: Event) => {
    this._wakeTarget = (e.target as HTMLInputElement).value;
  };

  private _renderOption(opt: SleepOption): TemplateResult {
    const q = qualityLabel(opt.cycles, this._cycleLength);
    return html`
      <div class="sleep-option ${q}">
        <div class="opt-time">${this._fmt(opt.time)}</div>
        <div class="opt-meta">
          <span class="cycles"
            >${opt.cycles} cycle${opt.cycles !== 1 ? "s" : ""}</span
          >
          <span class="duration">${this._fmtDuration(opt.totalMinutes)}</span>
        </div>
        ${q === "recommended"
          ? html`<span class="badge">Recommended</span>`
          : nothing}
      </div>
    `;
  }

  private _renderWakeupMode(): TemplateResult {
    const opts = this._wakeupOptions();
    return html`
      <div class="mode-panel">
        <div class="current-time-box">
          <ha-icon icon="mdi:power-sleep"></ha-icon>
          <div class="ct-text">
            <span class="ct-label">Sleep now</span>
            <span class="ct-time">${this._fmt(this._now)}</span>
            <span class="ct-sub">+${this._fallAsleep} min to fall asleep</span>
          </div>
        </div>
        <div class="options-heading">Optimal wake-up times</div>
        <div class="options-list">${opts.map((o) => this._renderOption(o))}</div>
      </div>
    `;
  }

  private _renderBedtimeMode(): TemplateResult {
    const opts = this._bedtimeOptions();
    return html`
      <div class="mode-panel">
        <div class="wake-input-box">
          <label for="wake-input">I want to wake up at</label>
          <input
            id="wake-input"
            type="time"
            .value=${this._wakeTarget}
            @change=${this._onWakeTargetChange}
          />
        </div>
        ${opts.length > 0
          ? html`
              <div class="options-heading">Go to bed at</div>
              <div class="options-list">
                ${opts.map((o) => this._renderOption(o))}
              </div>
            `
          : html`<div class="placeholder">
              Set a wake-up time above to see bedtime options
            </div>`}
      </div>
    `;
  }

  protected render(): TemplateResult {
    if (!this._config) return html``;

    return html`
      <ha-card>
        <div class="card-header">
          <span class="card-title">
            <ha-icon icon="mdi:sleep"></ha-icon>
            ${this._config.title ?? "Sleep Calculator"}
          </span>
        </div>

        <div class="card-content">
          <div class="mode-selector" role="tablist">
            <button
              role="tab"
              class="mode-btn ${this._mode === "wakeup" ? "active" : ""}"
              aria-selected=${this._mode === "wakeup"}
              @click=${this._onSetModeWakeup}
            >
              <ha-icon icon="mdi:alarm"></ha-icon>
              Wake-up times
            </button>
            <button
              role="tab"
              class="mode-btn ${this._mode === "bedtime" ? "active" : ""}"
              aria-selected=${this._mode === "bedtime"}
              @click=${this._onSetModeBedtime}
            >
              <ha-icon icon="mdi:bed-clock"></ha-icon>
              Bedtime
            </button>
          </div>

          ${this._mode === "wakeup"
            ? this._renderWakeupMode()
            : this._renderBedtimeMode()}

          <div class="config-footer">
            <ha-icon icon="mdi:information-outline"></ha-icon>
            Cycle ${this._cycleLength} min · Fall asleep ${this._fallAsleep} min
          </div>
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        --sleep-short-color: var(--secondary-text-color, #888);
        --sleep-good-color: var(--warning-color, #ff9800);
        --sleep-recommended-color: var(--success-color, #4caf50);
      }

      ha-card {
        overflow: hidden;
      }

      .card-header {
        display: flex;
        align-items: center;
        padding: 16px 16px 0;
        font-size: var(--ha-card-header-font-size, 22px);
        font-weight: var(--ha-card-header-font-weight, normal);
        color: var(--ha-card-header-color, var(--primary-text-color));
      }

      .card-title {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .card-content {
        padding: 12px 16px 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .mode-selector {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .mode-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 10px 8px;
        border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
        border-radius: 8px;
        background: var(--card-background-color, #fff);
        color: var(--secondary-text-color);
        font-size: 0.85rem;
        font-family: inherit;
        cursor: pointer;
        transition: background 0.15s, color 0.15s, border-color 0.15s;
      }

      .mode-btn.active {
        background: var(--primary-color);
        color: var(--text-primary-color, #fff);
        border-color: var(--primary-color);
      }

      .mode-btn:not(.active):hover {
        background: var(--secondary-background-color);
        color: var(--primary-text-color);
      }

      .current-time-box {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: var(--secondary-background-color, #f5f5f5);
        border-radius: 10px;
      }

      .current-time-box ha-icon {
        color: var(--primary-color);
        --mdc-icon-size: 32px;
      }

      .ct-text {
        display: flex;
        flex-direction: column;
      }

      .ct-label {
        font-size: 0.75rem;
        color: var(--secondary-text-color);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .ct-time {
        font-size: 1.6rem;
        font-weight: 600;
        color: var(--primary-text-color);
        line-height: 1.1;
      }

      .ct-sub {
        font-size: 0.75rem;
        color: var(--secondary-text-color);
      }

      .wake-input-box {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }

      .wake-input-box label {
        font-size: 0.9rem;
        color: var(--secondary-text-color);
      }

      .wake-input-box input[type="time"] {
        padding: 8px 12px;
        font-size: 1.2rem;
        font-family: inherit;
        background: var(--secondary-background-color, #f5f5f5);
        color: var(--primary-text-color);
        border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
        border-radius: 8px;
        outline: none;
        cursor: pointer;
      }

      .wake-input-box input[type="time"]:focus {
        border-color: var(--primary-color);
      }

      .options-heading {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        color: var(--secondary-text-color);
        margin-bottom: -4px;
      }

      .options-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .sleep-option {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        border-radius: 8px;
        border-left: 4px solid transparent;
        background: var(--secondary-background-color, #f5f5f5);
      }

      .sleep-option.short {
        border-left-color: var(--sleep-short-color);
        opacity: 0.75;
      }

      .sleep-option.good {
        border-left-color: var(--sleep-good-color);
      }

      .sleep-option.recommended {
        border-left-color: var(--sleep-recommended-color);
        background: color-mix(
          in srgb,
          var(--sleep-recommended-color) 10%,
          var(--secondary-background-color, #f5f5f5)
        );
      }

      .opt-time {
        font-size: 1.4rem;
        font-weight: 600;
        color: var(--primary-text-color);
        min-width: 60px;
      }

      .opt-meta {
        display: flex;
        flex-direction: column;
        font-size: 0.78rem;
        color: var(--secondary-text-color);
        gap: 1px;
      }

      .cycles {
        font-weight: 500;
        color: var(--primary-text-color);
      }

      .badge {
        margin-left: auto;
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--sleep-recommended-color);
        padding: 2px 7px;
        border: 1px solid var(--sleep-recommended-color);
        border-radius: 20px;
      }

      .placeholder {
        text-align: center;
        color: var(--secondary-text-color);
        font-size: 0.9rem;
        padding: 20px 0;
        font-style: italic;
      }

      .config-footer {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.75rem;
        color: var(--secondary-text-color);
        padding-top: 4px;
        border-top: 1px solid var(--divider-color, rgba(0, 0, 0, 0.08));
      }

      .config-footer ha-icon {
        --mdc-icon-size: 14px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sleep-calculator-card": SleepCalculatorCard;
  }
}
