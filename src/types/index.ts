// src/types/index.ts

export type Gender = "Male" | "Female";
// Agregamos "None" para la clase secundaria cuando aún no se desbloquea
export type WrestlingClass =
  | "Giant"
  | "Cruiser"
  | "Bruiser"
  | "Fighter"
  | "Specialist"
  | "None";

export type CrowdReaction = "Face" | "Heel";
export type TitleCategory = "World" | "Midcard" | "Tag" | "Other";

// 1. EL LUCHADOR
export interface Luchador {
  id: number;

  // Datos del Roster & Contrato
  name: string;
  gender: Gender;
  crowd: CrowdReaction;
  ringLevel: number;
  mainClass: WrestlingClass;
  altClass: WrestlingClass; // Ahora obligatorio (por defecto "None")
  mic: number;

  // --- NUEVO: Gestión de GM ---
  weeksLeft: number; // Semanas restantes (Draft = 25, Agente Libre = X)
  hiringCost: number; // Costo total del contrato
  popularity: number; // Valor de 0-100 para ratings del show

  // Match History (Contadores para WWE 2K25)
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
  normalWins: number; // Aquí pondrás tus victorias manuales
  normalLosses: number; // Aquí pondrás tus derrotas manuales

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

// 2. CAMPEONATOS (Estructura para soportar Tag y MITB)
export interface Title {
  id: number;
  name: string;
  category: TitleCategory;
  gender: Gender | "Mixed";

  // Portadores ( holderId2 solo se usa si category es "Tag" )
  holderId1: number | null;
  holderId2: number | null;

  weekWon: number; // Semana en la que inició el reinado actual
  isMITB: boolean; // Para identificar maletines en la pestaña "Otros"

  holderName1?: string;
  holderName2?: string;
}

// 3. HISTORIAL DE REINADOS (Timeline)
export interface TitleReign {
  id: number;
  titleId: number;
  luchadorId1: number;
  luchadorId2: number | null; // Para campeones en pareja

  weekWon: number;
  weekLost: number | null;

  lostToId1: number | null; // Quién le quitó el título (Luchador 1)
  lostToId2: number | null; // Quién le quitó el título (Luchador 2)

  isCashIn: boolean; // ¿El título cambió por un canjeo de MITB?
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
