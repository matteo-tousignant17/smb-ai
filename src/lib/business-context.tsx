"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface Business {
  id: string;
  name: string;
  type: string;
  industry?: string | null;
  description?: string | null;
  logo?: string | null;
  currency: string;
  taxRate: number;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}

interface BusinessContextType {
  currentBusiness: Business | null;
  businesses: Business[];
  setCurrentBusiness: (b: Business) => void;
  setBusinesses: (bs: Business[]) => void;
  isLoading: boolean;
}

const BusinessContext = createContext<BusinessContextType>({
  currentBusiness: null,
  businesses: [],
  setCurrentBusiness: () => {},
  setBusinesses: () => {},
  isLoading: true,
});

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [currentBusiness, setCurrentBusinessState] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/businesses");
        if (res.ok) {
          const data = await res.json();
          setBusinesses(data);
          const saved = localStorage.getItem("currentBusinessId");
          const found = saved ? data.find((b: Business) => b.id === saved) : null;
          setCurrentBusinessState(found || data[0] || null);
        }
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  function setCurrentBusiness(b: Business) {
    setCurrentBusinessState(b);
    localStorage.setItem("currentBusinessId", b.id);
  }

  return (
    <BusinessContext.Provider
      value={{ currentBusiness, businesses, setCurrentBusiness, setBusinesses, isLoading }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  return useContext(BusinessContext);
}
