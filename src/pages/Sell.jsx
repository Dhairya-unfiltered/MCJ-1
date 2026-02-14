import { useEffect, useState } from "react";
import supabase from "../services/supabase";
import Navbar from "../components/Navbar";
import { Trash2, Printer, X, Sparkles, Plus, Search, Calendar, FileText, ChevronRight } from "lucide-react";

// Utility to format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
};

// Utility to format date to IST
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
  // dateStr is "YYYY-MM-DD"
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);

  // Construct a Date object that effectively represents that IST time
  // but we need to subtract 5.5 hours to get the real UTC time

  // Create Date with local inputs, but we want to force this 'local' to be 'IST'
  // Strategy: Create UTC date for that time, then subtract 5.5 hours.

  let hour = isEndOfDay ? 23 : 0;
  let minute = isEndOfDay ? 59 : 0;
  let second = isEndOfDay ? 59 : 0;
  let ms = isEndOfDay ? 999 : 0;

  // UTC equivalent if it were GMT
  const utcBase = Date.UTC(y, m - 1, d, hour, minute, second, ms);

  // Shift by -5.5 hours (-330 minutes) to get the UTC timestamp for that IST time
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const trueUtc = new Date(utcBase - istOffsetMs);

  return trueUtc.toISOString();
};


export default function Sell() {
  // ---------- STATES ----------
  const [items, setItems] = useState([
    { metal: "", rate: "", weight: "", amount: 0 },
  ]);
  const [customer, setCustomer] = useState("");
  const [contact, setContact] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Bills List State
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState("");

  // Date Filter State
  const today = new Date();
  const [filterType, setFilterType] = useState("month"); // 'month' | 'custom'

  // Month State (Default to current)
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  // Custom Range State (Default to Today)
  const [customStart, setCustomStart] = useState(today.toISOString().split("T")[0]);
  const [customEnd, setCustomEnd] = useState(today.toISOString().split("T")[0]);

  const [deleteId, setDeleteId] = useState(null);
  const [confirmText, setConfirmText] = useState("");

  // ---------- ITEMS LOGIC ----------
  const addItem = () => {
    setItems([...items, { metal: "", rate: "", weight: "", amount: 0 }]);
  };

  const removeItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;

    // Auto-calculate amount
    if (field === "rate" || field === "weight") {
      const rate = parseFloat(newItems[index].rate) || 0;
      const weight = parseFloat(newItems[index].weight) || 0;
      newItems[index].amount = rate * weight;
    }

    setItems(newItems);
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((acc, item) => acc + (item.amount || 0), 0);
    const gst = subtotal * 0.03; // 3% GST
    const total = subtotal + gst;
    return { subtotal, gst, total };
  };

  const { subtotal, gst, grandTotal } = (() => {
    const t = calculateTotals();
    return { subtotal: t.subtotal, gst: t.gst, grandTotal: t.total };
  })();

  // ---------- SAVE BILL ----------
  const saveBill = async () => {
    // Validation
    if (!customer.trim()) return alert("Customer name is required");
    if (items.length === 0) return alert("Add at least one item");
    if (items.some(i => !i.metal || !i.rate || !i.weight))
      return alert("Please fill all item details");
    if (items.some(i => Number(i.weight) <= 0 || Number(i.rate) <= 0))
      return alert("Weight and Rate must be greater than 0");

    setSaving(true);
    try {
      const { error } = await supabase.from("sell_bills").insert({
        customer,
        contact,
        description,
        items,
        total: grandTotal,
        gst,
      });

      if (error) throw error;

      // Reset Form
      setItems([{ metal: "", rate: "", weight: "", amount: 0 }]);
      setCustomer("");
      setContact("");
      setDescription("");
      fetchBills();
      alert("Bill saved successfully!");
    } catch (err) {
      console.error("Error saving bill:", err);
      alert("Failed to save bill. " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ---------- FETCH BILLS ----------
  const fetchBills = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("sell_bills")
        .select("*")
        .order("created_at", { ascending: false });

      if (search) {
        // Robust Search
        const isNum = !isNaN(search) && search.trim() !== "";
        let filterString = `customer.ilike.%${search}%,contact.ilike.%${search}%,description.ilike.%${search}%`;

        if (isNum) {
          filterString += `,bill_number.eq.${search}`;
        }

        query = query.or(filterString);
      } else {
        // Date Filtering
        let startISO, endISO;

        if (filterType === "month") {
          // Calculate start/end of Month in IST
          // Start: 1st of month 00:00 IST
          // End: 1st of next month 00:00 IST (exclusive)

          const istOffsetMs = 5.5 * 60 * 60 * 1000;

          const startUTCBase = Date.UTC(selectedYear, selectedMonth, 1, 0, 0, 0);
          const endUTCBase = Date.UTC(selectedYear, selectedMonth + 1, 1, 0, 0, 0);

          startISO = new Date(startUTCBase - istOffsetMs).toISOString();
          endISO = new Date(endUTCBase - istOffsetMs).toISOString();
        } else {
          // Custom Range
          startISO = getISTDateISO(customStart, false);
          endISO = getISTDateISO(customEnd, true);
        }

        if (startISO && endISO) {
          query = query.gte("created_at", startISO).lte("created_at", endISO);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setBills(data || []);
    } catch (err) {
      console.error("Error fetching bills:", err);
      // alert("Failed to fetch bills");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, [selectedMonth, selectedYear, filterType, customStart, customEnd, search]);

  // ---------- DELETE BILL ----------
  const deleteBill = async () => {
    if (confirmText !== "DELETE") return;
    try {
      await supabase.from("sell_bills").delete().eq("id", deleteId);
      setDeleteId(null);
      setConfirmText("");
      setExpandedId(null); // Close the details modal
      fetchBills();
    } catch (err) {
      alert("Error deleting bill");
    }
  };

  // ---------- DOWNLOAD / PRINT ----------
  const downloadBill = (bill) => {
    const w = window.open("", "_blank");
    w.document.write(`
      <html>
        <head>
          <title>Bill #${bill.bill_number}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; max-width: 800px; mx: auto; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #D4AF37; padding-bottom: 10px; }
            .header h1 { margin: 0; color: #D4AF37; }
            .details { display: flex; justify-content: space-between; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f8f9fa; }
            .totals { text-align: right; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>MyChoice Jewelry</h1>
            <p>Exclusive Gold & Diamond Jewellery</p>
            <p>Contact: +91 8866472867</p>
          </div>
          
          <div class="details">
            <div>
              <strong>Bill To:</strong><br>
              ${bill.customer}<br>
              ${bill.contact || ""}
            </div>
            <div style="text-align: right;">
              <strong>Bill No:</strong> ${bill.bill_number || "N/A"}<br>
              <strong>Date:</strong> ${formatIST(bill.created_at)}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Rate (Rs/g)</th>
                <th>Weight (g)</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${bill.items
        ?.map(
          (item) => `
                <tr>
                  <td>${item.metal}</td>
                  <td>${item.rate}</td>
                  <td>${item.weight}</td>
                  <td>${formatCurrency(item.amount)}</td>
                </tr>
              `
        )
        .join("")}
            </tbody>
          </table>

          <div class="totals">
            <p>Subtotal: ${formatCurrency(bill.total - bill.gst)}</p>
            <p>GST (3%): ${formatCurrency(bill.gst)}</p>
            <h3>Grand Total: ${formatCurrency(bill.total)}</h3>
          </div>

          <div class="footer">
            <p>Computer Generated Bill</p>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    w.document.close();
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const years = [2025, 2026, 2027, 2028, 2029, 2030];

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 pb-12">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          <div className="flex flex-col xl:flex-row gap-8">
            {/* LEFT COLUMN: CREATE BILL */}
            <div className="xl:w-5/12">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 sticky top-4">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <div className="p-2 bg-yellow-50 rounded-lg">
                    <Sparkles className="text-yellow-600" size={24} />
                  </div>
                  New Sell Bill
                </h2>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      className="border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-yellow-500"
                      placeholder="Customer Name *"
                      value={customer}
                      onChange={(e) => setCustomer(e.target.value)}
                    />
                    <input
                      className="border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-yellow-500"
                      placeholder="Contact Number"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                    />
                  </div>
                  <input
                    className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="Description (Optional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />

                  {/* Items Table with 12-column grid */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-12 gap-3 mb-2 text-sm font-bold text-gray-600">
                      <div className="col-span-5">Item</div>
                      <div className="col-span-2">Wt(g)</div>
                      <div className="col-span-2">Rate</div>
                      <div className="col-span-2 text-right">Amt</div>
                      <div className="col-span-1"></div>
                    </div>

                    {items.map((item, i) => (
                      <div key={i} className="grid grid-cols-12 gap-3 mb-3 items-center group">
                        <div className="col-span-5">
                          <input
                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-yellow-500 transition-all bg-white"
                            placeholder="Item Name"
                            value={item.metal}
                            onChange={(e) => updateItem(i, "metal", e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-yellow-500 transition-all bg-white"
                            placeholder="0.0"
                            value={item.weight}
                            onChange={(e) => updateItem(i, "weight", e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-yellow-500 transition-all bg-white"
                            placeholder="0"
                            value={item.rate}
                            onChange={(e) => updateItem(i, "rate", e.target.value)}
                          />
                        </div>
                        <div className="col-span-2 text-right">
                          <div className="font-bold text-gray-800 text-sm">₹{item.amount}</div>
                        </div>
                        <div className="col-span-1 flex justify-center">
                          {items.length > 1 ? (
                            <button
                              onClick={() => removeItem(i)}
                              className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition-all"
                              title="Delete Row"
                            >
                              <Trash2 size={18} />
                            </button>
                          ) : (
                            <div className="w-9 h-9"></div>
                          )}
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={addItem}
                      className="mt-2 text-yellow-600 font-bold hover:text-yellow-700 flex items-center gap-2 transition-colors px-1"
                    >
                      <Plus size={18} /> Add Item
                    </button>
                  </div>

                  <div className="bg-gray-100 p-4 rounded-lg space-y-2 mt-4">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>GST (3%):</span>
                      <span>{formatCurrency(gst)}</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-300">
                      <span>Grand Total:</span>
                      <span>{formatCurrency(grandTotal)}</span>
                    </div>
                  </div>

                  <button
                    onClick={saveBill}
                    disabled={saving}
                    className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-bold py-3 rounded-lg shadow-lg transition transform active:scale-95 disabled:opacity-50 mt-2"
                  >
                    {saving ? "Saving..." : "Save Bill"}
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: HISTORY */}
            <div className="xl:w-7/12">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <FileText className="text-gray-500" size={20} /> History
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
                <div className="mb-4">
                  {filterType === 'month' ? (
                    <div className="flex gap-2">
                      <select
                        className="border rounded p-2 bg-gray-50 outline-none focus:ring-2 focus:ring-yellow-500 flex-1"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      >
                        {months.map((m, i) => (
                          <option key={i} value={i}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <select
                        className="border rounded p-2 bg-gray-50 outline-none focus:ring-2 focus:ring-yellow-500 w-24"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                      >
                        {years.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
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
                      <span className="text-gray-400">to</span>
                      <input
                        type="date"
                        className="border p-2 rounded flex-1 min-w-[120px] outline-none focus:ring-2 focus:ring-yellow-500"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-yellow-500 outline-none"
                    placeholder="Search by Name, Bill No, or Contact..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                {loading ? (
                  <p className="text-center text-gray-500 py-10">
                    Loading bills...
                  </p>
                ) : bills.length === 0 ? (
                  <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <p className="text-gray-500">
                      No bills found for this period.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bills.map((bill) => (
                      <div
                        key={bill.id}
                        className="group border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition bg-white overflow-hidden cursor-pointer"
                        onClick={() => setExpandedId(bill)}
                      >
                        <div
                          className="flex justify-between items-center p-4 bg-white group-hover:bg-gray-50 transition"
                        >
                          <div>
                            <p className="font-bold text-gray-800">
                              {bill.customer}
                            </p>
                            <p className="text-xs text-gray-500 flex gap-2 mt-1">
                              <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-md font-mono">
                                #{bill.bill_number}
                              </span>
                              <span>{formatIST(bill.created_at)}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900">
                              {formatCurrency(bill.total)}
                            </p>
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

        {/* BILL DETAILS MODAL */}
        {expandedId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setExpandedId(null)}>
            <div
              className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 flex justify-between items-start sticky top-0 bg-white z-10">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FileText className="text-yellow-600" /> Bill #{expandedId.bill_number}
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

                {/* Customer Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                  <div>
                    <span className="text-xs text-yellow-800 uppercase font-bold tracking-wider">Customer</span>
                    <p className="font-bold text-gray-900 text-lg">{expandedId.customer}</p>
                  </div>
                  <div>
                    <span className="text-xs text-yellow-800 uppercase font-bold tracking-wider">Contact</span>
                    <p className="text-gray-900">{expandedId.contact || "N/A"}</p>
                  </div>
                  {expandedId.description && (
                    <div className="col-span-1 sm:col-span-2 text-sm text-gray-600 mt-2 pt-2 border-t border-yellow-200">
                      <span className="font-medium">Note:</span> {expandedId.description}
                    </div>
                  )}
                </div>

                {/* Items Table */}
                <div>
                  <h4 className="font-bold text-gray-700 mb-3 border-b pb-1">Items Purchased</h4>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 bg-gray-50">
                        <th className="p-2 rounded-l">Item</th>
                        <th className="p-2">Rate</th>
                        <th className="p-2">Weight</th>
                        <th className="p-2 text-right rounded-r">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expandedId.items?.map((it, idx) => (
                        <tr key={idx} className="border-b border-gray-50 last:border-0">
                          <td className="p-2 font-medium">{it.metal}</td>
                          <td className="p-2 text-gray-600">₹{it.rate}/g</td>
                          <td className="p-2 text-gray-600">{it.weight}g</td>
                          <td className="p-2 text-right font-bold text-gray-800">{formatCurrency(it.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-full sm:w-1/2 space-y-2 bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span>{formatCurrency((expandedId.total || 0) - (expandedId.gst || 0))}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>GST (3%)</span>
                      <span>{formatCurrency(expandedId.gst || 0)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-xl text-gray-900 pt-2 border-t border-gray-200">
                      <span>Grand Total</span>
                      <span>{formatCurrency(expandedId.total || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer (Actions) */}
              <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end rounded-b-xl">
                <button
                  onClick={() => setDeleteId(expandedId.id)}
                  className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-bold transition flex items-center gap-2"
                >
                  <Trash2 size={18} /> Delete
                </button>
                <button
                  onClick={() => downloadBill(expandedId)}
                  className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-black text-sm font-bold shadow-lg transition flex items-center gap-2"
                >
                  <Printer size={18} /> Print Invoice
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
                <Trash2 className="text-red-500" /> Delete Bill?
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                This action cannot be undone. Type <strong>DELETE</strong> to
                confirm.
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
                  onClick={() => {
                    setDeleteId(null);
                    setConfirmText("");
                  }}
                >
                  Cancel
                </button>
                <button
                  disabled={confirmText !== "DELETE"}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  onClick={deleteBill}
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
