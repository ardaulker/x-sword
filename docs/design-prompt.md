> **Note (6 October 2026):** The design made from the first version of this brief has arrived and lives in `design/`.
> That is now the source. Color codes follow the design: paths in the player's own color, orange for the ring about to
> collapse, red for danger. The name (X Sword), the word "take" and the match clock stay as in this brief.
>
> **Note (8 October 2026):** This brief was originally written in Turkish and translated to English when the whole
> repository moved to English. The game text is now authored in English and translated into 6 languages.

# Task

Prepare the design file for a turn-based multiplayer strategy game for phones. I want a design system, every screen and
a clickable prototype.

The game is called **X Sword**. In the logo two swords cross to form an "X". This "×" is also the sign of the diagonal
taking direction in the game.

Attached is the current demo of the game: `index.html` (now `demo/index.html`). It is a single-player prototype. Read the rules, the visual
language and the color codes from it. Don't copy its look one to one. Keep its spirit and mature it.

A working version of the rules below is here: https://ardaulker.github.io/x-sword/arena/ — 2–4 seats, bots, the
shrinking arena and the move preview can be tried there. That screen is a test bench; it doesn't replace the design.

# The game

## Pieces
- **Star (player):** each player's only piece. Depending on the round's mode it moves either straight or diagonally.
  It takes in the direction it moves.
- **Red bot:** walks straight, takes diagonally.
- **Blue bot:** walks diagonally, takes straight.
- Every piece moves one square. Taking means moving onto the target's square. A taken piece leaves the game.
- Anyone can take anyone: a player takes a player, a bot takes a player, a bot takes a bot.

## Word: "take"
- Pieces are taken as in chess: "The queen takes the pawn."
- The game never uses "eat", "kill" or "hit".
- Examples: "You took #5!", "#3 took you!", "Takes: 4".

## Round mode: STRAIGHT / DIAGONAL
- Every round is either STRAIGHT or DIAGONAL. The mode flips at the end of each round. It is the same for all stars.
- The mode is the most important information in the game. It must be readable at a glance.

## Visual language (keep this)
- **The shape shows the walking direction:** a square goes straight, a diamond diagonally. When the mode changes, the
  star's shape changes too.
- **The swords show the taking direction:** "+" takes straight, "×" takes diagonally.
- Both cues must read without color, even on a 26 pt square.

## Color codes (fixed)
- **Green:** squares you can move to. They light up by themselves on your turn.
- **Orange:** after tapping a bot or a rival, the squares it can move to.
- **Red:** taking points. These are pieces that can be taken: both yours and the rival's.
- These three colors are used only with these meanings.
- Piece colors must not clash with these three colors. In the demo the player piece is green and one bot type is red.
  Rebuild the piece colors accordingly.

