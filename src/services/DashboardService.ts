import { db } from "../database/db";

export interface DashboardStats {
  currentWeek: number;
  gmName: string; // <--- NUEVO
  brandName: string; // <--- NUEVO
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

// Helper para calcular rachas (Sin cambios)
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
    // 1. OBTENER ESTADO ACTUAL (Actualizado para traer nombre y marca)
    const stateResult: any = await db.getFirstAsync(
      "SELECT currentWeek, name, brand FROM saves WHERE id = ?",
      [saveId]
    );

    if (stateResult) {
      currentWeek = stateResult.currentWeek || 1;
      gmName = stateResult.name || "GM";
      brandName = stateResult.brand || "Brand";
    }

    // 2. LUCHADORES
    const luchadores: any[] = await db.getAllAsync(
      "SELECT id, name, imageUri FROM luchadores WHERE save_id = ?",
      [saveId]
    );
    const idToLuchadorMap = luchadores.reduce(
      (acc, l) => ({ ...acc, [l.id]: l }),
      {}
    );
    const allLuchadoresIds = luchadores.map((l) => l.id);

    // 3. HISTORIAL
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
        name: idToLuchadorMap[id]?.name || "Luchador",
        imageUri: idToLuchadorMap[id]?.imageUri,
        count,
      }))
      .filter((item) => item.count >= 3 || item.count <= -3)
      .sort((a, b) => Math.abs(b.count) - Math.abs(a.count))
      .slice(0, 10);

    // 4. HITOS
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

    // 5. FINANZAS
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

    // 6. NOTICIAS INTELIGENTES
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

    // A) RACHAS ROTAS
    lastWeekMatches.forEach((match) => {
      if (!match.participants) return;
      try {
        const pData = JSON.parse(match.participants);
        const winners = pData.winner || [];
        const losers = pData.losers || [];

        winners.forEach((id: number) => {
          const prevStreak = oldStreaks[id] || 0;
          if (prevStreak <= -3) {
            const name = idToLuchadorMap[id]?.name || "Luchador";
            news.push({
              type: "STREAK_BROKEN",
              text: "¡REDENCIÓN!",
              subtext: `${name} rompió su racha de ${Math.abs(
                prevStreak
              )} derrotas.`,
            });
          }
        });

        losers.forEach((id: number) => {
          const prevStreak = oldStreaks[id] || 0;
          if (prevStreak >= 3) {
            const name = idToLuchadorMap[id]?.name || "Luchador";
            news.push({
              type: "UPSET",
              text: "SORPRESA",
              subtext: `${name} pierde tras ${prevStreak} victorias seguidas.`,
            });
          }
        });
      } catch (e) {}
    });

    // B) TÍTULOS
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

      const displayTitle = realTitleName || "Campeonato";
      const winnerDisplay = match.winnerName || "Campeón";

      if (match.isTitleChange === 1) {
        news.push({
          type: "TITLE_CHANGE",
          text: "¡NUEVO CAMPEÓN!",
          subtext: `${winnerDisplay} ha capturado el ${displayTitle}.`,
        });
      } else {
        news.push({
          type: "TITLE_RETAIN",
          text: "AND STILL...",
          subtext: `${winnerDisplay} retuvo exitosamente el ${displayTitle}.`,
        });
      }
    });

    // C) RACHAS ACTUALES
    const activeHotStreaks = momentumList.filter((p) => p.count >= 4);
    if (activeHotStreaks.length === 1) {
      news.push({
        type: "STREAK",
        text: `${activeHotStreaks[0].name} IMPARABLE`,
        subtext: `Acumula ${activeHotStreaks[0].count} victorias al hilo.`,
      });
    } else if (activeHotStreaks.length > 1) {
      news.push({
        type: "GROUP_STREAK",
        text: "MOMENTUM POSITIVO",
        subtext: `${activeHotStreaks.length} luchadores están imparables.`,
        data: activeHotStreaks,
      });
    }

    const activeColdStreaks = momentumList.filter((p) => p.count <= -3);
    if (activeColdStreaks.length === 1) {
      news.push({
        type: "BAD_STREAK",
        text: "CRISIS",
        subtext: `${activeColdStreaks[0].name} suma ${Math.abs(
          activeColdStreaks[0].count
        )} derrotas seguidas.`,
      });
    } else if (activeColdStreaks.length > 1) {
      news.push({
        type: "GROUP_BAD_STREAK",
        text: "MALA RACHA",
        subtext: `${activeColdStreaks.length} luchadores en crisis de resultados.`,
        data: activeColdStreaks,
      });
    }

    // D) FINANZAS
    const lastWeekFin = finances.find((f: any) => f.week === lastShowWeek);
    if (lastWeekFin && lastWeekFin.profit < 0) {
      news.push({
        type: "FINANCE_BAD",
        text: "Números Rojos",
        subtext: "La semana pasada perdimos dinero. Revisa los gastos.",
      });
    }

    if (news.length === 0) {
      news.push({
        type: "INFO",
        text: "Semana Tranquila",
        subtext: "Todo listo para el siguiente show.",
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
      gmName, // <--- Devolvemos GM
      brandName, // <--- Devolvemos Brand
      hotStreaks: momentumList,
      milestones,
      finances,
      news,
    };
  } catch (error) {
    console.error("Error calculando Dashboard:", error);
    return {
      currentWeek,
      gmName: "GM",
      brandName: "Brand",
      hotStreaks: [],
      milestones: [],
      finances: [],
      news: [],
    };
  }
};
