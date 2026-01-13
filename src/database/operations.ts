import { Luchador } from "../types";
import { db } from "./db";

// ==========================================
// 1. GESTIÓN DEL ESTADO Y FINANZAS
// ==========================================

export const getGameState = (saveId: number) => {
  try {
    // Ahora leemos el estado desde la tabla 'saves'
    return db.getFirstSync(
      "SELECT currentWeek, currentCash FROM saves WHERE id = ?",
      [saveId]
    );
  } catch (e) {
    return { currentWeek: 1, currentCash: 0 };
  }
};

export const deleteSave = (saveId: number) => {
  try {
    // Al borrar el save, el CASCADE de SQL borrará todo lo demás (luchadores, matches, etc.)
    db.runSync("DELETE FROM saves WHERE id = ?", [saveId]);
    return true;
  } catch (e) {
    return false;
  }
};

export const updateCash = (
  saveId: number,
  amount: number,
  description: string,
  type: "INCOME" | "EXPENSE"
) => {
  try {
    db.withTransactionSync(() => {
      const finalAmount = type === "INCOME" ? amount : -amount;

      // Actualizamos el dinero en la tabla 'saves'
      db.runSync(
        `UPDATE saves SET currentCash = currentCash + ? WHERE id = ?`,
        [finalAmount, saveId]
      );

      const state: any = db.getFirstSync(
        "SELECT currentWeek FROM saves WHERE id = ?",
        [saveId]
      );

      // Insertamos en finanzas con save_id
      db.runSync(
        `INSERT INTO finances (save_id, week, category, description, amount, type, date) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          saveId,
          state.currentWeek,
          "General",
          description,
          amount,
          type,
          new Date().toISOString(),
        ]
      );
    });
    return true;
  } catch (e) {
    return false;
  }
};

export const getTransactionHistory = (saveId: number) => {
  try {
    const rows = db.getAllSync(
      `SELECT * FROM finances WHERE save_id = ? ORDER BY id DESC LIMIT 50`,
      [saveId]
    );
    return rows;
  } catch (error) {
    console.error("Error al leer finanzas:", error);
    return [];
  }
};

export const getCurrentWeekFinances = (saveId: number) => {
  try {
    const state: any = db.getFirstSync(
      "SELECT currentWeek FROM saves WHERE id = ?",
      [saveId]
    );
    const week = state?.currentWeek || 1;

    const rows: any[] = db.getAllSync(
      `SELECT type, amount FROM finances WHERE save_id = ? AND week = ?`,
      [saveId, week]
    );

    let income = 0;
    let expense = 0;

    rows.forEach((r) => {
      if (r.type === "INCOME" || r.type === "IN") income += r.amount;
      else expense += r.amount;
    });

    return { income, expense, net: income - expense };
  } catch (error) {
    return { income: 0, expense: 0, net: 0 };
  }
};

export const addManualTransaction = (
  saveId: number,
  category: string,
  description: string,
  amount: number,
  type: "IN" | "OUT"
) => {
  try {
    const state: any = db.getFirstSync(
      "SELECT currentWeek, currentCash FROM saves WHERE id = ?",
      [saveId]
    );
    const currentWeek = state.currentWeek;
    const currentCash = state.currentCash;

    const dbType = type === "IN" ? "INCOME" : "EXPENSE";

    db.runSync(
      `INSERT INTO finances (save_id, week, category, description, amount, type, date) 
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [saveId, currentWeek, category, description, amount, dbType]
    );

    const newCash = type === "IN" ? currentCash + amount : currentCash - amount;
    db.runSync(`UPDATE saves SET currentCash = ? WHERE id = ?`, [
      newCash,
      saveId,
    ]);

    return true;
  } catch (error) {
    console.error("Error al agregar transacción:", error);
    return false;
  }
};

// ==========================================
// 2. GESTIÓN DE LUCHADORES
// ==========================================

export const getAllLuchadores = (saveId: number) => {
  return db.getAllSync(
    "SELECT * FROM luchadores WHERE save_id = ? ORDER BY name ASC",
    [saveId]
  ) as Luchador[];
};

export const getLuchadorById = (id: number) => {
  // El ID es único globalmente, así que no es estrictamente necesario el saveId aquí,
  // pero es buena práctica validarlo si quisieras seguridad extra.
  return db.getFirstSync("SELECT * FROM luchadores WHERE id = ?", [
    id,
  ]) as Luchador;
};

export const addLuchador = (
  saveId: number,
  name: string,
  gender: string,
  mainClass: string,
  altClass: string,
  crowd: string,
  ringLevel: number,
  mic: number,
  weeksLeft: number,
  hiringCost: number,
  imageUri: string,
  isDraft: number = 0,
  manualWins: number = 0,
  manualLosses: number = 0
) => {
  try {
    let lastId = 0;

    db.withTransactionSync(() => {
      // 1. Insertar el Luchador con save_id
      const result = db.runSync(
        `INSERT INTO luchadores (
            save_id, name, gender, mainClass, altClass, crowd, 
            ringLevel, mic, weeksLeft, hiringCost, imageUri,
            isDraft, 
            normalWins, normalLosses
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          saveId,
          name,
          gender,
          mainClass,
          altClass,
          crowd,
          ringLevel,
          mic,
          weeksLeft,
          hiringCost,
          imageUri,
          isDraft,
          manualWins,
          manualLosses,
        ]
      );
      lastId = result.lastInsertRowId;

      // 2. Cobrar fichaje
      if (hiringCost > 0 && isDraft === 0) {
        const state: any = db.getFirstSync(
          "SELECT currentWeek FROM saves WHERE id = ?",
          [saveId]
        );
        const currentWeek = state?.currentWeek || 1;

        db.runSync(
          "UPDATE saves SET currentCash = currentCash - ? WHERE id = ?",
          [hiringCost, saveId]
        );

        db.runSync(
          `INSERT INTO finances (save_id, week, category, description, amount, type, date) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            saveId,
            currentWeek,
            "Signing",
            `Fichaje: ${name}`,
            hiringCost,
            "EXPENSE",
            new Date().toISOString(),
          ]
        );
      }
    });

    return lastId;
  } catch (e) {
    console.error("❌ Error al añadir luchador:", e);
    return false;
  }
};

