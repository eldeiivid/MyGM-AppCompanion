import React, { createContext, useContext, useState } from "react";

// Definimos la forma de nuestro contexto
interface GameContextType {
  saveId: number | null;
  brandTheme: string;
  setGameSession: (id: number, theme: string) => void;
  clearSession: () => void;
  // Agregamos setSaveId para que index.tsx pueda usarlo si es necesario
  setSaveId: (id: number | null) => void;
}

// Creamos el contexto con valores por defecto seguros
const GameContext = createContext<GameContextType>({
  saveId: null,
  brandTheme: "#1E293B", // Color default (Slate-800)
  setGameSession: () => {},
  clearSession: () => {},
  setSaveId: () => {},
});

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [saveId, setSaveId] = useState<number | null>(null);
  const [brandTheme, setBrandTheme] = useState<string>("#1E293B");

  const setGameSession = (id: number, theme: string) => {
    setSaveId(id);
    setBrandTheme(theme);
  };

  const clearSession = () => {
    setSaveId(null);
    setBrandTheme("#1E293B");
  };

  return (
    <GameContext.Provider
      // Ahora incluimos setSaveId en el value
      value={{ saveId, brandTheme, setGameSession, clearSession, setSaveId }}
    >
      {children}
    </GameContext.Provider>
  );
};

// Hook personalizado para usar el contexto fácil en cualquier pantalla
export const useGame = () => useContext(GameContext);
