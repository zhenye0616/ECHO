import type { FleetGlance, FleetNode } from "./lib/fleet";
import { sourceWarnings } from "./lib/fleet";
import type { DecisionCard, DecisionSourceLink } from "./lib/types";

export function SourceBanner({ warnings, error }: { warnings: string[]; error: string | null }) {
  const messages = [...(error === null ? [] : [error]), ...warnings];
  if (messages.length === 0) return null;
  return (
    <section className="source-banner" aria-label="Source warnings">
      {messages.map((message) => (
        <div className="source-warning" key={message}>
          {message}
        </div>
      ))}
    </section>
  );
}

export function FleetGlanceView({
  glance,
  selectedId,
  onSelect,
}: {
  glance: FleetGlance;
  selectedId: string | null;
  onSelect: (node: FleetNode) => void;
}) {
  return (
    <section className="fleet-pane" aria-label="Fleet glance">
      <header className="pane-header">
        <h1>Fleet</h1>
        <span>{glance.nodes.length}</span>
      </header>
      <div className="fleet-list">
        {glance.nodes.map((node) => (
          <button
            className={`fleet-row state-${node.state}${selectedId === node.itemId ? " selected" : ""}`}
            type="button"
            key={node.itemId}
            onClick={() => onSelect(node)}
            disabled={!node.needsYou}
          >
            <span className="state-dot" aria-hidden="true" />
            <span className="node-copy">
              <strong>{node.title}</strong>
              <span>{node.itemId}</span>
            </span>
            <span className="node-meta">
              {node.needsYou ? "needs you" : node.state.replace("_", " ")}
              {node.health !== undefined ? ` · ${node.health.open_deadlines + node.health.recent_misses} health` : ""}
            </span>
          </button>
        ))}
        {glance.nodes.length === 0 ? <div className="empty-row">No in-flight items</div> : null}
      </div>
      {glance.scannedReviewRoots.length > 0 ? (
        <footer className="scan-footnote">{glance.scannedReviewRoots.length} in-flight review roots scanned</footer>
      ) : null}
    </section>
  );
}

export function DecisionDive({
  card,
  onOpenSource,
}: {
  card: DecisionCard | null;
  onOpenSource: (source: DecisionSourceLink) => void;
}) {
  if (card === null) {
    return (
      <section className="decision-pane" aria-label="Decision dive">
        <div className="empty-state">No pending decision selected</div>
      </section>
    );
  }

  return (
    <section className="decision-pane" aria-label="Decision dive">
      <header className="decision-header">
        <div>
          <h2>{card.title}</h2>
          <p>{card.whyNow}</p>
        </div>
        {card.signals.length > 0 ? <span className="signal-pill">A1</span> : null}
      </header>

      <dl className="decision-fields">
        <div>
          <dt>Decision</dt>
          <dd>{card.decision}</dd>
        </div>
        <div>
          <dt>Default</dt>
          <dd>{card.default}</dd>
        </div>
        {card.deadline !== undefined ? (
          <div>
            <dt>Deadline</dt>
            <dd>{card.deadline}</dd>
          </div>
        ) : null}
      </dl>

      <SectionList title="Options" values={card.options} />
      <SectionList title="Blocking" values={card.blocking ?? []} />
      <SectionList title="Agents" values={card.agents} />
      <SectionList title="Signals" values={card.signals.map((signal) => `${signal.kind}: ${signal.detail}`)} />

      <section className="source-actions" aria-label="SEE and JUMP targets">
        <h3>Sources</h3>
        <div className="source-buttons">
          {card.sources.map((source) => (
            <button type="button" key={`${card.id}:${source.href}`} onClick={() => onOpenSource(source)}>
              Open {source.label}
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}

export function warningsForGlance(glance: FleetGlance | null): string[] {
  return glance === null ? [] : sourceWarnings(glance.source_state);
}

function SectionList({ title, values }: { title: string; values: string[] }) {
  if (values.length === 0) return null;
  return (
    <section className="detail-section">
      <h3>{title}</h3>
      <ul>
        {values.map((value) => (
          <li key={value}>{value}</li>
        ))}
      </ul>
    </section>
  );
}