export const updateLuchador = (
  id: number,
  name: string,
  gender: string,
  mainClass: string,
  altClass: string,
  crowd: string,
  ringLevel: number,
  mic: number,
  weeksLeft: number,
  hiringCost: number,
  isDraft: number,
  manualWins: number,
  manualLosses: number
) => {
  try {
    db.runSync(
      `UPDATE luchadores SET 
        name = ?, gender = ?, mainClass = ?, altClass = ?, crowd = ?, 
        ringLevel = ?, mic = ?, weeksLeft = ?, hiringCost = ?,
        isDraft = ?, 
        normalWins = ?, normalLosses = ?
        WHERE id = ?`,
      [
        name,
        gender,
        mainClass,
        altClass,
        crowd,
        ringLevel,
        mic,
        weeksLeft,
        hiringCost,
        isDraft,
        manualWins,
        manualLosses,
        id,
      ]
    );
    return true;
  } catch (e) {
    return false;
  }
};

export const deleteLuchador = (id: number) => {
  try {
    db.runSync("DELETE FROM luchadores WHERE id = ?", [id]);
    return true;
  } catch (e) {
    return false;
  }
};

// ==========================================
// 3. GESTIÓN DE TÍTULOS
// ==========================================

export const getAllTitles = (saveId: number) => {
  try {
    const query = `
      SELECT t.*, 
             l1.name as holderName1, 
             l2.name as holderName2 
      FROM titles t
      LEFT JOIN luchadores l1 ON t.holderId1 = l1.id
      LEFT JOIN luchadores l2 ON t.holderId2 = l2.id
      WHERE t.save_id = ?
    `;
    return db.getAllSync(query, [saveId]);
  } catch (e) {
    return [];
  }
};

