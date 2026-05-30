import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DecisionDive, FleetGlanceView, SourceBanner, warningsForGlance } from "./components";
import type { FleetNode } from "./lib/fleet";
import {
  classifyOverlayError,
  loadAmbientDot,
  loadOverlayData,
  readOverlayConfig,
  servicesFromBridge,
  type OverlayData,
  type OverlayErrorView,
} from "./lib/model";
import { startSingleFlightPoller, type PollerHandle } from "./lib/poller";
import type { DecisionSourceLink } from "./lib/types";
import { hasTauriRuntime, tauriBridge, type OverlayBridge } from "./lib/bridge";

interface AppProps {
  bridge?: OverlayBridge;
}

export function App({ bridge = tauriBridge }: AppProps) {
  const config = useMemo(() => readOverlayConfig(), []);
  const services = useMemo(() => servicesFromBridge(bridge), [bridge]);
  const overlayPoller = useRef<PollerHandle | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<OverlayData | null>(null);
  const [error, setError] = useState<OverlayErrorView | null>(null);
  const [ambientError, setAmbientError] = useState<OverlayErrorView | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const stopOverlayPolling = useCallback(() => {
    overlayPoller.current?.stop();
    overlayPoller.current = null;
    setIsOpen(false);
    setIsLoading(false);
  }, []);

  const startOverlayPolling = useCallback(() => {
    stopOverlayPolling();
    setIsOpen(true);
    setIsLoading(true);
    overlayPoller.current = startSingleFlightPoller({
      load: () => loadOverlayData(config, services),
      onResult: (next) => {
        setData(next);
        setError(null);
        setIsLoading(false);
        setSelectedId((existing) => selectStableDecision(existing, next));
      },
      onError: (err) => {
        setError(classifyOverlayError(err));
        setIsLoading(false);
      },
    });
  }, [config, services, stopOverlayPolling]);

  useEffect(() => {
    const ambientPoller = startSingleFlightPoller({
      load: async () => {
        const dot = await loadAmbientDot(config, services);
        await bridge.setAmbientDot(dot);
        return dot;
      },
      onResult: () => setAmbientError(null),
      onError: (err) => {
        setAmbientError(classifyOverlayError(err));
        void bridge.setAmbientDot("unknown");
      },
    });
    return () => ambientPoller.stop();
  }, [bridge, config, services]);

  useEffect(() => {
    let shown: (() => void) | null = null;
    let hidden: (() => void) | null = null;
    let cancelled = false;

    void bridge.onOverlayShown(startOverlayPolling).then((unlisten) => {
      if (cancelled) {
        unlisten();
        return;
      }
      shown = unlisten;
    });
    void bridge.onOverlayHidden(stopOverlayPolling).then((unlisten) => {
      if (cancelled) {
        unlisten();
        return;
      }
      hidden = unlisten;
    });

    if (!hasTauriRuntime()) startOverlayPolling();

    return () => {
      cancelled = true;
      shown?.();
      hidden?.();
      stopOverlayPolling();
    };
  }, [bridge, startOverlayPolling, stopOverlayPolling]);

  useEffect(() => {
    if (hasTauriRuntime()) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (!(event.metaKey || event.ctrlKey) || !event.shiftKey || (key !== "d" && key !== "e")) return;
      event.preventDefault();
      if (isOpen) {
        stopOverlayPolling();
      } else {
        startOverlayPolling();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, startOverlayPolling, stopOverlayPolling]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      stopOverlayPolling();
      void bridge.dismissOverlay();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [bridge, isOpen, stopOverlayPolling]);

  const selectedCard =
    data?.glance.nodes.find((node) => node.itemId === selectedId && node.card !== undefined)?.card ??
    data?.glance.nodes.find((node) => node.card !== undefined)?.card ??
    null;

  const openSource = useCallback(
    (source: DecisionSourceLink) => {
      void bridge.openTarget(source.href);
    },
    [bridge],
  );

  const sourceError = error?.message ?? (data === null ? ambientError?.message ?? null : null);
  const warnings = warningsForGlance(data?.glance ?? null);

  return (
    <main className="overlay-shell" data-open={isOpen}>
      <SourceBanner warnings={warnings} error={sourceError} />
      <div className="content-grid" aria-busy={isLoading}>
        {data === null ? (
          <section className="fleet-pane" aria-label="Fleet glance">
            <header className="pane-header">
              <h1>Fleet</h1>
              <span>{isLoading ? "syncing" : "idle"}</span>
            </header>
            <div className="empty-state">{isLoading ? "Loading current decisions" : "No fleet data loaded"}</div>
          </section>
        ) : (
          <FleetGlanceView
            glance={data.glance}
            selectedId={selectedId}
            onSelect={(node: FleetNode) => {
              if (node.needsYou) setSelectedId(node.itemId);
            }}
          />
        )}
        <DecisionDive card={selectedCard} onOpenSource={openSource} />
      </div>
    </main>
  );
}

function selectStableDecision(existing: string | null, data: OverlayData): string | null {
  if (existing !== null && data.glance.nodes.some((node) => node.itemId === existing && node.card !== undefined)) {
    return existing;
  }
  return data.glance.nodes.find((node) => node.card !== undefined)?.itemId ?? null;
}
