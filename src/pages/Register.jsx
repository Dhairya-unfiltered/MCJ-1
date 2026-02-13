import { useState } from "react";
import supabase from "../services/supabase";
import toast from "react-hot-toast";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const register = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) toast.error(error.message);
    else toast.success("Check email to confirm");
  };

  return (
    <div className="p-10 flex flex-col gap-4">
      <input className="border p-2" placeholder="Email"
        onChange={(e) => setEmail(e.target.value)} />
      <input className="border p-2" type="password" placeholder="Password"
        onChange={(e) => setPassword(e.target.value)} />
      <button className="bg-green-500 text-white p-2" onClick={register}>
        Register
      </button>
    </div>
  );
}