export const assignTitleWithHistory = (
  saveId: number,
  titleId: number,
  newHolderId1: number | null,
  newHolderId2: number | null = null,
  isCashIn: boolean = false
) => {
  try {
    const state: any = db.getFirstSync(
      "SELECT currentWeek FROM saves WHERE id = ?",
      [saveId]
    );
    const week = state?.currentWeek || 1;

    db.withTransactionSync(() => {
      const current: any = db.getFirstSync(
        "SELECT * FROM titles WHERE id = ?",
        [titleId]
      );
      if (current && current.holderId1 !== null) {
        db.runSync(
          `INSERT INTO title_reigns (save_id, titleId, luchadorId1, luchadorId2, weekWon, weekLost, lostToId1, lostToId2, isCashIn)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            saveId,
            titleId,
            current.holderId1,
            current.holderId2,
            current.weekWon,
            week,
            newHolderId1,
            newHolderId2,
            isCashIn ? 1 : 0,
          ]
        );
      }
      db.runSync(
        "UPDATE titles SET holderId1 = ?, holderId2 = ?, weekWon = ? WHERE id = ?",
        [newHolderId1, newHolderId2, week, titleId]
      );
    });
    return true;
  } catch (e) {
    return false;
  }
};

export const getTitleHistory = (saveId: number, titleId: number) => {
  try {
    return db.getAllSync(
      `
      SELECT tr.*, 
             l1.name as exChamp1, l2.name as exChamp2,
             w1.name as winner1, w2.name as winner2
      FROM title_reigns tr
      LEFT JOIN luchadores l1 ON tr.luchadorId1 = l1.id
      LEFT JOIN luchadores l2 ON tr.luchadorId2 = l2.id
      LEFT JOIN luchadores w1 ON tr.lostToId1 = w1.id
      LEFT JOIN luchadores w2 ON tr.lostToId2 = w2.id
      WHERE tr.titleId = ? AND tr.save_id = ?
      ORDER BY tr.weekLost DESC
    `,
      [titleId, saveId]
    );
  } catch (e) {
    return [];
  }
};

// ==========================================
// 4. MOTOR DE BOOKING (V6 - MultiSave)
// ==========================================

export const processMatchV4 = (
  saveId: number,
  matchType: string,
  stipulationName: string,
  stipulationCost: number,
  winnerId: number,
  winnerName: string,
  winnerIds: number[],
  loserIds: number[],
  loserNames: string,
  stars: number,
  isTitleMatch: boolean,
  titleId: number | null
) => {
  let titleChanged = false;

  try {
    const state: any = db.getFirstSync(
      "SELECT currentWeek FROM saves WHERE id = ?",
      [saveId]
    );
    const week = state?.currentWeek || 1;

    db.withTransactionSync(() => {
      const participantsData = JSON.stringify({
        winner: winnerIds,
        losers: loserIds,
      });

      const dbTitleName = isTitleMatch && titleId ? `Title ${titleId}` : null;

      // CORRECCIÓN AQUÍ: 11 columnas, 11 signos de interrogación
      db.runSync(
        `INSERT INTO match_history (
          save_id, week, matchType, winnerId, winnerName, 
          loserName, rating, isTitleChange, titleName, 
          event_date, participants
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          saveId,
          week,
          matchType,
          winnerId,
          winnerName,
          loserNames,
          stars,
          0, // isTitleChange inicial
          dbTitleName,
          new Date().toISOString(),
          participantsData,
        ]
      );

      const lastMatch: any = db.getFirstSync(
        "SELECT last_insert_rowid() as id"
      );
      const matchHistoryId = lastMatch?.id;

      // Actualizar Victorias/Derrotas
      winnerIds.forEach((id) => {
        db.runSync(
          `UPDATE luchadores SET normalWins = normalWins + 1 WHERE id = ?`,
          [id]
        );
      });
      loserIds.forEach((id) => {
        db.runSync(
          `UPDATE luchadores SET normalLosses = normalLosses + 1 WHERE id = ?`,
          [id]
        );
      });

      // Lógica de Títulos
      if (isTitleMatch && titleId) {
        const title: any = db.getFirstSync(
          "SELECT holderId1, holderId2, weekWon FROM titles WHERE id = ?",
          [titleId]
        );

        // Si el ganador NO es el campeón actual (Cambio de título)
        if (title && !winnerIds.includes(title.holderId1)) {
          titleChanged = true;
          const newHolder1 = winnerIds[0];
          const newHolder2 = winnerIds.length > 1 ? winnerIds[1] : null;

          db.runSync(
            `INSERT INTO title_reigns (save_id, titleId, luchadorId1, luchadorId2, weekWon, weekLost, lostToId1, lostToId2, isCashIn)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              saveId,
              titleId,
              title.holderId1,
              title.holderId2,
              title.weekWon || week,
              week,
              newHolder1,
              newHolder2,
              0,
            ]
          );

          db.runSync(
            "UPDATE titles SET holderId1 = ?, holderId2 = ?, weekWon = ? WHERE id = ?",
            [newHolder1, newHolder2, week, titleId]
          );

          if (matchHistoryId) {
            db.runSync(
              "UPDATE match_history SET isTitleChange = 1 WHERE id = ?",
              [matchHistoryId]
            );
          }
        }
      }

      // Cobrar costo de estipulación/producción
      if (stipulationCost > 0) {
        db.runSync(
          `UPDATE saves SET currentCash = currentCash - ? WHERE id = ?`,
          [stipulationCost, saveId]
        );

        db.runSync(
          `INSERT INTO finances (save_id, week, category, description, amount, type, date) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            saveId,
            week,
            "Arena",
            `Producción: ${stipulationName}`,
            stipulationCost,
            "EXPENSE",
            new Date().toISOString(),
          ]
        );
      }
    });

    return { success: true, titleChanged };
  } catch (e) {
    console.error("❌ Error en processMatchV4:", e);
    return { success: false, titleChanged: false };
  }
};

// ==========================================
// 5. BOOKING & DASHBOARD
// ==========================================

export const addPlannedMatch = (
  saveId: number,
  matchType: string,
  participants: any,
  stipulation: string,
  cost: number,
  isTitleMatch: boolean,
  titleId: number | null
) => {
  try {
    const state: any = db.getFirstSync(
      "SELECT currentWeek FROM saves WHERE id = ?",
      [saveId]
    );
    const week = state?.currentWeek || 1;

    // Calcular el siguiente orden para que aparezca al final
    const maxSort: any = db.getFirstSync(
      "SELECT MAX(sort_order) as maxOrder FROM planned_matches WHERE save_id = ? AND week = ?",
      [saveId, week]
    );
    const nextOrder = (maxSort?.maxOrder || 0) + 1;

    db.runSync(
      `INSERT INTO planned_matches (
         save_id, week, matchType, participantsJson, stipulation, cost, 
         isTitleMatch, titleId, sort_order
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        saveId,
        week,
        matchType,
        JSON.stringify(participants),
        stipulation,
        cost,
        isTitleMatch ? 1 : 0,
        titleId,
        nextOrder, // <--- Guardamos el orden
      ]
    );
    return true;
  } catch (e) {
    console.error("Error adding match:", e);
    return false;
  }
};

export const getPlannedMatchesForCurrentWeek = (saveId: number) => {
  try {
    const state: any = db.getFirstSync(
      "SELECT currentWeek FROM saves WHERE id = ?",
      [saveId]
    );
    const matches = db.getAllSync(
      // CAMBIO IMPORTANTE: ORDER BY sort_order ASC
      "SELECT * FROM planned_matches WHERE save_id = ? AND week = ? ORDER BY sort_order ASC",
      [saveId, state?.currentWeek || 1]
    );
    return matches.map((m: any) => ({
      ...m,
      participants: JSON.parse(m.participantsJson),
    }));
  } catch (e) {
    return [];
  }
};

export const deletePlannedMatch = (id: number) => {
  try {
    db.runSync("DELETE FROM planned_matches WHERE id = ?", [id]);
    return true;
  } catch (e) {
    return false;
  }
};

export const updatePlannedMatch = (
  id: number,
  matchType: string,
  participants: any,
  stipulation: string,
  cost: number,
  isTitleMatch: boolean,
  titleId: number | null
) => {
  try {
    db.runSync(
      `UPDATE planned_matches SET matchType = ?, participantsJson = ?, stipulation = ?, cost = ?, isTitleMatch = ?, titleId = ? WHERE id = ?`,
      [
        matchType,
        JSON.stringify(participants),
        stipulation,
        cost,
        isTitleMatch ? 1 : 0,
        titleId,
        id,
      ]
    );
    return true;
  } catch (e) {
    return false;
  }
};

export const getCurrentShowCost = (saveId: number) => {
  try {
    const state: any = db.getFirstSync(
      "SELECT currentWeek FROM saves WHERE id = ?",
      [saveId]
    );
    const result: any = db.getFirstSync(
      "SELECT SUM(cost) as totalCost FROM planned_matches WHERE save_id = ? AND week = ?",
      [saveId, state?.currentWeek || 1]
    );
    return result?.totalCost || 0;
  } catch (e) {
    return 0;
  }
};

// ==========================================
// 6. PUENTE UI -> DB
// ==========================================

export const resolveMatch = (
  saveId: number,
  matchId: number,
  winnerId: number,
  rating: number,
  matchData: any
) => {
  try {
    const teams: any[] = matchData.participants
      ? Object.values(matchData.participants)
      : [];

    let winners: any[] = [];
    let losers: any[] = [];

    const winningTeam = teams.find((team: any) =>
      team.some((p: any) => p.id === winnerId)
    );

    if (winningTeam) {
      winners = winningTeam;
      teams.forEach((team: any) => {
        if (team !== winningTeam) {
          losers.push(...team);
        }
      });
    } else {
      const allParticipants: any[] = [];
      teams.forEach((t: any) => allParticipants.push(...t));
      const foundWinner = allParticipants.find((p) => p.id === winnerId);
      if (foundWinner) {
        winners = [foundWinner];
        losers = allParticipants.filter((p) => p.id !== winnerId);
      } else {
        return { success: false };
      }
    }

    const winnerIds = winners.map((p) => p.id);
    const loserIds = losers.map((p) => p.id);
    const winnerName = winners.map((p) => p.name).join(" & ");
    const loserNames = losers.map((p) => p.name).join(" & ");

    const result = processMatchV4(
      saveId,
      matchData.matchType,
      matchData.stipulation || "Normal",
      matchData.cost || 0,
      winnerId,
      winnerName,
      winnerIds,
      loserIds,
      loserNames,
      rating,
      matchData.isTitleMatch === 1,
      matchData.titleId
    );

    if (result.success) {
      // --- LÓGICA V2: LOG DE DEFENSA ---
      // Si era lucha titular y NO hubo cambio de título, es una defensa exitosa
      if (matchData.isTitleMatch === 1 && !result.titleChanged) {
        recordTitleDefense(
          saveId,
          matchData.titleId,
          winnerIds[0],
          winnerIds[1] || null,
          rating
        );
      }

      const resultText = `Ganador: ${winnerName} (${rating} ⭐)`;
      db.runSync(
        "UPDATE planned_matches SET isCompleted = 1, resultText = ? WHERE id = ?",
        [resultText, matchId]
      );

      return { success: true, isTitleChange: result.titleChanged };
    }
    return { success: false };
  } catch (e) {
    console.error("Error en resolveMatch:", e);
    return { success: false };
  }
};

// ==========================================
// 7. AVANZAR SEMANA
// ==========================================

export const finalizeWeekWithManualFinances = (
  saveId: number,
  incomeData: any
) => {
  try {
    const state: any = db.getFirstSync(
      "SELECT currentWeek FROM saves WHERE id = ?",
      [saveId]
    );
    const week = state?.currentWeek || 1;
    const date = new Date().toISOString();

    db.withTransactionSync(() => {
      let totalIncome = 0;
      const categories = [
        { key: "network", label: "Network / TV" },
        { key: "tickets", label: "Entradas" },
        { key: "ads", label: "Anuncios" },
        { key: "promos", label: "Promociones" },
        { key: "others", label: "Otros Ingresos" },
      ];

      categories.forEach((cat) => {
        const amount = Number(incomeData[cat.key]) || 0;
        if (amount > 0) {
          totalIncome += amount;
          db.runSync(
            `INSERT INTO finances (save_id, week, category, description, amount, type, date) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [saveId, week, "Show Income", cat.label, amount, "INCOME", date]
          );
        }
      });

      const expensesResult: any = db.getFirstSync(
        `SELECT SUM(amount) as total FROM finances WHERE save_id = ? AND week = ? AND (type = 'EXPENSE' OR type = 'OUT')`,
        [saveId, week]
      );
      const totalExpenses = expensesResult?.total || 0;

      const ratingResult: any = db.getFirstSync(
        `SELECT AVG(rating) as avgRating FROM match_history WHERE save_id = ? AND week = ?`,
        [saveId, week]
      );
      const avgRating = ratingResult?.avgRating || 0;

      db.runSync(
        `INSERT INTO weekly_stats (save_id, week, total_rating, total_income, total_expenses) VALUES (?, ?, ?, ?, ?)`,
        [saveId, week, avgRating, totalIncome, totalExpenses]
      );

      if (totalIncome > 0) {
        db.runSync(
          `UPDATE saves SET currentCash = currentCash + ? WHERE id = ?`,
          [totalIncome, saveId]
        );
      }

      db.runSync(
        "UPDATE saves SET currentWeek = currentWeek + 1 WHERE id = ?",
        [saveId]
      );

      // Decrementar contratos (Nota: aquí filtramos luchadores de este save)
      db.runSync(
        "UPDATE luchadores SET weeksLeft = weeksLeft - 1 WHERE save_id = ? AND weeksLeft < 25 AND weeksLeft > 0 AND (isDraft = 0 OR isDraft IS NULL)",
        [saveId]
      );

      db.runSync("DELETE FROM planned_matches WHERE save_id = ?", [saveId]);
    });

    return true;
  } catch (e) {
    console.error("Error finalizing week:", e);
    return false;
  }
};

