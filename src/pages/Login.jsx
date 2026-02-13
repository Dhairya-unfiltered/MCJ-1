import { useState } from "react";
import supabase from "../services/supabase";
import toast from "react-hot-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) toast.error(error.message);
    else window.location.href = "/purchase";
  };

  return (
    <div className="p-10 flex flex-col gap-4">
      <input className="border p-2" placeholder="Email"
        onChange={(e) => setEmail(e.target.value)} />
      <input className="border p-2" type="password" placeholder="Password"
        onChange={(e) => setPassword(e.target.value)} />
      <button className="bg-green-600 text-white p-2" onClick={login}>
        Login
      </button>
    </div>
  );
}
