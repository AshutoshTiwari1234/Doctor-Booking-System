import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { useAppointments } from "./context/AppointmentsContext";
import Home from "./pages/Home";
import Doctors from "./pages/Doctors";
import BookAppointment from "./pages/BookAppointment";
import MyAppointments from "./pages/MyAppointments";
import Navbar from "./components/Navbar";
import "./App.css";

export default function App() {
  const location = useLocation();
  const { appointmentsCount } = useAppointments();

  const getPage = () => {
    const path = location.pathname.replace("/", "");
    if (!path) return "home";
    if (path === "doctors") return "doctors";
    if (path === "book") return "book";
    if (path === "appointments") return "appointments";
    return "home";
  };

  return (
    <div className="app">
      <Navbar page={getPage()} appointmentCount={appointmentsCount} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/doctors" element={<Doctors />} />
          <Route path="/book" element={<BookAppointment />} />
          <Route path="/appointments" element={<MyAppointments />} />
        </Routes>
      </main>
    </div>
  );
}
