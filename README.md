# Sleep Calculator Card

A Home Assistant Lovelace custom card that calculates optimal sleep and wake-up times based on the science of sleep cycles — so you never wake up groggy mid-cycle again.

[![HACS Custom](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://hacs.xyz/)

---

## Features

- **Wake-up mode** — given the current time, shows every optimal wake-up time up to 10 hours of sleep that falls on a complete cycle boundary.
- **Bedtime mode** — given a target wake-up time, shows every optimal bedtime so you complete whole cycles before the alarm.
- Time-to-fall-asleep and cycle length are fully configurable.
- Highlights the scientifically recommended 7–9 h range.

## Installation

### Via HACS (recommended)

1. Open HACS → **Frontend** → ⋮ → **Custom repositories**.
2. Add this repository URL with category **Lovelace**.
3. Install **Sleep Calculator Card**.
4. Add the resource (HACS usually does this automatically).

### Manual

1. Download `sleep-calculator-card.js` from the [latest release](../../releases/latest).
2. Place it in `config/www/`.
3. Add to Lovelace resources:
   ```yaml
   url: /local/sleep-calculator-card.js
   type: module
   ```

## Usage

Add the card in your dashboard:

```yaml
type: custom:sleep-calculator-card
title: Sleep Calculator      # optional, default "Sleep Calculator"
time_to_fall_asleep: 15      # minutes until you fall asleep (default: 15)
sleep_cycle_length: 90       # one sleep cycle in minutes (default: 90)
```

### Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `title` | string | `"Sleep Calculator"` | Card title |
| `time_to_fall_asleep` | number | `15` | Minutes from lying down to falling asleep |
| `sleep_cycle_length` | number | `90` | Duration of one sleep cycle in minutes |

### How it works

Each sleep cycle lasts approximately 90 minutes. Waking at the end of a cycle (rather than in the middle of deep sleep) leaves you feeling refreshed. This card:

1. Adds `time_to_fall_asleep` to find the actual sleep start.
2. Lists every wake-up (or bedtime) that corresponds to 1–N complete cycles, up to 10 hours.
3. Marks **7–9 h** options as *Recommended* and **6–7 h** as *Good*.

## Development

Requirements: Node.js ≥ 18, [pnpm](https://pnpm.io/)

```bash
pnpm install
pnpm build          # production build → sleep-calculator-card.js
pnpm start          # watch mode
```

## License

MIT
