// src/types/index.ts

export type Gender = "Male" | "Female";
export type WrestlingClass =
  | "Giant"
  | "Cruiser"
  | "Bruiser"
  | "Fighter"
  | "Specialist"
  | "None";

export type CrowdReaction = "Face" | "Heel";
export type TitleCategory = "World" | "Midcard" | "Tag" | "Other";

// 1. EL LUCHADOR (Actualizado V2)
export interface Luchador {
  id: number;
  save_id: number; // Añadido para consistencia con la DB

  // Datos del Roster & Contrato
  name: string;
  gender: Gender;
  crowd: CrowdReaction;
  ringLevel: number;
  mainClass: WrestlingClass;
  altClass: WrestlingClass;
  mic: number;

  // --- GESTIÓN DE GM ---
  weeksLeft: number;
  hiringCost: number;
  isDraft: number; // <--- SOLUCIÓN AL ERROR: 0 = Libre, 1 = Draft Permanente
  popularity: number;

  // Match History
  mitbWins: number;
  mitbLosses: number;
  cashInWins: number;
  cashInLosses: number;
  rumbleWins: number;
  rumbleLosses: number;
  chamberWins: number;
  chamberLosses: number;
  pleWins: number;
  pleLosses: number;
  normalWins: number;
  normalLosses: number;

  // Career Prime
  worldTitles: number;
  worldLosses: number;
  midcardTitles: number;
  midcardLosses: number;
  tagTitles: number;
  tagLosses: number;
  careerRating: number;
  careerClassification: string;

  imageUri?: string | null;
}

// 2. CAMPEONATOS
export interface Title {
  id: number;
  save_id: number;
  name: string;
  category: TitleCategory;
  gender: Gender | "Mixed";
  holderId1: number | null;
  holderId2: number | null;
  weekWon: number;
  isMITB: number; // Cambiado a number (0/1) para coincidir con SQLite
  holderName1?: string;
  holderName2?: string;
  defenses?: number; // <--- NUEVO V2: Para el Log de defensas
}

// 3. RIVALIDADES (NUEVO TIPO V2)
export interface Rivalry {
  id: number;
  save_id: number;
  luchador_id1: number;
  luchador_id2: number;
  level: number; // 1 a 4
  type: string; // '1v1' o 'Tag'
  is_active: number; // 0 o 1
  name1?: string; // Para la UI
  name2?: string;
  image1?: string;
  image2?: string;
}

// 4. FINANZAS (Ajustado para tus tipos de ganancia)
export interface FinanceTransaction {
  id: number;
  week: number;
  // Ej: "Network", "Tickets", "MITB Bonus", "Contract Expense"
  category: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
}
