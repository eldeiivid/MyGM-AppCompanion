import * as SQLite from "expo-sqlite";

// 1. Mantenemos el nombre de la V2
export const db = SQLite.openDatabaseSync("mygm_evolution_v2.db");

export const initDatabase = () => {
  try {
    // ---------------------------------------------------------
    // TABLAS EXISTENTES (Multi-Save Core)
    // ---------------------------------------------------------
    db.execSync(`
      CREATE TABLE IF NOT EXISTS saves (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        brand TEXT NOT NULL,
        themeColor TEXT NOT NULL,
        currentWeek INTEGER DEFAULT 1,
        currentCash REAL DEFAULT 0,
        created_at TEXT
      );
    `);

    db.execSync(`
      CREATE TABLE IF NOT EXISTS luchadores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        save_id INTEGER NOT NULL,
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

    // --- 🚨 CAMBIO AQUÍ: Agregamos imageUri a la definición ---
    db.execSync(`
      CREATE TABLE IF NOT EXISTS titles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        save_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        gender TEXT NOT NULL,
        holderId1 INTEGER,
        holderId2 INTEGER,
        weekWon INTEGER DEFAULT 1,
        isMITB INTEGER DEFAULT 0,
        imageUri TEXT,  -- <--- NUEVA COLUMNA
        FOREIGN KEY(save_id) REFERENCES saves(id) ON DELETE CASCADE
      );
    `);

    db.execSync(`
      CREATE TABLE IF NOT EXISTS title_reigns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        save_id INTEGER NOT NULL,
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

    // ---------------------------------------------------------
    // 3. NUEVAS TABLAS V2: RIVALIDADES Y LOGS
    // ---------------------------------------------------------

    // TABLA DE RIVALIDADES
    db.execSync(`
      CREATE TABLE IF NOT EXISTS rivalries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        save_id INTEGER NOT NULL,
        luchador_id1 INTEGER NOT NULL,
        luchador_id2 INTEGER NOT NULL,
        level INTEGER DEFAULT 1,
        type TEXT DEFAULT '1v1',
        is_active INTEGER DEFAULT 1,
        created_week INTEGER,
        FOREIGN KEY(save_id) REFERENCES saves(id) ON DELETE CASCADE
      );
    `);

    // TABLA DE DEFENSAS
    db.execSync(`
      CREATE TABLE IF NOT EXISTS title_defenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        save_id INTEGER NOT NULL,
        title_id INTEGER NOT NULL,
        holder_id1 INTEGER NOT NULL,
        holder_id2 INTEGER,
        week INTEGER,
        match_rating REAL,
        FOREIGN KEY(save_id) REFERENCES saves(id) ON DELETE CASCADE,
        FOREIGN KEY(title_id) REFERENCES titles(id) ON DELETE CASCADE
      );
    `);

    // ---------------------------------------------------------
    // OTRAS TABLAS (Booking, Finanzas, Historial)
    // ---------------------------------------------------------

    db.execSync(`
      CREATE TABLE IF NOT EXISTS planned_matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        save_id INTEGER NOT NULL,
        week INTEGER,
        matchType TEXT,
        participantsJson TEXT,
        stipulation TEXT,
        cost REAL,
        isTitleMatch INTEGER,
        titleId INTEGER,
        isCompleted INTEGER DEFAULT 0,
        resultText TEXT,
        sort_order INTEGER DEFAULT 0,
        FOREIGN KEY(save_id) REFERENCES saves(id) ON DELETE CASCADE
      );
    `);

    db.execSync(`
      CREATE TABLE IF NOT EXISTS finances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        save_id INTEGER NOT NULL,
        week INTEGER,
        category TEXT,
        description TEXT,
        amount REAL,
        type TEXT,
        date TEXT,
        FOREIGN KEY(save_id) REFERENCES saves(id) ON DELETE CASCADE
      );
    `);

    db.execSync(`
      CREATE TABLE IF NOT EXISTS match_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        save_id INTEGER NOT NULL,
        week INTEGER,
        matchType TEXT,
        winnerId INTEGER,
        winnerName TEXT,
        loserName TEXT,
        rating INTEGER,
        isTitleChange INTEGER DEFAULT 0,
        titleName TEXT,
        event_date TEXT,
        participants TEXT,
        FOREIGN KEY(save_id) REFERENCES saves(id) ON DELETE CASCADE
      );
    `);

    db.execSync(`
      CREATE TABLE IF NOT EXISTS weekly_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        save_id INTEGER NOT NULL,
        week INTEGER,
        event_name TEXT DEFAULT 'Weekly Show',
        total_rating REAL,
        total_income REAL,
        total_expenses REAL,
        FOREIGN KEY(save_id) REFERENCES saves(id) ON DELETE CASCADE
      );
    `);

    // ---------------------------------------------------------
    // MIGRACIONES AUTOMÁTICAS (Para bases de datos existentes)
    // ---------------------------------------------------------

    // 1. Migración para sort_order en planned_matches
    try {
      db.execSync(
        `ALTER TABLE planned_matches ADD COLUMN sort_order INTEGER DEFAULT 0;`
      );
      console.log(
        "✅ Migración aplicada: sort_order agregada a planned_matches."
      );
    } catch (e) {
      // Ignorar si ya existe
    }

    // 2. 🚨 MIGRACIÓN NUEVA: imageUri en titles
    try {
      db.execSync(`ALTER TABLE titles ADD COLUMN imageUri TEXT;`);
      console.log("✅ Migración aplicada: imageUri agregada a titles.");
    } catch (e) {
      // Ignorar si ya existe
    }

    // 3. 🚨 MIGRACIÓN NUEVA: rating en planned_matches
    try {
      db.execSync(
        `ALTER TABLE planned_matches ADD COLUMN rating INTEGER DEFAULT 0;`
      );
      console.log("✅ Migración aplicada: rating agregada a planned_matches.");
    } catch (e) {
      // Ignorar si ya existe (error code 1: duplicate column name)
    }

    console.log(
      "✅ Base de datos Evolution (v2.0) inicializada correctamente."
    );
  } catch (error) {
    console.error("❌ Error al iniciar DB Evolution:", error);
  }
};
