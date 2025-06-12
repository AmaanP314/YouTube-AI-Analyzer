import React, { createContext, useState, useContext, useEffect } from "react";

const AnalysisContext = createContext();

export const useAnalysis = () => {
  return useContext(AnalysisContext);
};

export const AnalysisProvider = ({ children }) => {
  const [isAnalysisMode, setIsAnalysisMode] = useState(true);
  const [mobileView, setMobileView] = useState("main");
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem("analysisMode");
      if (savedMode !== null) {
        setIsAnalysisMode(JSON.parse(savedMode));
      }
    } catch (error) {
      console.error("Could not parse analysis mode from localStorage", error);
      setIsAnalysisMode(true);
    }
  }, []);

  const toggleAnalysisMode = () => {
    setIsAnalysisMode((prevMode) => {
      const newMode = !prevMode;
      try {
        localStorage.setItem("analysisMode", JSON.stringify(newMode));
      } catch (error) {
        console.error("Could not save analysis mode to localStorage", error);
      }
      return newMode;
    });
  };

  const value = {
    isAnalysisMode,
    toggleAnalysisMode,
    mobileView,
    setMobileView,
  };

  return (
    <AnalysisContext.Provider value={value}>
      {children}
    </AnalysisContext.Provider>
  );
};
