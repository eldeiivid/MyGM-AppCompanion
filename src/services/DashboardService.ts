import { db } from "../database/db";

export interface DashboardStats {
  currentWeek: number;
  gmName: string;
  brandName: string;
  hotStreaks: { id: number; name: string; count: number; imageUri: string }[];
  milestones: {
    title: string;
    champion: string;
    days: number;
    status: "golden" | "danger" | "normal";
  }[];
  finances: {
    week: number;
    income: number;
    expenses: number;
    profit: number;
  }[];
  news: { type: string; text: string; subtext: string; data?: any[] }[];
}

// Helper to calculate streaks (No changes needed here logic-wise)
const calculateStreaksFromHistory = (
  historyItems: any[],
  allLuchadoresIds: number[]
) => {
  const streaks: { [key: number]: number } = {};
  allLuchadoresIds.forEach((id) => (streaks[id] = 0));

  historyItems.forEach((match) => {
    if (match.participants) {
      try {
        const pData = JSON.parse(match.participants);
        const winners = pData.winner || [];
        const losers = pData.losers || [];

        winners.forEach((id: number) => {
          const current = streaks[id] || 0;
          streaks[id] = current > 0 ? current + 1 : 1;
        });

        losers.forEach((id: number) => {
          const current = streaks[id] || 0;
          streaks[id] = current < 0 ? current - 1 : -1;
        });
      } catch (e) {}
    } else if (match.winnerId) {
      const current = streaks[match.winnerId] || 0;
      streaks[match.winnerId] = current > 0 ? current + 1 : 1;
    }
  });
  return streaks;
};

