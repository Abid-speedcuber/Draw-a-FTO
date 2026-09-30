import type { MutableRefObject } from "react";
import { useEffect, useRef, useState } from "react";

export type FtoViewerMode = "pan" | "paint" | "swap";

export type CenterTargets = {
  uf: Array<number | null>;
  rl: Array<number | null>;
  ufSources: Array<number | null>;
  rlSources: Array<number | null>;
  rlTopSources: number[][];
};

export type FtoViewerApi = {
  applyAlgorithm(algorithm: string): void;
  applyAlgorithmInstant(algorithm: string): void;
  getFacelets(): number[];
  setFacelets(facelets: number[]): void;
  setKeyboardEnabled(enabled: boolean): void;
  getFaceletTransition(algorithm: string): number[] | null;
  getCenterTargets(): CenterTargets;
  copyPngToClipboard(): Promise<void>;
  setMode(mode: FtoViewerMode): void;
  setColor(color: number): void;
  setFaceColors(colors: string[]): void;
  setTopFaceOpacity(opacity: number): void;
  setTopFaceXOffset(offset: number): void;
  setTopFaceYOffset(offset: number): void;
  setTopFaceZOffset(offset: number): void;
  setLastLayerMode(enabled: boolean): void;
  resetPuzzle(): void;
  resetView(): void;
  dispose(): void;
};

declare global {
  interface Window {
    createFtoViewer?: (
      container: HTMLElement,
      options?: {
        keyboard?: boolean;
        faceColors?: string[];
        topFaceOpacity?: number;
        topFaceXOffset?: number;
        topFaceYOffset?: number;
        topFaceZOffset?: number;
        onFacelets?: (facelets: number[]) => void;
        onCenterTargets?: (targets: CenterTargets) => void;
      },
    ) => FtoViewerApi;
  }
}

type Props = {
  mode: FtoViewerMode;
  selectedColor: number;
  faceColors: string[];
  topFaceOpacity: number;
  topFaceXOffset: number;
  topFaceYOffset: number;
  topFaceZOffset: number;
  keyboardEnabled: boolean;
  lastLayerMode: boolean;
  viewerApiRef: MutableRefObject<FtoViewerApi | null>;
  onFacelets: (facelets: number[]) => void;
  onCenterTargets: (targets: CenterTargets) => void;
};

export default function FtoViewer({
  mode,
  selectedColor,
  faceColors,
  topFaceOpacity,
  topFaceXOffset,
  topFaceYOffset,
  topFaceZOffset,
  keyboardEnabled,
  lastLayerMode,
  viewerApiRef,
  onFacelets,
  onCenterTargets,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<FtoViewerApi | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hostRef.current || !window.createFtoViewer) {
      return;
    }

    const viewer = window.createFtoViewer(hostRef.current, {
      keyboard: keyboardEnabled,
      faceColors,
      topFaceOpacity,
      topFaceXOffset,
      topFaceYOffset,
      topFaceZOffset,
      onFacelets,
      onCenterTargets,
    });
    viewerRef.current = viewer;
    viewerApiRef.current = viewer;
    setReady(true);

    return () => {
      setReady(false);
      viewer.dispose();
      viewerRef.current = null;
      if (viewerApiRef.current === viewer) {
        viewerApiRef.current = null;
      }
    };
  }, [onCenterTargets, onFacelets, viewerApiRef]);

  useEffect(() => {
    viewerRef.current?.setMode(mode);
  }, [mode]);

  useEffect(() => {
    viewerRef.current?.setColor(selectedColor);
  }, [selectedColor]);

  useEffect(() => {
    viewerRef.current?.setFaceColors(faceColors);
  }, [faceColors]);

  useEffect(() => {
    viewerRef.current?.setTopFaceOpacity(topFaceOpacity);
  }, [topFaceOpacity]);

  useEffect(() => {
    viewerRef.current?.setTopFaceXOffset(topFaceXOffset);
  }, [topFaceXOffset]);

  useEffect(() => {
    viewerRef.current?.setTopFaceYOffset(topFaceYOffset);
  }, [topFaceYOffset]);

  useEffect(() => {
    viewerRef.current?.setTopFaceZOffset(topFaceZOffset);
  }, [topFaceZOffset]);

  useEffect(() => {
    viewerRef.current?.setKeyboardEnabled(keyboardEnabled);
  }, [keyboardEnabled]);

  useEffect(() => {
    viewerRef.current?.setLastLayerMode(lastLayerMode);
  }, [lastLayerMode]);

  return (
    <div className="viewer-shell">
      <div ref={hostRef} className="viewer-host" />
      {!ready ? <div className="viewer-loading">Loading FTO viewer</div> : null}
    </div>
  );
}
