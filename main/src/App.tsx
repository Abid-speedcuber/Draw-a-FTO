import { useCallback, useMemo, useRef, useState } from "react";
import FtoViewer, {
  type CenterTargets,
  type FtoViewerApi,
  type FtoViewerMode,
} from "./FtoViewer";

const defaultFaceColors = [
  "#ffff00",
  "#0000ff",
  "#ff0000",
  "#800080",
  "#ffffff",
  "#00a050",
  "#808080",
  "#ff8800",
];

const faceLabels = ["U", "F", "BR", "BL", "D", "B", "R", "L"];
const quickMoves = [
  "U",
  "U'",
  "F",
  "F'",
  "R",
  "R'",
  "L",
  "L'",
  "D",
  "D'",
  "BR",
  "BR'",
  "BL",
  "BL'",
  "Rw",
  "Rw'",
  "Fw",
  "Fw'",
];

const solvedFacelets = Array.from({ length: 72 }, (_, index) => Math.floor(index / 9));

function emptyTargets(): CenterTargets {
  return {
    uf: [null, null, null, null],
    rl: [null, null, null, null],
    ufSources: [null, null, null, null],
    rlSources: [null, null, null, null],
    rlTopSources: [[], [], [], []],
  };
}

function summarizeFacelets(facelets: number[]) {
  const counts = new Array(9).fill(0);
  for (const color of facelets) {
    counts[color] = (counts[color] ?? 0) + 1;
  }
  return counts;
}

function parseFaceletInput(value: string): number[] | null {
  const parsed = JSON.parse(value) as unknown;
  if (!Array.isArray(parsed) || parsed.length !== 72) {
    return null;
  }
  const facelets = parsed.map((entry) => Number(entry));
  return facelets.every((entry) => Number.isInteger(entry) && entry >= 0 && entry <= 8)
    ? facelets
    : null;
}

