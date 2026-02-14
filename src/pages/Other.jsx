import { useEffect, useState } from "react";
import supabase from "../services/supabase";
import Navbar from "../components/Navbar";
import toast from "react-hot-toast";
import { Banknote, Trash2, Search, Calendar, FileText, ChevronRight, X, Sparkles } from "lucide-react";

// Utility to format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
};

// Utility to format date to IST (Robust)
const formatIST = (dateString) => {
  if (!dateString) return "N/A";

  // If the date string doesn't have timezone info (Z or +), append Z to treat as UTC
  let safeDateStr = dateString;
  if (!dateString.endsWith("Z") && !dateString.includes("+")) {
    safeDateStr = dateString.replace(" ", "T") + "Z";
  }

  const date = new Date(safeDateStr);

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
};

// Helper to get UTC ISO string from local YYYY-MM-DD that represents IST start/end
const getISTDateISO = (dateStr, isEndOfDay = false) => {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);

  let hour = isEndOfDay ? 23 : 0;
  let minute = isEndOfDay ? 59 : 0;
  let second = isEndOfDay ? 59 : 0;
  let ms = isEndOfDay ? 999 : 0;

  const utcBase = Date.UTC(y, m - 1, d, hour, minute, second, ms);
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const trueUtc = new Date(utcBase - istOffsetMs);

  return trueUtc.toISOString();
};