export const renewContract = (
  saveId: number,
  luchadorId: number,
  cost: number,
  weeksToAdd: number
) => {
  try {
    db.withTransactionSync(() => {
      db.runSync(
        "UPDATE saves SET currentCash = currentCash - ? WHERE id = ?",
        [cost, saveId]
      );

      db.runSync(
        "UPDATE luchadores SET weeksLeft = weeksLeft + ? WHERE id = ?",
        [weeksToAdd, luchadorId]
      );

      const state: any = db.getFirstSync(
        "SELECT currentWeek FROM saves WHERE id = ?",
        [saveId]
      );
      db.runSync(
        `INSERT INTO finances (save_id, week, category, description, amount, type, date) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          saveId,
          state.currentWeek,
          "Contract",
          `Renewal ID: ${luchadorId}`,
          cost,
          "EXPENSE",
          new Date().toISOString(),
        ]
      );
    });
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};

// ==========================================
// 8. DASHBOARD METRICS
// ==========================================
export const getDashboardMetrics = (saveId: number) => {
  try {
    const state: any = db.getFirstSync("SELECT * FROM saves WHERE id = ?", [
      saveId,
    ]);
    const currentWeek = state?.currentWeek || 1;

    const expiring: any = db.getFirstSync(
      `SELECT COUNT(*) as count FROM luchadores WHERE save_id = ? AND isDraft = 0 AND weeksLeft <= 4`,
      [saveId]
    );

    let lastShowRating = 0;
    let lastShowIncome = 0;

    if (currentWeek > 1) {
      const prevWeek = currentWeek - 1;

      const ratingResult: any = db.getFirstSync(
        `SELECT AVG(rating) as avgRating FROM match_history WHERE save_id = ? AND week = ?`,
        [saveId, prevWeek]
      );
      lastShowRating = ratingResult?.avgRating || 0;

      const incomeResult: any = db.getFirstSync(
        `SELECT SUM(amount) as total FROM finances WHERE save_id = ? AND week = ? AND type = 'INCOME'`,
        [saveId, prevWeek]
      );
      lastShowIncome = incomeResult?.total || 0;
    }

    const topChampions = db.getAllSync(
      `SELECT t.name as titleName, l.name as holderName, l.imageUri 
       FROM titles t 
       LEFT JOIN luchadores l ON t.holderId1 = l.id 
       WHERE t.save_id = ? AND t.holderId1 IS NOT NULL 
       LIMIT 3`,
      [saveId]
    );

    return {
      week: currentWeek,
      cash: state?.currentCash || 0,
      expiringContracts: expiring?.count || 0,
      lastShowRating: parseFloat(lastShowRating.toFixed(1)),
      lastShowIncome,
      topChampions,
    };
  } catch (e) {
    console.error("Error fetching dashboard:", e);
    return null;
  }
};

// ==========================================
// 9. HISTORIAL DE COMBATES
// ==========================================
export const getAllMatches = (saveId: number) => {
  try {
    return db.getAllSync(
      "SELECT * FROM match_history WHERE save_id = ? ORDER BY id ASC",
      [saveId]
    );
  } catch (e) {
    console.error("❌ Error obteniendo historial de matches:", e);
    return [];
  }
};

// ==========================================
// 10. HISTORIAL (NUEVO)
// ==========================================

export const getWeeklySummaries = (saveId: number) => {
  try {
    return db.getAllSync(
      `SELECT * FROM weekly_stats WHERE save_id = ? ORDER BY week DESC`,
      [saveId]
    );
  } catch (e) {
    console.error("Error al obtener historial semanal:", e);
    return [];
  }
};

export const getMatchesByWeek = (saveId: number, week: number) => {
  try {
    return db.getAllSync(
      `SELECT * FROM match_history WHERE save_id = ? AND week = ? ORDER BY id ASC`,
      [saveId, week]
    );
  } catch (e) {
    console.error("Error al obtener matches de la semana:", e);
    return [];
  }
};

// ==========================================
// 11. GESTIÓN DE SAVES (NUEVO)
// ==========================================

export const getAllSaves = () => {
  return db.getAllSync("SELECT * FROM saves ORDER BY id DESC");
};

// ==========================================
// 11. GESTIÓN DE SAVES Y TÍTULOS POR MARCA
// ==========================================

// ==========================================
// 11. GESTIÓN DE SAVES Y TÍTULOS POR MARCA
// ==========================================

export const createNewSave = (
  name: string,
  brand: string,
  cash: number,
  theme: string
) => {
  try {
    // 1. Create Save
    const result = db.runSync(
      `INSERT INTO saves (name, brand, themeColor, currentCash, currentWeek, created_at) 
       VALUES (?, ?, ?, ?, 1, ?)`,
      [name, brand, theme, cash, new Date().toISOString()]
    );

    const newSaveId = result.lastInsertRowId;

    // 2. Define Brand Titles with specific Image URIs
    let brandTitles: any[] = [];
    const normalizedBrand = brand.toLowerCase().trim();

    if (normalizedBrand === "raw") {
      brandTitles = [
        {
          name: "World Heavyweight Champ",
          category: "World",
          gender: "Male",
          imageUri: "raw-male-world.webp",
        },
        {
          name: "Women's World Champ",
          category: "World",
          gender: "Female",
          imageUri: "raw-female-world.webp",
        },
        {
          name: "Intercontinental Champ",
          category: "Midcard",
          gender: "Male",
          imageUri: "raw-male-midcard.webp",
        },
        {
          name: "Women's Intercontinental",
          category: "Midcard",
          gender: "Female",
          imageUri: "raw-female-midcard.webp", // Ensure this exists or use fallback
        },
        {
          name: "World Tag Team Champs",
          category: "Tag",
          gender: "Male",
          imageUri: "raw-male-tagteam.webp",
        },
        {
          name: "WWE Women's Tag Team",
          category: "Tag",
          gender: "Female",
          imageUri: "female-tagteam.webp", // Shared title
        },
        // MITB
        {
          name: "Mr. MITB (RAW)",
          category: "Other",
          gender: "Male",
          isMITB: 1,
          imageUri: "male-moneyinthebank.png",
        },
        {
          name: "Miss MITB (RAW)",
          category: "Other",
          gender: "Female",
          isMITB: 1,
          imageUri: "female-moneyinthebank.png",
        },
      ];
    } else if (normalizedBrand === "smackdown") {
      brandTitles = [
        {
          name: "Undisputed WWE Champ",
          category: "World",
          gender: "Male",
          imageUri: "smackdown-male-world.webp",
        },
        {
          name: "WWE Women’s Champ",
          category: "World",
          gender: "Female",
          imageUri: "smackdown-female-world.webp",
        },
        {
          name: "United States Champ",
          category: "Midcard",
          gender: "Male",
          imageUri: "smackdown-male-midcard.webp",
        },
        {
          name: "Women's United States",
          category: "Midcard",
          gender: "Female",
          imageUri: "smackdown-female-midcard.webp",
        },
        {
          name: "WWE Tag Team Champs",
          category: "Tag",
          gender: "Male",
          imageUri: "smackdown-male-tagteam.webp",
        },
        {
          name: "WWE Women's Tag Team",
          category: "Tag",
          gender: "Female",
          imageUri: "female-tagteam.webp",
        },
        // MITB
        {
          name: "Mr. MITB (SD)",
          category: "Other",
          gender: "Male",
          isMITB: 1,
          imageUri: "male-moneyinthebank.png",
        },
        {
          name: "Miss MITB (SD)",
          category: "Other",
          gender: "Female",
          isMITB: 1,
          imageUri: "female-moneyinthebank.png",
        },
      ];
    } else if (normalizedBrand === "nxt") {
      brandTitles = [
        {
          name: "NXT Championship",
          category: "World",
          gender: "Male",
          imageUri: "nxt-male-world.webp",
        },
        {
          name: "NXT Women's Champ",
          category: "World",
          gender: "Female",
          imageUri: "nxt-female-world.webp",
        },
        {
          name: "NXT North American",
          category: "Midcard",
          gender: "Male",
          imageUri: "nxt-male-midcard.webp",
        },
        {
          name: "Women’s North American",
          category: "Midcard",
          gender: "Female",
          imageUri: "nxt-female-midcard.webp",
        },
        {
          name: "NXT Tag Team Champs",
          category: "Tag",
          gender: "Male",
          imageUri: "nxt-male-tagteam.webp",
        },
      ];
    } else {
      // FALLBACK GENERICS
      // Assumes files like 'brand-gender-division.webp' exist based on the custom brand name
      brandTitles = [
        {
          name: `${brand} World Champ`,
          category: "World",
          gender: "Male",
          imageUri: `${normalizedBrand}-male-world.webp`,
        },
        {
          name: `${brand} Midcard Champ`,
          category: "Midcard",
          gender: "Male",
          imageUri: `${normalizedBrand}-male-midcard.webp`,
        },
        {
          name: `${brand} Tag Team Champs`,
          category: "Tag",
          gender: "Male",
          imageUri: `${normalizedBrand}-male-tagteam.webp`,
        },
        {
          name: `${brand} Womens Champ`,
          category: "World",
          gender: "Female",
          imageUri: `${normalizedBrand}-female-world.webp`,
        },
      ];
    }

    // 3. Insert Titles into DB with imageUri
    brandTitles.forEach((t) => {
      db.runSync(
        `INSERT INTO titles (save_id, name, category, gender, isMITB, imageUri, holderId1, holderId2, weekWon) 
         VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, 1)`,
        [
          newSaveId,
          t.name,
          t.category,
          t.gender,
          t.isMITB ? 1 : 0,
          t.imageUri, // <--- Saving the specific image file name
        ]
      );
    });

    console.log(
      `✅ Save '${name}' (${brand}) created with ID: ${newSaveId}. Titles mapped.`
    );
    return newSaveId;
  } catch (e) {
    console.error("❌ Error creating save:", e);
    return null;
  }
};

// ==========================================
// 12. GESTIÓN DE RIVALIDADES (NUEVO V2)
// ==========================================

/**
 * Obtiene todas las rivalidades activas de la partida actual
 */
export const getActiveRivalries = (saveId: number) => {
  try {
    return db.getAllSync(
      `
      SELECT r.*, 
             l1.name as name1, l1.imageUri as image1,
             l2.name as name2, l2.imageUri as image2
      FROM rivalries r
      JOIN luchadores l1 ON r.luchador_id1 = l1.id
      JOIN luchadores l2 ON r.luchador_id2 = l2.id
      WHERE r.save_id = ? AND r.is_active = 1
    `,
      [saveId]
    );
  } catch (e) {
    return [];
  }
};

/**
 * Inicia una nueva rivalidad o sube el nivel si ya existe
 */
export const startOrLevelUpRivalry = (
  saveId: number,
  id1: number,
  id2: number
) => {
  try {
    const state: any = getGameState(saveId);
    // Buscamos si ya existe una rivalidad activa entre estos dos
    const existing: any = db.getFirstSync(
      `
      SELECT id, level FROM rivalries 
      WHERE save_id = ? AND is_active = 1 
      AND ((luchador_id1 = ? AND luchador_id2 = ?) OR (luchador_id1 = ? AND luchador_id2 = ?))
    `,
      [saveId, id1, id2, id2, id1]
    );

    if (existing) {
      if (existing.level < 4) {
        db.runSync("UPDATE rivalries SET level = level + 1 WHERE id = ?", [
          existing.id,
        ]);
        return { action: "leveled_up", newLevel: existing.level + 1 };
      }
      return { action: "max_level", newLevel: 4 };
    } else {
      db.runSync(
        `
        INSERT INTO rivalries (save_id, luchador_id1, luchador_id2, level, created_week)
        VALUES (?, ?, ?, 1, ?)
      `,
        [saveId, id1, id2, state.currentWeek]
      );
      return { action: "started", newLevel: 1 };
    }
  } catch (e) {
    console.error("Error en rivalidad:", e);
    return null;
  }
};

/**
 * Finaliza una rivalidad (útil para el "Blowoff" en un PPV)
 */
export const endRivalry = (rivalryId: number) => {
  try {
    db.runSync("UPDATE rivalries SET is_active = 0 WHERE id = ?", [rivalryId]);
    return true;
  } catch (e) {
    return false;
  }
};

// ==========================================
// 13. LOG DE TÍTULOS - DEFENSAS (NUEVO V2)
// ==========================================

/**
 * Registra una defensa exitosa en el log
 */
export const recordTitleDefense = (
  saveId: number,
  titleId: number,
  h1: number,
  h2: number | null,
  stars: number
) => {
  try {
    const state: any = getGameState(saveId);
    db.runSync(
      `
      INSERT INTO title_defenses (save_id, title_id, holder_id1, holder_id2, week, match_rating)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      [saveId, titleId, h1, h2, state.currentWeek, stars]
    );
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Obtiene el conteo de defensas exitosas de un reinado actual
 */
export const getDefenseCount = (titleId: number, holderId1: number) => {
  try {
    const result: any = db.getFirstSync(
      `
      SELECT COUNT(*) as total FROM title_defenses 
      WHERE title_id = ? AND holder_id1 = ?
    `,
      [titleId, holderId1]
    );
    return result?.total || 0;
  } catch (e) {
    return 0;
  }
};

// ==========================================
// 14. GESTIÓN MANUAL DE RIVALIDADES (NUEVO)
// ==========================================

export const createRivalry = (
  saveId: number,
  id1: number,
  id2: number,
  level: number = 1
) => {
  try {
    const state: any = getGameState(saveId);
    // Verificar si ya existe (activa o inactiva)
    const existing: any = db.getFirstSync(
      `SELECT id FROM rivalries 
       WHERE save_id = ? 
       AND ((luchador_id1 = ? AND luchador_id2 = ?) OR (luchador_id1 = ? AND luchador_id2 = ?))`,
      [saveId, id1, id2, id2, id1]
    );

    if (existing) {
      // Si existe, la reactivamos y reseteamos el nivel
      db.runSync(
        `UPDATE rivalries SET is_active = 1, level = ?, created_week = ? WHERE id = ?`,
        [level, state.currentWeek, existing.id]
      );
    } else {
      // Si no existe, creamos una nueva
      db.runSync(
        `INSERT INTO rivalries (save_id, luchador_id1, luchador_id2, level, created_week, is_active)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [saveId, id1, id2, level, state.currentWeek]
      );
    }
    return true;
  } catch (e) {
    console.error("Error creating rivalry:", e);
    return false;
  }
};

export const deleteRivalry = (rivalryId: number) => {
  try {
    // Soft delete (la marcamos como inactiva)
    db.runSync("UPDATE rivalries SET is_active = 0 WHERE id = ?", [rivalryId]);
    return true;
  } catch (e) {
    return false;
  }
};

// ==========================================
// 15. HISTORIAL DE RIVALIDAD (NUEVO)
// ==========================================

export const getRivalryMatches = (saveId: number, id1: number, id2: number) => {
  try {
    // Buscamos matches donde uno ganó y el otro perdió, O donde participaron ambos (en equipo o contra)
    // Para simplificar, buscamos matches donde el winnerId sea uno y en los participantes esté el otro como perdedor
    // Nota: Esto depende de cómo guardes el JSON de participantes.
    // Una forma más simple es buscar por texto en 'participants' si es un JSON string

    // SQL simple: Buscar en match_history donde winnerId sea A o B
    const rows = db.getAllSync(
      `SELECT * FROM match_history 
       WHERE save_id = ? 
       AND (
         (winnerId = ? AND participants LIKE ?) 
         OR 
         (winnerId = ? AND participants LIKE ?)
       )
       ORDER BY week DESC`,
      [saveId, id1, `%${id2}%`, id2, `%${id1}%`]
    );
    return rows;
  } catch (e) {
    console.error("Error fetching rivalry history:", e);
    return [];
  }
};
// ==========================================
// 16. REORDER MATCHES (NUEVO)
// ==========================================

export const reorderMatches = (saveId: number, newOrderMatches: any[]) => {
  try {
    db.withTransactionSync(() => {
      newOrderMatches.forEach((match, index) => {
        // Actualizamos solo el sort_order basándonos en la posición del array
        db.runSync("UPDATE planned_matches SET sort_order = ? WHERE id = ?", [
          index,
          match.id,
        ]);
      });
    });
    return true;
  } catch (e) {
    console.error("Error reordering matches:", e);
    return false;
  }
};
// ==========================================
// 🛠️ UTILIDAD: AUTO-MAPEO DE IMÁGENES
// ==========================================
export const autoMapRosterImages = (saveId: number) => {
  try {
    const roster = getAllLuchadores(saveId);
    let updatedCount = 0;

    console.log(`🔴 --- INICIO AUDITORÍA (Save ID: ${saveId}) ---`);

    db.withTransactionSync(() => {
      roster.forEach((wrestler) => {
        // 1. Calcular el nombre limpio
        const cleanName = wrestler.name.toLowerCase().replace(/\s+/g, "");
        const newImageUri = `${cleanName}.webp`;

        // 2. Imprimir QUÉ tiene actualmente vs QUÉ va a guardar
        console.log(`🤼 Luchador: "${wrestler.name}"`);
        console.log(`   - Antes tenía: ${wrestler.imageUri || "NADA"}`);
        console.log(`   - Ahora guardaré: ${newImageUri}`);

        // 3. Guardar
        db.runSync("UPDATE luchadores SET imageUri = ? WHERE id = ?", [
          newImageUri,
          wrestler.id,
        ]);

        // 4. Confirmar que se guardó leyendo de nuevo
        const check: any = db.getFirstSync(
          "SELECT imageUri FROM luchadores WHERE id = ?",
          [wrestler.id]
        );
        console.log(`   ✅ Dato final en DB: ${check.imageUri}`);

        updatedCount++;
      });
    });

    console.log("🔴 --- FIN AUDITORÍA ---");
    return updatedCount;
  } catch (e) {
    console.error("❌ Error en auto-mapeo:", e);
    return 0;
  }
};

// ==========================================
// 🛠️ UTILIDAD: AUTO-MAPEO DE IMÁGENES (VERSIÓN CORREGIDA)
// ==========================================
export const autoMapTitleImages = (saveId: number) => {
  try {
    // 1. OBTENER INFORMACIÓN DEL SAVE (Para saber la marca de la partida)
    const saveInfo: any = db.getFirstSync(
      "SELECT brand FROM saves WHERE id = ?",
      [saveId]
    );

    // Normalizamos la marca (ej: 'SmackDown' -> 'smackdown')
    // Si por error no hay marca, usamos 'raw' por defecto.
    const currentSaveBrand = saveInfo?.brand?.toLowerCase().trim() || "raw";

    // 2. Obtener todos los títulos
    const titles = db.getAllSync(`SELECT * FROM titles WHERE save_id = ?`, [
      saveId,
    ]);
    let updatedCount = 0;

    titles.forEach((t: any) => {
      const nameLower = t.name.toLowerCase();

      // --- A. DETECTAR BRAND ---
      // Lógica: Por defecto usamos la marca de la partida.
      let brand = currentSaveBrand;

      // EXCEPCIÓN: Si el título tiene explícitamente el nombre de OTRA marca, respetamos eso.
      // (Ejemplo: Si en un save de Raw tienes el título de NXT).
      if (nameLower.includes("nxt")) brand = "nxt";
      else if (nameLower.includes("ecw")) brand = "ecw";
      else if (nameLower.includes("wcw")) brand = "wcw";
      else if (nameLower.includes("aew")) brand = "aew";
      // Si dice 'smackdown' o 'universal', forzamos smackdown
      else if (
        nameLower.includes("smackdown") ||
        nameLower.includes("universal")
      )
        brand = "smackdown";
      // Si dice 'raw', forzamos raw
      else if (nameLower.includes("raw")) brand = "raw";

      // --- B. DETECTAR GÉNERO ---
      const gender = t.gender === "Female" ? "female" : "male";

      // --- C. DETECTAR DIVISIÓN ---
      let division = "world";
      if (t.category === "Midcard") division = "midcard";
      else if (t.category === "Tag") division = "tagteam";

      // --- D. CONSTRUIR NOMBRE DE ARCHIVO ---
      let fileName = "";

      // CASO 1: MONEY IN THE BANK (Según tus capturas)
      // Checamos columna isMITB o el nombre
      if (
        t.isMITB === 1 ||
        nameLower.includes("mitb") ||
        nameLower.includes("briefcase")
      ) {
        fileName = `${gender}-moneyinthebank.png`;
      }
      // CASO 2: TAG TEAM FEMENINO (Según captura, no tiene marca)
      else if (division === "tagteam" && gender === "female") {
        fileName = "female-tagteam.webp";
      }
      // CASO 3: ESTÁNDAR (brand-gender-division.webp)
      else {
        fileName = `${brand}-${gender}-${division}.webp`;
      }

      // 3. Guardar en la Base de Datos
      db.runSync(`UPDATE titles SET imageUri = ? WHERE id = ?`, [
        fileName,
        t.id,
      ]);
      updatedCount++;
    });

    console.log(
      `✅ ${updatedCount} títulos actualizados usando base marca: ${currentSaveBrand}.`
    );
    return updatedCount;
  } catch (error) {
    console.error("Error auto-mapeando títulos:", error);
    return 0;
  }
};
