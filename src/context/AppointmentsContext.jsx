import React, { createContext, useContext, useEffect, useState } from "react";

const AppointmentsContext = createContext();

export function AppointmentsProvider({ children }) {
  const [appointments, setAppointments] = useState(() => {
    const savedAppts = localStorage.getItem("docbridge_appointments");
    return savedAppts ? JSON.parse(savedAppts) : [];
  });

  useEffect(() => {
    localStorage.setItem("docbridge_appointments", JSON.stringify(appointments));
  }, [appointments]);

  const clearCancelledAppointments = () => {
    const hasCancelled = appointments.some(a => a.status === "Cancelled");
    
    if (!hasCancelled) {
      alert("No cancelled appointments to clear.");
      return;
    }

    if (window.confirm("Are you sure you want to clear all cancelled appointment records? This will not affect your confirmed bookings.")) {
      setAppointments((prev) => prev.filter((a) => a.status !== "Cancelled"));
    }
  };

  const addAppointment = (appt) => {
    setAppointments((prev) => [...prev, { ...appt, id: Date.now() }]);
  };

  const deleteAppointment = (id) => {
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  };

  const cancelAppointment = (id) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "Cancelled" } : a))
    );
  };

  return (
    <AppointmentsContext.Provider
      value={{
        appointments,
        addAppointment,
        cancelAppointment,
        deleteAppointment,
        clearCancelledAppointments, 
        appointmentsCount: appointments.filter((a) => a.status !== "Cancelled").length,
      }}
    >
      {children}
    </AppointmentsContext.Provider>
  );
}

export function useAppointments() {
  const context = useContext(AppointmentsContext);
  if (!context) {
    throw new Error("useAppointments must be used within AppointmentsProvider");
  }
  return context;
}