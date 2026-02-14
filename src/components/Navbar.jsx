import { Link, useLocation } from "react-router-dom";
import supabase from "../services/supabase";
import { LayoutDashboard, ShoppingCart, Sparkles, Banknote, LogOut } from "lucide-react";

export default function Navbar() {
  const location = useLocation();

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/purchase", label: "Purchase", icon: ShoppingCart },
    { path: "/sell", label: "Sell", icon: Sparkles },
    { path: "/other", label: "Expenses", icon: Banknote },
  ];

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo / Brand */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-white p-1.5 rounded-lg shadow-sm">
              <Sparkles size={20} fill="white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-gray-900">
              MyChoice <span className="text-yellow-600">Jewelry</span>
            </span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex gap-8 h-full">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 h-full px-1 border-b-[3px] transition-all duration-200 font-medium text-sm lg:text-base ${isActive
                      ? "border-yellow-500 text-yellow-700 bg-yellow-50/50"
                      : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                    }`}
                >
                  <item.icon size={18} className={isActive ? "text-yellow-600" : "text-gray-400"} />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Mobile Menu & Logout (Simplified for now) */}
          <div className="flex items-center gap-4">
            {/* Mobile: Show active page name? Or just simple Logout for now as requested desktop focus */}

            <button
              onClick={logout}
              className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-red-600 transition-colors px-3 py-2 rounded-lg hover:bg-red-50"
              title="Logout"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Nav (Optional Enhancement - strict "yellow line" request focused on top nav for now) */}
      <div className="md:hidden flex justify-around bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 z-50 pb-safe">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center w-full py-3 ${isActive ? "text-yellow-700 bg-yellow-50" : "text-gray-500"
                }`}
            >
              <item.icon size={20} className={isActive ? "text-yellow-600 mb-1" : "text-gray-400 mb-1"} />
              <span className="text-[10px] font-medium">{item.label}</span>
              {isActive && <div className="absolute top-0 w-full h-[3px] bg-yellow-500" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
