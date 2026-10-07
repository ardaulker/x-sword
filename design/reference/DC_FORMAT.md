# Reading .dc.html files

These files are the source of the design canvas; they don't run directly in a browser (they need the canvas runtime).
Read them as a reference.

- The HTML inside `<x-dc>` = markup and inline styles (sizes and colors are taken from here exactly).
- `{{name}}` = a value returned by `renderVals()`. Style slots such as `{{p.st}}` are CSS text computed in JS.
- `<sc-for list="{{x}}" as="y">` = a loop (`x.map` in React). `<sc-if value="{{k}}">` = conditional rendering.
- `<dc-import name="GameScreen" scene="bot" …>` = calls another file as a component, with props.
- `class Component extends DCLogic` inside `<script type="text/x-dc">` = the logic (like a React class component;
  `state`, `setState`, `componentDidMount`).
- `<a href="X.dc.html">` = navigation between screens in the prototype → a route in the app.

The most important file is `GameScreen.dc.html`:
- `scene9()`, `sceneGen()` sample scenes
- `wd/hd/moves/hitters/targetOf` the rules
- `staticUi()` the definition of every screen state
- `startGame/next/runBots/botStep/flipMode` the live round flow
- `boardTap/boardHover/boardKey` interaction (wide touch, mouse hover, keyboard)
- `look/oct/notch/seg` drawing geometry
- `build()` mobile and desktop layout measurements
