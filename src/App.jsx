import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import  supabase  from "./services/supabase";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Purchase from "./pages/Purchase";
import Sell from "./pages/Sell";
import Other from "./pages/Other";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) return <div>Loading...</div>;

  const Private = ({ children }) =>
    user ? children : <Navigate to="/login" />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/purchase" element={<Private><Purchase /></Private>} />
        <Route path="/sell" element={<Private><Sell /></Private>} />
        <Route path="/other" element={<Private><Other /></Private>} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}
