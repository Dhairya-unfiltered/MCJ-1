import { Link } from "react-router-dom";
import  supabase  from "../services/supabase";

export default function Navbar() {
  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="bg-black text-white p-4 flex gap-6">
      <Link to="/purchase">Purchase</Link>
      <Link to="/sell">Sell</Link>
      <Link to="/other">Other</Link>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
