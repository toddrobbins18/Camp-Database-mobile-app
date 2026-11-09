import {
  campMinutesToEpochMs,
  divisionLeaderLiveActivityContent,
} from "../divisionLeaderLiveActivity";

const nowLine = {
  groupName: "Barcelona",
  activity: "Change",
  startMinutes: 600,
  endMinutes: 645,
};

describe("divisionLeaderLiveActivityContent", () => {
  it("hides the lock screen card when there is no current period", () => {
    expect(
      divisionLeaderLiveActivityContent(
        {
          visible: true,
          lines: [],
          phase: "idle",
        },
        "2026-07-08",
      ),
    ).toBeNull();
  });

  it("can show a short idle card so a rebuild can be checked at night", () => {
    const content = divisionLeaderLiveActivityContent(
      {
        visible: true,
        lines: [],
        phase: "idle",
      },
      "2026-07-08",
      { allowIdle: true },
    );
    expect(content?.title).toBe("Camp schedule");
    expect(content?.subtitle).toBe("No activity right now");
  });

  it("uses the activity as the title and groups as the subtitle", () => {
    const content = divisionLeaderLiveActivityContent(
      {
        visible: true,
        phase: "now",
        lines: [nowLine, { ...nowLine, groupName: "Blue Jays" }],
      },
      "2026-07-08",
    );
    expect(content?.title).toBe("Change");
    expect(content?.subtitle).toBe("Barcelona · Blue Jays");
    expect(content?.endMs).toBe(campMinutesToEpochMs("2026-07-08", 645));
  });

  it("prefixes Next when the next period has not started yet", () => {
    const content = divisionLeaderLiveActivityContent(
      {
        visible: true,
        phase: "next",
        lines: [{ ...nowLine, activity: "Swim", startMinutes: 660, endMinutes: 705 }],
      },
      "2026-07-08",
    );
    expect(content?.title).toBe("Next: Swim");
    expect(content?.endMs).toBe(campMinutesToEpochMs("2026-07-08", 660));
  });
});
