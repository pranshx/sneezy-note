# Sneezy Note

A sticky note that stays on top of your screen, with a little pet that hands you your
reminders. Pick from a dog, cat, bunny, fox, or a hologram cloud — each delivers tasks in
its own way (the dog sneezes them onto the note, the cloud rains them down as digital rain).

## Download (Windows)
Grab the latest portable `.exe` from the [Releases page](../../releases/latest) — no install
needed, just download and double-click. Your tasks, size, position, and settings are saved
automatically, even across restarts.

> **Note:** the exe isn't code-signed, so Windows SmartScreen may show a "Windows protected
> your PC" warning on first run. Click **More info → Run anyway** — it's safe, just unsigned.

## Using it
- Type a task, pick a **priority** (Low/Med/High) and a **deadline** (date + time), then press Enter.
- The note always shows one **Focus** card: the single most urgent task (overdue first, then by
  priority, then by the soonest deadline) — so you work one thing at a time instead of a wall of tasks.
  Mark it Done, or Snooze 10m to push it back and surface the next one.
- Click "Expand" to see, reorder (click the colored dot to cycle its priority), or delete everything,
  and to change which pets roam your screen and how big they are.
- No deadline? Your pet nudges you with the current focus task every 45 minutes (change it at the
  bottom, 0 turns it off).
- Click a pet any time to make it deliver the current focus task right away.
- When the slip appears: Done ticks it off, Later brings it back in 10 minutes.
- Drag the note by its header. Drag any edge to resize it.
- The minus button collapses the note down to just the essentials.
- The × button hides the note to the **system tray** — it keeps running and reminding you in the
  background. Click the tray icon (or `Ctrl+Alt+N`) to bring it back, or use the tray menu to quit for real.

## Running from source / building it yourself
1. Install Node.js (https://nodejs.org, the LTS version).
2. `npm install`
3. `npm start` to run it, or `npm run dist` to build a portable `.exe` into `dist/`.
