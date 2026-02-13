import { useEffect, useState } from "react";
import supabase from "../services/supabase";
import Navbar from "../components/Navbar";
import toast from "react-hot-toast";

export default function Other() {
  const [expenses, setExpenses] = useState([]);

  const [form, setForm] = useState({
    type: "",
    amount: "",
    gst: ""
  });

  const [deleteId, setDeleteId] = useState(null);
  const [confirmText, setConfirmText] = useState("");

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  // ---------- IST RANGE ----------
  const getISTRange = (month, year) => {
    const IST_OFFSET_HOURS = 5.5;

    const startUTC = new Date(
      Date.UTC(year, month, 1, 0, 0, 0) -
        IST_OFFSET_HOURS * 60 * 60 * 1000
    );

    const endUTC = new Date(
      Date.UTC(year, month + 1, 1, 0, 0, 0) -
        IST_OFFSET_HOURS * 60 * 60 * 1000
    );

    return {
      start: startUTC.toISOString(),
      end: endUTC.toISOString(),
    };
  };

  // ---------- FETCH ----------
  const fetchExpenses = async () => {
    const { start, end } = getISTRange(selectedMonth, selectedYear);

    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at", { ascending: false });

    if (error) toast.error(error.message);
    else setExpenses(data || []);
  };

  useEffect(() => {
    fetchExpenses();
  }, [selectedMonth, selectedYear]);

  // ---------- ADD ----------
  const addExpense = async () => {
    try {
      if (!form.type || form.amount === "") {
        toast.error("Fill all fields");
        return;
      }

      const gst = form.gst === "" ? 0 : Number(form.gst);

      const { error } = await supabase.from("expenses").insert({
        type: form.type,
        amount: Number(form.amount),
        gst,
      });

      if (error) throw error;

      toast.success("Expense Added");

      // RESET FORM
      setForm({
        type: "",
        amount: "",
        gst: ""
      });

      fetchExpenses();
    } catch (err) {
      toast.error(err.message || "Error adding expense");
    }
  };

  // ---------- DELETE ----------
  const deleteExpense = async () => {
    if (confirmText !== "DELETE") return;

    await supabase.from("expenses").delete().eq("id", deleteId);

    setDeleteId(null);
    setConfirmText("");
    fetchExpenses();
  };

  return (
    <>
      <Navbar />
      <div className="p-4 md:p-6 max-w-4xl mx-auto flex flex-col gap-6">

        <div className="border p-4 rounded shadow bg-white flex flex-col gap-4">
          <h2 className="text-xl font-bold">Misc Expenses</h2>

          {/* FORM */}
          <input
            className="border p-2"
            placeholder="Expense Type"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          />

          <input
            className="border p-2"
            type="number"
            placeholder="Amount"
            value={form.amount}
            onChange={(e) =>
              setForm({ ...form, amount: e.target.value })
            }
          />

          <input
            className="border p-2"
            type="number"
            placeholder="GST (optional)"
            value={form.gst}
            onChange={(e) =>
              setForm({ ...form, gst: e.target.value })
            }
          />

          <button
            className="bg-green-600 text-white p-2 rounded"
            onClick={addExpense}
          >
            Add Expense
          </button>
        </div>

        <h3 className="mt-6 font-semibold">Expenses</h3>

        {/* MONTH + YEAR FILTER */}
        <div className="flex gap-3">
          <select
            className="border p-2"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
          >
            {[
              "January","February","March","April","May","June",
              "July","August","September","October","November","December"
            ].map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>

          <select
            className="border p-2"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {[2025, 2026, 2027, 2028].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {expenses.map((e) => (
          <div key={e.id} className="border p-2 rounded shadow">
            <p><b>{e.type}</b></p>
            <p>₹{e.amount}</p>
            <p>GST ₹{e.gst}</p>

            <button
              className="text-red-600 mt-2"
              onClick={() => setDeleteId(e.id)}
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      {/* DELETE MODAL */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow max-w-sm w-full">
            <p className="font-bold mb-2">Type DELETE to confirm</p>
            <input
              className="border p-2 w-full mb-3"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
            <button
              className="bg-red-600 text-white px-4 py-2 rounded w-full"
              onClick={deleteExpense}
            >
              Confirm Delete
            </button>
          </div>
        </div>
      )}
    </>
  );
}
