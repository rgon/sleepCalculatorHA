import { LovelaceCardConfig } from "custom-card-helpers";

export interface SleepCalculatorCardConfig extends LovelaceCardConfig {
  title?: string;
  /** Minutes to fall asleep after going to bed (default: 15) */
  time_to_fall_asleep?: number;
  /** Length of one sleep cycle in minutes (default: 90) */
  sleep_cycle_length?: number;
}

export interface SleepOption {
  time: Date;
  cycles: number;
  /** Total minutes including time_to_fall_asleep */
  totalMinutes: number;
}

export type CalculatorMode = "wakeup" | "bedtime";
