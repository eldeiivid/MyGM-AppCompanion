import * as SQLite from "expo-sqlite";

// CAMBIO CRITICO: Nombre nuevo para empezar de cero con la estructura Multi-Save
export const db = SQLite.openDatabaseSync("mygm_multisave_v1.db");

export const initDatabase = () => {
  try {
    // ---------------------------------------------------------
    // 1. TABLA MAESTRA DE PARTIDAS (SAVES)
    // Reemplaza a la antigua tabla 'game_state'
    // ---------------------------------------------------------
    db.execSync(`
      CREATE TABLE IF NOT EXISTS saves (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,           -- Nombre de la partida (ej: "Mi RAW")
        brand TEXT NOT NULL,          -- RAW, SmackDown, NXT, etc.
        themeColor TEXT NOT NULL,     -- Color hexadecimal (#EF4444)
        currentWeek INTEGER DEFAULT 1,
        currentCash REAL DEFAULT 0,   -- Dinero actual de ESTA partida
        created_at TEXT
      );
    `);

    // ---------------------------------------------------------
    // 2. TABLAS DE CONTENIDO (Ahora todas tienen save_id)
    // ---------------------------------------------------------

    // LUCHADORES
    db.execSync(`
      CREATE TABLE IF NOT EXISTS luchadores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        save_id INTEGER NOT NULL,     -- VINCULO CON LA PARTIDA
        name TEXT NOT NULL,
        gender TEXT NOT NULL,
        crowd TEXT NOT NULL,
        ringLevel INTEGER,
        mainClass TEXT,
        altClass TEXT DEFAULT 'None',
        mic INTEGER,
        weeksLeft INTEGER DEFAULT 25,   
        hiringCost INTEGER DEFAULT 0,
        isDraft INTEGER DEFAULT 0, 
        normalWins INTEGER DEFAULT 0,
        normalLosses INTEGER DEFAULT 0,
        pleWins INTEGER DEFAULT 0,
        pleLosses INTEGER DEFAULT 0,
        mitbWins INTEGER DEFAULT 0,
        mitbLosses INTEGER DEFAULT 0,
        rumbleWins INTEGER DEFAULT 0,
        rumbleLosses INTEGER DEFAULT 0,
        cashInWins INTEGER DEFAULT 0,
        cashInLosses INTEGER DEFAULT 0,
        worldTitles INTEGER DEFAULT 0,
        midcardTitles INTEGER DEFAULT 0,
        tagTitles INTEGER DEFAULT 0,
        careerRating REAL DEFAULT 0,
        careerClassification TEXT DEFAULT 'Prospect',
        imageUri TEXT,
        FOREIGN KEY(save_id) REFERENCES saves(id) ON DELETE CASCADE
      );
    `);

    // TÍTULOS
    db.execSync(`
      CREATE TABLE IF NOT EXISTS titles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        save_id INTEGER NOT NULL,     -- VINCULO
        name TEXT NOT NULL,
        category TEXT NOT NULL, 
        gender TEXT NOT NULL,
        holderId1 INTEGER, 
        holderId2 INTEGER, 
        weekWon INTEGER DEFAULT 1,
        isMITB INTEGER DEFAULT 0,
        FOREIGN KEY(save_id) REFERENCES saves(id) ON DELETE CASCADE
      );
    `);

    // HISTORIAL DE REINADOS
    db.execSync(`
      CREATE TABLE IF NOT EXISTS title_reigns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        save_id INTEGER NOT NULL,     -- VINCULO
        titleId INTEGER,
        luchadorId1 INTEGER,
        luchadorId2 INTEGER,
        weekWon INTEGER,
        weekLost INTEGER,
        lostToId1 INTEGER,
        lostToId2 INTEGER,
        isCashIn INTEGER DEFAULT 0,
        FOREIGN KEY(titleId) REFERENCES titles(id),
        FOREIGN KEY(save_id) REFERENCES saves(id) ON DELETE CASCADE
      );
    `);

    // MATCHES (Booking actual)
    db.execSync(`
      CREATE TABLE IF NOT EXISTS planned_matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        save_id INTEGER NOT NULL,     -- VINCULO
        week INTEGER,
        matchType TEXT,
        participantsJson TEXT,
        stipulation TEXT,
        cost REAL,
        isTitleMatch INTEGER,
        titleId INTEGER,
        isCompleted INTEGER DEFAULT 0,
        resultText TEXT,
        FOREIGN KEY(save_id) REFERENCES saves(id) ON DELETE CASCADE
      );
    `);

    // FINANZAS
    db.execSync(`
      CREATE TABLE IF NOT EXISTS finances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        save_id INTEGER NOT NULL,     -- VINCULO
        week INTEGER,
        category TEXT,          
        description TEXT,
        amount REAL,
        type TEXT, 
        date TEXT,
        FOREIGN KEY(save_id) REFERENCES saves(id) ON DELETE CASCADE
      );
    `);

    // HISTORIAL DE LUCHAS (Registro permanente)
    db.execSync(`
      CREATE TABLE IF NOT EXISTS match_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        save_id INTEGER NOT NULL,     -- VINCULO
        week INTEGER,
        matchType TEXT,
        winnerId INTEGER,
        winnerName TEXT,
        loserName TEXT,
        rating INTEGER,
        isTitleChange INTEGER DEFAULT 0,
        titleName TEXT,
        event_date TEXT,
        participants TEXT,  -- JSON con todos los IDs
        FOREIGN KEY(save_id) REFERENCES saves(id) ON DELETE CASCADE
      );
    `);

    // ESTADÍSTICAS SEMANALES
    db.execSync(`
      CREATE TABLE IF NOT EXISTS weekly_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        save_id INTEGER NOT NULL,     -- VINCULO
        week INTEGER,
        event_name TEXT DEFAULT 'Weekly Show',
        total_rating REAL,      -- Promedio de estrellas del show
        total_income REAL,      -- Ingresos totales de esa semana
        total_expenses REAL,    -- Gastos totales de esa semana
        FOREIGN KEY(save_id) REFERENCES saves(id) ON DELETE CASCADE
      );
    `);

    console.log(
      "✅ Base de datos Multi-Save (v2.0) inicializada correctamente."
    );
  } catch (error) {
    console.error("❌ Error al iniciar DB Multi-Save:", error);
  }
};