export const getDashboardData = async (
  saveId: number
): Promise<DashboardStats> => {
  let currentWeek = 1;
  let gmName = "General Manager";
  let brandName = "MyGM";

  try {
    // 1. GET CURRENT STATE
    const stateResult: any = await db.getFirstAsync(
      "SELECT currentWeek, name, brand FROM saves WHERE id = ?",
      [saveId]
    );

    if (stateResult) {
      currentWeek = stateResult.currentWeek || 1;
      gmName = stateResult.name || "GM";
      brandName = stateResult.brand || "Brand";
    }

    // 2. ROSTER (Luchadores -> Wrestlers/Superstars)
    const luchadores: any[] = await db.getAllAsync(
      "SELECT id, name, imageUri FROM luchadores WHERE save_id = ?",
      [saveId]
    );
    const idToLuchadorMap = luchadores.reduce(
      (acc, l) => ({ ...acc, [l.id]: l }),
      {}
    );
    const allLuchadoresIds = luchadores.map((l) => l.id);

    // 3. HISTORY
    const fullHistory: any[] = await db.getAllAsync(
      "SELECT * FROM match_history WHERE save_id = ? ORDER BY id ASC",
      [saveId]
    );

    const currentStreaks = calculateStreaksFromHistory(
      fullHistory,
      allLuchadoresIds
    );

    const momentumList = Object.entries(currentStreaks)
      .map(([id, count]) => ({
        id: Number(id),
        name: idToLuchadorMap[id]?.name || "Wrestler",
        imageUri: idToLuchadorMap[id]?.imageUri,
        count,
      }))
      .filter((item) => item.count >= 3 || item.count <= -3)
      .sort((a, b) => Math.abs(b.count) - Math.abs(a.count))
      .slice(0, 10);

    // 4. MILESTONES (Titles)
    const titles: any[] = await db.getAllAsync(
      `SELECT t.id, t.name as titleName, t.weekWon, l.name as champName 
       FROM titles t 
       LEFT JOIN luchadores l ON t.holderId1 = l.id 
       WHERE t.save_id = ? AND t.holderId1 IS NOT NULL`,
      [saveId]
    );

    const allTitleNames: any[] = await db.getAllAsync(
      "SELECT id, name FROM titles WHERE save_id = ?",
      [saveId]
    );
    const titleNameMap: Record<number, string> = {};
    allTitleNames.forEach((t) => {
      titleNameMap[t.id] = t.name;
    });

    const milestones = titles
      .map((t) => {
        const weeksHeld = currentWeek - t.weekWon;
        const daysHeld = weeksHeld * 7;
        let status: "normal" | "golden" | "danger" = "normal";
        if (daysHeld >= 100) status = "golden";
        else if (daysHeld > 25 && daysHeld < 30) status = "danger";

        return {
          title: t.titleName,
          champion: t.champName,
          days: daysHeld,
          status,
        };
      })
      .sort((a, b) => b.days - a.days);

    // 5. FINANCES
    const financesRaw: any[] = await db.getAllAsync(
      `SELECT week, type, amount FROM finances WHERE save_id = ? AND week >= ? ORDER BY week ASC`,
      [saveId, currentWeek - 3]
    );

    const financesMap: any = {};
    financesRaw.forEach((f) => {
      if (!financesMap[f.week])
        financesMap[f.week] = {
          week: f.week,
          income: 0,
          expenses: 0,
          profit: 0,
        };
      if (f.type === "INCOME") financesMap[f.week].income += f.amount;
      if (f.type === "EXPENSE") financesMap[f.week].expenses += f.amount;
    });

    const finances = Object.values(financesMap).map((f: any) => ({
      ...f,
      profit: f.income - f.expenses,
    }));

    // 6. SMART NEWS GENERATION
    const news: any[] = [];
    const lastShowWeek = currentWeek > 1 ? currentWeek - 1 : 1;

    const lastWeekMatches = fullHistory.filter((m) => m.week === lastShowWeek);
    const historyBeforeLastWeek = fullHistory.filter(
      (m) => m.week < lastShowWeek
    );
    const oldStreaks = calculateStreaksFromHistory(
      historyBeforeLastWeek,
      allLuchadoresIds
    );

    // A) BROKEN STREAKS & UPSETS
    lastWeekMatches.forEach((match) => {
      if (!match.participants) return;
      try {
        const pData = JSON.parse(match.participants);
        const winners = pData.winner || [];
        const losers = pData.losers || [];

        winners.forEach((id: number) => {
          const prevStreak = oldStreaks[id] || 0;
          if (prevStreak <= -3) {
            const name = idToLuchadorMap[id]?.name || "Wrestler";
            news.push({
              type: "STREAK_BROKEN",
              text: "REDEMPTION!",
              subtext: `${name} snapped a ${Math.abs(
                prevStreak
              )} match losing streak.`,
            });
          }
        });

        losers.forEach((id: number) => {
          const prevStreak = oldStreaks[id] || 0;
          if (prevStreak >= 3) {
            const name = idToLuchadorMap[id]?.name || "Wrestler";
            news.push({
              type: "UPSET",
              text: "UPSET ALERT",
              subtext: `${name} lost after ${prevStreak} consecutive wins.`,
            });
          }
        });
      } catch (e) {}
    });

    // B) TITLES
    const titleMatches = lastWeekMatches.filter(
      (m) => m.titleName !== null && m.titleName !== undefined
    );

    titleMatches.forEach((match) => {
      let realTitleName = match.titleName;

      if (realTitleName && realTitleName.startsWith("Title ")) {
        const idPart = realTitleName.split(" ")[1];
        const titleId = parseInt(idPart);
        if (titleNameMap[titleId]) {
          realTitleName = titleNameMap[titleId];
        }
      }

      const displayTitle = realTitleName || "Championship";
      const winnerDisplay = match.winnerName || "Champion";

      if (match.isTitleChange === 1) {
        news.push({
          type: "TITLE_CHANGE",
          text: "NEW CHAMPION!",
          subtext: `${winnerDisplay} has captured the ${displayTitle}.`,
        });
      } else {
        news.push({
          type: "TITLE_RETAIN",
          text: "AND STILL...",
          subtext: `${winnerDisplay} successfully retained the ${displayTitle}.`,
        });
      }
    });

    // C) CURRENT STREAKS
    const activeHotStreaks = momentumList.filter((p) => p.count >= 4);
    if (activeHotStreaks.length === 1) {
      news.push({
        type: "STREAK",
        text: `${activeHotStreaks[0].name} ON FIRE`,
        subtext: `Riding a ${activeHotStreaks[0].count} match winning streak.`,
      });
    } else if (activeHotStreaks.length > 1) {
      news.push({
        type: "GROUP_STREAK",
        text: "MOMENTUM SHIFT",
        subtext: `${activeHotStreaks.length} superstars are currently unstoppable.`,
        data: activeHotStreaks,
      });
    }

    const activeColdStreaks = momentumList.filter((p) => p.count <= -3);
    if (activeColdStreaks.length === 1) {
      news.push({
        type: "BAD_STREAK",
        text: "COLD STREAK",
        subtext: `${activeColdStreaks[0].name} has lost ${Math.abs(
          activeColdStreaks[0].count
        )} matches in a row.`,
      });
    } else if (activeColdStreaks.length > 1) {
      news.push({
        type: "GROUP_BAD_STREAK",
        text: "LOSING SKID",
        subtext: `${activeColdStreaks.length} superstars are struggling to find a win.`,
        data: activeColdStreaks,
      });
    }

    // D) FINANCES
    const lastWeekFin = finances.find((f: any) => f.week === lastShowWeek);
    if (lastWeekFin && lastWeekFin.profit < 0) {
      news.push({
        type: "FINANCE_BAD",
        text: "IN THE RED",
        subtext: "Negative profit last week. Watch your budget.",
      });
    }

    if (news.length === 0) {
      news.push({
        type: "INFO",
        text: "Quiet Week",
        subtext: "Everything set for the next show.",
      });
    }

    const newsPriority: Record<string, number> = {
      TITLE_CHANGE: 1,
      STREAK_BROKEN: 2,
      UPSET: 3,
      TITLE_RETAIN: 4,
      GROUP_BAD_STREAK: 5,
      BAD_STREAK: 6,
      GROUP_STREAK: 7,
      STREAK: 8,
      FINANCE_BAD: 9,
      INFO: 10,
    };

    news.sort(
      (a, b) => (newsPriority[a.type] || 99) - (newsPriority[b.type] || 99)
    );

    return {
      currentWeek,
      gmName,
      brandName,
      hotStreaks: momentumList,
      milestones,
      finances,
      news,
    };
  } catch (error) {
    console.error("Error calculating Dashboard:", error);
    return {
      currentWeek: 1,
      gmName: "GM",
      brandName: "Brand",
      hotStreaks: [],
      milestones: [],
      finances: [],
      news: [],
    };
  }
};
