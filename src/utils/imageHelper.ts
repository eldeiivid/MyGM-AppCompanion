// src/utils/imageHelper.ts

// Esta es la dirección directa a tus archivos en la rama 'main'
const BASE_URL =
  "https://raw.githubusercontent.com/eldeiivid/wwe-mymg-assets/blob/";

const PLACEHOLDER_URL = "https://via.placeholder.com/150/1E293B/FFFFFF?text=?";

export const getWrestlerImage = (filename: string | null | undefined) => {
  if (!filename) return PLACEHOLDER_URL;
  if (filename.startsWith("http")) return filename;

  // Combina la base con el nombre del archivo
  return `${BASE_URL}${filename}`;
};