export default function Other() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [form, setForm] = useState({
    type: "",
    amount: "",
    description: "",
    gst: ""
  });
  const [saving, setSaving] = useState(false);

  // Filter & Search State
  const today = new Date();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("month"); // 'month' | 'custom'

  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  const [customStart, setCustomStart] = useState(today.toISOString().split("T")[0]);
  const [customEnd, setCustomEnd] = useState(today.toISOString().split("T")[0]);

  // Delete State
  const [deleteId, setDeleteId] = useState(null);
  const [confirmText, setConfirmText] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  // ---------- FETCH EXPENSES ----------
  const fetchExpenses = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("expenses")
        .select("*")
        .order("created_at", { ascending: false });

      if (search) {
        // Robust Search: Type or Amount (exact match for amount to avoid noise)
        // Since amount is numeric, we can't ILIKE it easily.
        // Strategy: If search is numeric, check amount or type. If text, check type.

        const isNum = !isNaN(search) && search.trim() !== "";
        let filterString = `type.ilike.%${search}%`;

        if (isNum) {
          filterString += `,amount.eq.${search}`;
        }
        query = query.or(filterString);

      } else {
        // Date Filtering
        let startISO, endISO;

        if (filterType === "month") {
          const istOffsetMs = 5.5 * 60 * 60 * 1000;
          const startUTCBase = Date.UTC(selectedYear, selectedMonth, 1, 0, 0, 0);
          const endUTCBase = Date.UTC(selectedYear, selectedMonth + 1, 1, 0, 0, 0);

          startISO = new Date(startUTCBase - istOffsetMs).toISOString();
          endISO = new Date(endUTCBase - istOffsetMs).toISOString();
        } else {
          startISO = getISTDateISO(customStart, false);
          endISO = getISTDateISO(customEnd, true);
        }

        if (startISO && endISO) {
          query = query.gte("created_at", startISO).lte("created_at", endISO);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setExpenses(data || []);

    } catch (err) {
      console.error("Error fetching expenses:", err);
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [selectedMonth, selectedYear, filterType, customStart, customEnd, search]);

  // ---------- ADD EXPENSE ----------
  const addExpense = async () => {
    if (!form.type.trim() || form.amount === "") {
      toast.error("Please enter Type and Amount");
      return;
    }

    setSaving(true);
    try {
      const gst = form.gst === "" ? 0 : Number(form.gst);
      const amount = Number(form.amount);

      const { error } = await supabase.from("expenses").insert({
        type: form.type,
        amount,
        description: form.description,
        gst,
      });

      if (error) throw error;

      toast.success("Expense Added");
      setForm({ type: "", amount: "", description: "", gst: "" }); // Reset
      fetchExpenses();

    } catch (err) {
      console.error(err);
      toast.error(err.message || "Error adding expense");
    } finally {
      setSaving(false);
    }
  };

  // ---------- DELETE EXPENSE ----------
  const deleteExpense = async () => {
    if (confirmText !== "DELETE") return;
    try {
      await supabase.from("expenses").delete().eq("id", deleteId);
      setDeleteId(null);
      setConfirmText("");
      setExpandedId(null); // Close modal
      fetchExpenses();
      toast.success("Expense Deleted");
    } catch (err) {
      toast.error("Error deleting expense");
    }
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const years = [2025, 2026, 2027, 2028, 2029, 2030];

  // Calculate Total for displayed expenses
  const totalAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalGST = expenses.reduce((sum, e) => sum + (e.gst || 0), 0);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 pb-12">
        <div className="max-w-7xl mx-auto p-4 md:p-8">

          <div className="flex flex-col xl:flex-row gap-8">

            {/* LEFT COLUMN: ADD EXPENSE */}
            <div className="xl:w-4/12">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 sticky top-4">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <div className="p-2 bg-yellow-50 rounded-lg">
                    <Banknote className="text-yellow-600" size={24} />
                  </div>
                  Add Expense
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expense Type</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-yellow-500 outline-none transition"
                      placeholder="e.g. Electricity, Tea, Repairs"
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-yellow-500 outline-none transition"
                      type="number"
                      placeholder="0.00"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                    <textarea
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-yellow-500 outline-none transition"
                      rows="2"
                      placeholder="Notes..."
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">GST Paid (Optional)</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-yellow-500 outline-none transition"
                      type="number"
                      placeholder="0.00"
                      value={form.gst}
                      onChange={(e) => setForm({ ...form, gst: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave blank if not applicable.</p>
                  </div>

                  <button
                    onClick={addExpense}
                    disabled={saving}
                    className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-bold py-3 rounded-lg shadow-lg transition transform active:scale-95 disabled:opacity-50 mt-2"
                  >
                    {saving ? "Saving..." : "Add Expense"}
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: HISTORY */}
            <div className="xl:w-8/12">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <FileText className="text-gray-500" size={20} /> Expense History
                  </h2>

                  {/* Filter Toggles */}
                  <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                      onClick={() => setFilterType('month')}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition flex items-center gap-1 ${filterType === 'month' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}
                    >
                      <Calendar size={14} /> Monthly
                    </button>
                    <button
                      onClick={() => setFilterType('custom')}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition flex items-center gap-1 ${filterType === 'custom' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}
                    >
                      <Calendar size={14} /> Range
                    </button>
                  </div>
                </div>

                {/* Filters Inputs */}
                <div className="mb-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                  {filterType === 'month' ? (
                    <div className="flex gap-2">
                      <select
                        className="border rounded p-2 bg-white outline-none focus:ring-2 focus:ring-yellow-500 flex-1"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      >
                        {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                      </select>
                      <select
                        className="border rounded p-2 bg-white outline-none focus:ring-2 focus:ring-yellow-500 w-24"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                      >
                        {years.map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 text-sm items-center">
                      <input
                        type="date"
                        className="border p-2 rounded flex-1 min-w-[120px] outline-none focus:ring-2 focus:ring-yellow-500"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                      />
                      <span className="text-gray-400 font-bold">to</span>
                      <input
                        type="date"
                        className="border p-2 rounded flex-1 min-w-[120px] outline-none focus:ring-2 focus:ring-yellow-500"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="mt-3 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-yellow-500 outline-none"
                      placeholder="Search expenses..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>

                {/* LIST */}
                {loading ? (
                  <p className="text-center text-gray-500 py-10">Loading...</p>
                ) : expenses.length === 0 ? (
                  <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <p className="text-gray-500">No expenses found.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {expenses.map((e) => (
                      <div
                        key={e.id}
                        onClick={() => setExpandedId(e)}
                        className="group border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition bg-white overflow-hidden cursor-pointer"
                      >
                        <div className="flex justify-between items-center p-4 bg-white group-hover:bg-gray-50 transition">
                          <div>
                            <p className="font-bold text-gray-800 text-lg">{e.type}</p>
                            <p className="text-xs text-gray-500 flex gap-2 mt-1">
                              <span>{formatIST(e.created_at)}</span>
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="font-bold text-gray-900 text-lg">{formatCurrency(e.amount)}</p>
                            <span className="text-xs text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-1">
                              View Details <ChevronRight size={14} />
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* EXPENSE DETAILS MODAL */}
        {expandedId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setExpandedId(null)}>
            <div
              className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 flex justify-between items-start sticky top-0 bg-white z-10">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Banknote className="text-yellow-600" /> Expense Details
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{formatIST(expandedId.created_at)}</p>
                </div>
                <button
                  onClick={() => setExpandedId(null)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">

                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                  <span className="text-xs text-yellow-800 uppercase font-bold tracking-wider">Expense Type</span>
                  <p className="font-bold text-gray-900 text-xl">{expandedId.type}</p>
                </div>

                {expandedId.description && (
                  <div>
                    <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Description / Notes</span>
                    <p className="text-gray-700 mt-1 bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm">
                      {expandedId.description}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Amount</span>
                    <p className="font-bold text-gray-900 text-lg">{formatCurrency(expandedId.amount)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">GST Paid</span>
                    <p className="font-bold text-gray-900 text-lg">{formatCurrency(expandedId.gst || 0)}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <span className="text-lg font-bold text-gray-900">Total Expense</span>
                  <span className="text-2xl font-bold text-gray-900">{formatCurrency((expandedId.amount || 0) + (expandedId.gst || 0))}</span>
                </div>

              </div>

              {/* Modal Footer (Actions) */}
              <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end rounded-b-xl">
                <button
                  onClick={() => setDeleteId(expandedId.id)}
                  className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-bold transition flex items-center gap-2 w-full justify-center"
                >
                  <Trash2 size={18} /> Delete Expense
                </button>
              </div>

            </div>
          </div>
        )}

        {/* DELETE MODAL */}
        {deleteId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full transform transition-all scale-100">
              <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Trash2 className="text-red-500" /> Delete Expense?
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                This action cannot be undone. Type <strong>DELETE</strong> to confirm.
              </p>
              <input
                autoFocus
                className="border-2 border-red-100 focus:border-red-500 rounded-lg p-2 w-full mb-4 outline-none"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE"
              />
              <div className="flex gap-3">
                <button
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 font-medium"
                  onClick={() => { setDeleteId(null); setConfirmText(""); }}
                >
                  Cancel
                </button>
                <button
                  disabled={confirmText !== "DELETE"}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  onClick={deleteExpense}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
