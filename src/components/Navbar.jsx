import { Link } from "react-router-dom";
import supabase from "../services/supabase";

export default function Navbar() {
  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="bg-black text-white p-4 flex gap-6 justify-between">
      <div className="flex gap-3">
        <Link to="/dashboard" className="text-yellow-400 font-bold">Dashboard</Link>
        <Link to="/purchase">Purchase</Link>
        <Link to="/sell">Sell</Link>
        <Link to="/other">Other</Link>
      </div>

      <button className="text-red-500" onClick={logout}>Logout</button>
    </div>
  );
}
