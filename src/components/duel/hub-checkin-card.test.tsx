import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HubCheckinCard } from "./hub-checkin-card";

const clubs = vi.hoisted(() => ({ data: undefined as unknown }));
vi.mock("@/hooks/queries/use-clubs", () => ({ useMyClubs: () => ({ data: clubs.data }) }));
const api = vi.hoisted(() => ({ checkIn: vi.fn(), pos: vi.fn() }));
vi.mock("@/services/hub-checkin", async () => {
  const actual = await vi.importActual<typeof import("@/services/hub-checkin")>("@/services/hub-checkin");
  return { ...actual, checkInToHub: api.checkIn, getCurrentPosition: api.pos };
});
import { PositionError } from "@/services/hub-checkin";

describe("HubCheckinCard", () => {
  beforeEach(() => { api.checkIn.mockReset(); api.pos.mockReset(); });
  it("renders nothing without a hub", () => {
    clubs.data = [];
    const { container } = render(<HubCheckinCard />);
    expect(container).toBeEmptyDOMElement();
  });
  it("asks for the position only on tap, then checks in", async () => {
    clubs.data = [{ hub_id: "h1", name: "Delhi Hub" }];
    api.pos.mockResolvedValue({ latitude: 28.6, longitude: 77.2 });
    api.checkIn.mockResolvedValue(undefined);
    render(<HubCheckinCard />);
    expect(api.pos).not.toHaveBeenCalled();
    await userEvent.click(screen.getByTestId("hub-checkin-button"));
    await waitFor(() => expect(api.checkIn).toHaveBeenCalledWith("h1", 28.6, 77.2));
    expect(await screen.findByText(/Double XP is on/)).toBeInTheDocument();
  });
  it("explains a denied permission", async () => {
    clubs.data = [{ hub_id: "h1", name: "Delhi Hub" }];
    api.pos.mockRejectedValue(new PositionError("denied"));
    render(<HubCheckinCard />);
    await userEvent.click(screen.getByTestId("hub-checkin-button"));
    expect(await screen.findByText(/Location is turned off/)).toBeInTheDocument();
    expect(api.checkIn).not.toHaveBeenCalled();
  });
});