## Round flow
1. The move order is shuffled once at the start of the match and stays the same all match. Stars and bots play in this
   one queue, mixed together. A piece's number is its place among the survivors of that round and is reassigned every
   round (the order doesn't change). On Easy the player moves first; on Normal and Hard the player's place is random
   too. In single-player mode the Twin always comes right after the player.
2. The order matters because one bot can take another. Bots that come back to back play quickly; the player can tap the
   screen to speed them up. A taken piece's turn is skipped.
3. When everyone has played, the mode flips and a new round starts.
- Each player's move time is 20 seconds. It can be changed in the lobby. When time runs out, the game makes a safe move
  for the player.

## Player count and board
- In single-player mode there is also a **Twin** on the board: the player's mirror. It moves right after the player, in
  the same direction the player just moved; it walks if that square is empty, takes the piece there if occupied and
  stays put if the way is closed. It can never take the player. The player wins when every bot is gone; the Twin
  doesn't need to be taken. If the Twin takes a piece, the player gets double points and a Switcheroo bonus.
- A match has 2–4 stars. An AI player can take an empty seat. It is also called "Player N" and plays its turn like a
  player.
- With 2 stars the board is 9×9 with about 14 bots.
- With 3 stars the board is 11×11 with about 21 bots.
- With 4 stars the board is 13×13 with about 28 bots.
- These numbers will be tested and tuned.
- Stars start one square in from the corners, evenly spaced. Which star starts in which corner is random in every
  match. Arena bots are placed randomly but never within two squares of a star.

## Bots
- Bots chase the players. A bot that can't take one player heads for another.
- Before moving, a bot asks: "Will I be taken on this square on the next move?" If so, it doesn't go there.
- There are three difficulties. Easy: takes if it can, otherwise walks to the nearest star. Normal: never steps where
  it would be taken, never stays on a collapsing ring, heads for the star it can reach fastest. Hard: on top of that,
  closes the target star's escape squares.
- Bot intelligence is solved in code. Two things are asked of you: the difficulty choice, and a marker that shows
  readably whom a bot is targeting. The marker can be turned off in the settings.

## Bonuses
- Everyone starts with one double step. Bonuses are earned by conditions: 20 points double step, 40 points double
  move, 60 points one of the two; 50 points Switcheroo (swap places with any piece on the board); surviving the first
  shrink gives armor; surviving the second gives a double move; in single player a take by the Twin also gives a Switcheroo
  bonus and double points. Optional in setup: teams (2 vs 2, 4 players), obstacle squares (can't be entered or jumped
  with a double step), rival personalities (hunter, careful, opportunist). In puzzle mode every bot must be taken in a
  limited number of moves. In single player you win when every bot is gone; with 2–4 players you can keep fighting the
  bots after the winner is decided.
- Armor: protects you from being taken once and works by itself. Double step: move two squares. Double move: one more
  move right away. Switcheroo: swap places with a piece.

## End
- The match ends when one star is left. The score decides the winner: taking a player is 50, the Twin 30, a bot 10
  points; the star left standing gets a +30 bonus. Ranking: score, then number of takes, then survival time. Hiding
  alone doesn't win.
- So that a match doesn't last forever, the arena shrinks. Every 6 rounds (rounds 6, 12, 18 …) the outermost ring
  collapses at the end of the round. Pieces left on that ring leave the game. The ring is flagged one round before and
  marked during the collapse round.
- A match should last 5–10 minutes.
- A player who has been taken can keep watching or leave.

## Multiplayer flow
- No account. The player picks a nickname and a color.
- The flow: create a room → share the link, code or QR (WhatsApp first) → lobby → start.
- Someone who wants to play alone opens a quick game against bots.
- A disconnected player is waited for 30 seconds. Then an AI takes over. If the player comes back, they get their seat
  back.
- Matchmaking with strangers is not in this version.

# Phone rules
- The screen is used in portrait. The game is played with one hand. Important buttons sit where the thumb reaches
  easily.
- No mouse hover. Information opens with a tap or a long press.
- The player has one piece. On their turn the squares they can move to light up green by themselves.
- A move takes two steps: tap a square → see the preview → confirm. The preview shows in red who could take you on that
  square this round.
- A 13×13 board must fit a 375 pt width. At that size a square is about 26 pt. Squares must stay readable and tappable
  at this size. Suggest zoom if needed.
- Leave room for the phone's notch and the home indicator at the bottom.

# Screens
1. Splash and main menu: Quick game, Create room, Join room, How to play, Settings.
2. Create / join room: a code field and invites that arrive by link.
3. Lobby: 4 seats. Each seat shows a name, a color and a "ready" state. An empty seat has three options: invite, add AI,
   close. The lobby also has: bot difficulty, move time, a board size preview, Share and Start. Only the room's creator
   sees the Start button.
4. **GAME SCREEN.** Put most of the effort into this screen.
   The top bar has:
   - **Match clock.** Starts counting from 00:00 the moment Start is pressed. Stops when the game ends. Must not be
     confused with the move timer.
   - Round number.
   - A big, clear STRAIGHT/DIAGONAL indicator.
   - Whose turn it is and the move time left.

   The rest of the screen has:
   - the board
   - a player strip: color, in the game or taken, take count
   - an expandable battle log

   States of the screen to design:
   - Your turn (green paths lit, timer running, a warning in the last 5 seconds)
   - Tapping a bot or a rival (orange paths, red taking points)
   - Move preview and confirmation
   - Pieces that can take you right now
   - Someone else's turn
   - Bot turn (fast, skippable)
   - The moment the mode changes
   - Taking and being taken
   - Arena shrink warning and the ring collapsing
   - You were taken → spectator mode
   - Time ran out → automatic move
   - Connection lost / reconnecting
5. Piece info card (opens on a long press): how the piece walks and takes (with a small diagram), its turn number, and
   its target if it is a bot.
6. Battle log: who took whom, with color and icon. Lines are short and readable.
7. Game over: ranking, match time, statistics, Rematch and Share buttons.
8. How to play: an interactive tutorial. The user tries each rule on the board.
   **The guide text will be written later.** When bot intelligence and the rules are final, new text will come. Use
   placeholder text for now. Screens must not break as the text grows or shrinks.
9. Settings: sound, vibration, danger indicator, bot target marker, animation speed, color-blind mode.

# Style
- The demo's mood: a dark navy background, neon accents, octagon squares. Keep this mood and mature it.
- The octagon square is part of the game's identity. If it hurts readability at small sizes, suggest an alternative.
- The color system must tell apart: 4 player colors, 2 bot types and the fixed color codes (green path, orange path,
  red taking point). There must also be a color for the ring about to collapse. Shape and swords already tell the bot
  type.
- Players must also differ by something other than color: a pattern, a letter or an emblem.
- Contrast must stay readable in daylight. Text meets WCAG AA.
- The bots' playing order must be readable without crowding the board. Bring a proposal for this.

# Motion and feel
- Pieces slide (150–250 ms). They don't jump from one square to another instantly.
- A take gets a short effect. Also note what the vibration should be like.
- When the mode changes, a readable transition crosses the whole board. Stars change shape.
- During the bot turn the bots play quickly one after another.
- Write down the duration and easing of every animation.

# Deliverables
1. A design system page: color tokens, type scale, the piece set (every shape and color of every piece), square states,
   icons, animation durations.
2. All screens at 390×844 portrait. Also check the game screen at 375×667 (iPhone SE).
3. Three board sizes of the game screen: 9×9, 11×11, 13×13.
4. A clickable prototype. The flow: main menu → lobby → one full round (green paths, preview, confirm, bot turn, mode
   change) → game over.
5. A short note: the important decisions, their reasons and open questions.

# Working rules
- Don't change the game rules. If a rule makes the design hard, note it and bring a proposal.
- If something is unclear, make a reasonable assumption, write it in the note and continue.
- The interface language was Turkish when this brief was written; the game now ships in 7 languages.
