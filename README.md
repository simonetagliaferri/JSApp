# Stuff Happens - University Life Edition

Single-player web app inspired by *Stuff Happens* with React 19 + Node/Express + SQLite.

## Server-side APIs
- `POST /api/sessions` -> login with `{ username, password }`, returns logged user.
- `GET /api/sessions/current` -> returns current user session.
- `DELETE /api/sessions/current` -> logout.
- `POST /api/game/start` -> starts or resumes authenticated full game, returns visible cards + active offer.
- `GET /api/game/current` -> gets current active game state.
- `POST /api/game/guess` -> submits `{ position }` or `{ timeout: true }`, validates round, returns round outcome.
- `POST /api/game/next` -> confirms readiness and starts next round.
- `GET /api/games/history` -> completed games history for authenticated user.
- `POST /api/demo/start` -> starts anonymous one-round demo.
- `POST /api/demo/guess` -> submits demo guess `{ position }` or timeout.

## Database tables
- `users`: registered accounts with salted/hashed passwords.
- `cards`: deck of 50 themed horrible-situation cards.
- `games`: one row per registered-user game (status, rounds, misses, outcome).
- `game_cards`: cards used in each game, includes initial cards and won/lost by round.

## Client-side routes
- `/`: instructions and game overview.
- `/login`: authentication form for registered users.
- `/game`: authenticated full multi-round game.
- `/demo`: anonymous one-round demo game.
- `/profile`: authenticated history page with completed games.

## Main React components
- `App`: routing and auth bootstrap.
- `NavBar`: top navigation with auth-aware actions.
- `Game`: full game state machine and round flow.
- `Demo`: anonymous single-round gameplay.
- `Profile`: game history listing.
- `CardList`: reusable card renderer.
- `PlayArea`: shared guessing UI with timer.

## Screenshots
![History page](docs/history.png)
![Game page](docs/game.png)

## Test users
- `alice` / `password`
- `bob` / `password`
