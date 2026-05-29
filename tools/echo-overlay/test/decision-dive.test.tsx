import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DecisionDive } from "../src/components";
import { decisionCard } from "./fixtures";

describe("DecisionDive", () => {
  it("renders the existing DecisionCard fields unchanged with SEE+JUMP source targets", () => {
    const card = decisionCard();
    const openSource = vi.fn();

    render(<DecisionDive card={card} onOpenSource={openSource} />);

    expect(screen.getByRole("heading", { name: card.title })).toBeInTheDocument();
    expect(screen.getByText(card.decision)).toBeInTheDocument();
    expect(screen.getByText(card.whyNow)).toBeInTheDocument();
    expect(screen.getByText(card.default)).toBeInTheDocument();
    expect(screen.getByText(card.options[0]!)).toBeInTheDocument();
    expect(screen.getByText(card.blocking![0]!)).toBeInTheDocument();
    expect(screen.getByText("runaway_churn: churned 5 rounds without pulling you in")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open review round" }));
    expect(openSource).toHaveBeenCalledTimes(1);
    expect(openSource).toHaveBeenCalledWith(card.sources[0]);
    expect(screen.queryByRole("button", { name: /approve|pushback|write|act/i })).not.toBeInTheDocument();
  });

  it("renders an empty read-only dive when no card is selected", () => {
    render(<DecisionDive card={null} onOpenSource={vi.fn()} />);

    expect(screen.getByText("No pending decision selected")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