export default function App() {
  const viewerRef = useRef<FtoViewerApi | null>(null);
  const [mode, setMode] = useState<FtoViewerMode>("pan");
  const [selectedColor, setSelectedColor] = useState(0);
  const [faceColors, setFaceColors] = useState(defaultFaceColors);
  const [topFaceOpacity, setTopFaceOpacity] = useState(1);
  const [topFaceXOffset, setTopFaceXOffset] = useState(0);
  const [topFaceYOffset, setTopFaceYOffset] = useState(0);
  const [topFaceZOffset, setTopFaceZOffset] = useState(0);
  const [keyboardEnabled, setKeyboardEnabled] = useState(true);
  const [lastLayerMode, setLastLayerMode] = useState(false);
  const [algorithm, setAlgorithm] = useState("");
  const [facelets, setFacelets] = useState(solvedFacelets);
  const [centerTargets, setCenterTargets] = useState<CenterTargets>(emptyTargets);
  const [stateInput, setStateInput] = useState("");
  const [status, setStatus] = useState("Ready");

  const colorCounts = useMemo(() => summarizeFacelets(facelets), [facelets]);
  const exportedState = useMemo(() => JSON.stringify(facelets), [facelets]);

  const handleFacelets = useCallback((nextFacelets: number[]) => {
    setFacelets(nextFacelets);
  }, []);

  const handleCenterTargets = useCallback((targets: CenterTargets) => {
    setCenterTargets(targets);
  }, []);

  function pickColor(index: number) {
    setSelectedColor(index);
    setMode("paint");
  }

  function updateFaceColor(index: number, color: string) {
    setFaceColors((current) => current.map((entry, colorIndex) => (colorIndex === index ? color : entry)));
  }

  function applyAlgorithm(animated: boolean) {
    if (!algorithm.trim()) {
      setStatus("Enter an algorithm first");
      return;
    }
    if (animated) {
      viewerRef.current?.applyAlgorithm(algorithm);
    } else {
      viewerRef.current?.applyAlgorithmInstant(algorithm);
    }
    setStatus(animated ? "Queued algorithm" : "Applied algorithm");
  }

  function applyQuickMove(move: string) {
    viewerRef.current?.applyAlgorithm(move);
    setStatus(`Queued ${move}`);
  }

  function resetPuzzle() {
    viewerRef.current?.resetPuzzle();
    setStatus("Reset puzzle");
  }

  function resetView() {
    viewerRef.current?.resetView();
    setStatus("Reset view");
  }

  function importState() {
    try {
      const parsed = parseFaceletInput(stateInput);
      if (!parsed) {
        setStatus("State must be a JSON array of 72 color indexes");
        return;
      }
      viewerRef.current?.setFacelets(parsed);
      setStatus("Imported facelet state");
    } catch {
      setStatus("State is not valid JSON");
    }
  }

  function loadCurrentStateIntoEditor() {
    setStateInput(exportedState);
    setStatus("Loaded current state into editor");
  }

  function setSolvedState() {
    viewerRef.current?.setFacelets(solvedFacelets);
    setStatus("Loaded solved colors");
  }

  async function copyPngToClipboard() {
    try {
      await viewerRef.current?.copyPngToClipboard();
      setStatus("Copied PNG to clipboard");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not copy PNG");
    }
  }

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <h1>Draw a FTO</h1>
        </div>
        <div className="topbar-actions">
          <label className="toggle">
            <input
              type="checkbox"
              checked={keyboardEnabled}
              onChange={(event) => setKeyboardEnabled(event.target.checked)}
            />
            Keyboard
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={lastLayerMode}
              onChange={(event) => setLastLayerMode(event.target.checked)}
            />
            LL centers
          </label>
        </div>
      </header>

      <section className="workspace">
        <aside className="panel tools-panel">
          <div className="panel-section">
            <h2>Mode</h2>
            <div className="segmented">
              {(["pan", "paint", "swap"] as const).map((entry) => (
                <button
                  key={entry}
                  className={mode === entry ? "active" : ""}
                  onClick={() => setMode(entry)}
                >
                  {entry}
                </button>
              ))}
            </div>
          </div>

          <div className="panel-section">
            <h2>Paint</h2>
            <div className="swatch-grid">
              {faceColors.map((color, index) => (
                <button
                  key={`${faceLabels[index]}-${color}`}
                  className={selectedColor === index && mode === "paint" ? "swatch active" : "swatch"}
                  onClick={() => pickColor(index)}
                  style={{ ["--swatch" as string]: color }}
                  title={faceLabels[index]}
                  aria-label={`Paint ${faceLabels[index]}`}
                >
                  <span>{faceLabels[index]}</span>
                </button>
              ))}
            </div>
            <div className="color-editor">
              {faceColors.map((color, index) => (
                <label key={faceLabels[index]} className="color-row">
                  <span>{faceLabels[index]}</span>
                  <input
                    type="color"
                    value={color}
                    onChange={(event) => updateFaceColor(index, event.target.value)}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="panel-section">
            <h2>Actions</h2>
            <div className="button-grid">
              <button onClick={resetPuzzle}>Reset puzzle</button>
              <button onClick={resetView}>Reset view</button>
              <button onClick={setSolvedState}>Solved colors</button>
              <button onClick={loadCurrentStateIntoEditor}>Export state</button>
              <button onClick={copyPngToClipboard}>Copy PNG</button>
            </div>
            <label className="range-row">
              <span>Top opacity</span>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={Math.round(topFaceOpacity * 100)}
                onChange={(event) => setTopFaceOpacity(Number(event.target.value) / 100)}
              />
              <strong>{Math.round(topFaceOpacity * 100)}%</strong>
            </label>
            <label className="range-row">
              <span>Top X</span>
              <input
                type="range"
                min="0"
                max="120"
                step="1"
                value={topFaceXOffset}
                onChange={(event) => setTopFaceXOffset(Number(event.target.value))}
              />
              <strong>{topFaceXOffset}px</strong>
            </label>
            <label className="range-row">
              <span>Top Y</span>
              <input
                type="range"
                min="0"
                max="120"
                step="1"
                value={topFaceYOffset}
                onChange={(event) => setTopFaceYOffset(Number(event.target.value))}
              />
              <strong>{topFaceYOffset}px</strong>
            </label>
            <label className="range-row">
              <span>Top Z</span>
              <input
                type="range"
                min="0"
                max="120"
                step="1"
                value={topFaceZOffset}
                onChange={(event) => setTopFaceZOffset(Number(event.target.value))}
              />
              <strong>{topFaceZOffset}px</strong>
            </label>
          </div>
        </aside>

        <section className="stage-column">
          <FtoViewer
            mode={mode}
            selectedColor={selectedColor}
            faceColors={faceColors}
            topFaceOpacity={topFaceOpacity}
            topFaceXOffset={topFaceXOffset}
            topFaceYOffset={topFaceYOffset}
            topFaceZOffset={topFaceZOffset}
            keyboardEnabled={keyboardEnabled}
            lastLayerMode={lastLayerMode}
            viewerApiRef={viewerRef}
            onFacelets={handleFacelets}
            onCenterTargets={handleCenterTargets}
          />
          <div className="status-row">
            <span>{status}</span>
            <span>{facelets.length} facelets</span>
          </div>
        </section>

        <aside className="panel input-panel">
          <div className="panel-section">
            <h2>Algorithm</h2>
            <textarea
              value={algorithm}
              onChange={(event) => setAlgorithm(event.target.value)}
              placeholder="U R U' R' ..."
              rows={4}
            />
            <div className="button-row">
              <button onClick={() => applyAlgorithm(true)}>Animate</button>
              <button onClick={() => applyAlgorithm(false)}>Apply now</button>
            </div>
            <div className="move-grid">
              {quickMoves.map((move) => (
                <button key={move} onClick={() => applyQuickMove(move)}>
                  {move}
                </button>
              ))}
            </div>
          </div>

          <div className="panel-section">
            <h2>Facelet State</h2>
            <textarea
              value={stateInput}
              onChange={(event) => setStateInput(event.target.value)}
              placeholder="[0,0,0,...]"
              rows={5}
            />
            <div className="button-row">
              <button onClick={importState}>Import</button>
              <button onClick={loadCurrentStateIntoEditor}>Load current</button>
            </div>
            <div className="counts">
              {faceLabels.map((label, index) => (
                <span key={label}>
                  {label}: {colorCounts[index] ?? 0}
                </span>
              ))}
              <span>Ignored: {colorCounts[8] ?? 0}</span>
            </div>
          </div>

          <div className="panel-section compact">
            <h2>Centers</h2>
            <div className="targets">
              <span>UF targets: {centerTargets.uf.map((entry) => entry ?? "-").join(", ")}</span>
              <span>RL targets: {centerTargets.rl.map((entry) => entry ?? "-").join(", ")}</span>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
