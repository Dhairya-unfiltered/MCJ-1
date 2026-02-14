import { useState } from "react";
import supabase from "../services/supabase";
import toast from "react-hot-toast";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Please fill in all fields");

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) toast.error(error.message);
    else window.location.href = "/purchase";
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-xl border border-gray-100 flex flex-col items-center">

        {/* Brand Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-white p-3 rounded-xl shadow-lg mb-4">
            <Sparkles size={32} fill="white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            MyChoice <span className="text-yellow-600">Jewelry</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your dashboard</p>
        </div>

        <form onSubmit={login} className="w-full space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Email Address</label>
            <input
              className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:bg-white transition-all text-gray-800"
              placeholder="admin@mychoice.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Password</label>
            <input
              className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:bg-white transition-all text-gray-800"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl transition transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <>Sign In <ArrowRight size={20} /></>}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-gray-400">
          © 2026 MyChoice Jewelry POS System
        </div>
      </div>
    </div>
  );
}
