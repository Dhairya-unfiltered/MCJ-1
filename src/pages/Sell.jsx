import { useEffect, useState } from "react";
import supabase from "../services/supabase";
import Navbar from "../components/Navbar";



const formatIST = (dateString) => {
  // Convert Postgres format to proper UTC ISO format
  const utcDate = new Date(dateString.replace(" ", "T") + "Z");

  return utcDate.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
};


export default function Sell() {

  // ---------- STATES ----------
  const [items, setItems] = useState([]);
  const [customer, setCustomer] = useState("");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [bills, setBills] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState("");

  const [deleteId, setDeleteId] = useState(null);
  const [confirmText, setConfirmText] = useState("");

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  // ---------- ITEMS ----------
  const addItem = () =>
    setItems([...items, { metal: "", rate: null, weight: null, amount: null }]);

  const removeItem = (i) =>
    setItems(items.filter((_, idx) => idx !== i));

  const updateItem = (i, field, value) => {
    const copy = [...items];
    copy[i][field] = value;
    if (field === "rate" || field === "weight") {
      copy[i].amount = Number(copy[i].rate) * Number(copy[i].weight);
    }
    setItems(copy);
  };

  const total = items.reduce((s, i) => s + Number(i.amount || 0), 0);
  const gst = total * 0.03;

  // ---------- SAVE BILL ----------
  const saveBill = async () => {
    if (!items.length) return;

    await supabase.from("sell_bills").insert({
      customer: customer || "N/A",
      description: description || "N/A",
      contact,
      items,
      total,
      gst,
    });

    setItems([]);
    setCustomer("");
    setDescription("");
    setContact("");
    fetchBills();
  };

  // ---------- IST RANGE ----------
const getISTRange = (month, year) => {
  // IST offset in hours
  const IST_OFFSET_HOURS = 5.5;

  // Start of month in IST → convert to UTC
  const startUTC = new Date(
    Date.UTC(year, month, 1, 0, 0, 0) - IST_OFFSET_HOURS * 60 * 60 * 1000
  );

  // End of month in IST → convert to UTC
  const endUTC = new Date(
    Date.UTC(year, month + 1, 1, 0, 0, 0) - IST_OFFSET_HOURS * 60 * 60 * 1000
  );

  return {
    start: startUTC.toISOString(),
    end: endUTC.toISOString(),
  };
};


  // ---------- FETCH ----------
  const fetchBills = async () => {
    const { start, end } = getISTRange(selectedMonth, selectedYear);

    let query = supabase
      .from("sell_bills")
      .select("*")
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at", { ascending: false });

       if (search) {
  query = supabase
    .from("sell_bills")
    .select("*")
    .eq("bill_number", search)
    .order("created_at", { ascending: false });
}


    const { data } = await query;

    setBills(data || []);

  };

  useEffect(() => {
    fetchBills();
  }, [selectedMonth, selectedYear, search]);

  // ---------- DELETE ----------
  const deleteBill = async () => {
    if (confirmText !== "DELETE") return;

    await supabase.from("sell_bills").delete().eq("id", deleteId);

    setDeleteId(null);
    setConfirmText("");
    fetchBills();
  };

  // ---------- DOWNLOAD ----------
  const downloadBill = (bill) => {
    const w = window.open("", "_blank");
    w.document.write(`
      <h2>Bill #${bill.bill_number}</h2>
      <p>Customer: ${bill.customer}</p>
      <p>Contact: ${bill.contact}</p>
      <p>Description: ${bill.description}</p>
      <hr/>
      ${bill.items
        ?.map(
          (i) =>
            `<p>Item: ${i.metal} (Rate: ${i.rate}₹/g) Weight: ${i.weight}g Total: ₹${i.amount}</p>`
        )
        .join("")}
      <hr/>
      <p>Amount: ₹${bill.total}</p>
      <p>GST: ₹${bill.gst}</p>
      <p>Total: ₹${(bill.total + bill.gst).toFixed(2)}</p>
      
    `);
    w.document.close();
  };

  // ---------- UI ----------
  return (
    <>
     <Navbar />
    <div className="p-4 md:p-6 max-w-4xl mx-auto flex flex-col gap-6">

      {/* CREATE BILL */}
      <div className="border p-4 rounded shadow bg-white">
        <h2 className="text-lg font-bold mb-3">Create Sell Bill</h2>

        <input
          className="border p-2 w-full mb-2"
          placeholder="Customer Name"
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
        />

        <input
          className="border p-2 w-full mb-3"
          placeholder="Mobile / Contact"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
        />

         <input
          className="border p-2 w-full mb-3"
          placeholder="Description (Optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {items.map((item, i) => (
          <div key={i} className="border p-3 mb-3 rounded bg-gray-50">
            <div className="grid grid-cols-3 gap-2">
              <input
              required
                className="border p-2"
                placeholder="Item Name"
                value={item.metal}
                onChange={(e) => updateItem(i, "metal", e.target.value)}
              />
              <input
                required
                className="border p-2"
                placeholder="Rate"
                type="number"
                value={item.rate || ""}
                onChange={(e) => updateItem(i, "rate", Number(e.target.value))}
              />
              <input
              required
                className="border p-2"
                placeholder="Weight"
                type="number"
                value={item.weight || ""}
                onChange={(e) => updateItem(i, "weight", Number(e.target.value))}
              />
            </div>

            <div className="flex justify-between mt-2">
              <p>₹{item.amount || 0}</p>
              <button
                className="text-red-600"
                onClick={() => removeItem(i)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        <div className="border p-3 rounded bg-gray-100 mb-3">
          <p>Total ₹{total}</p>
          <p>GST ₹{gst.toFixed(2)}</p>
        </div>

        <button
          onClick={addItem}
          className="bg-green-600 text-white px-6 py-3 rounded w-full mb-3"
        >
          + Add Item
        </button>

        <button
          onClick={saveBill}
          className="bg-green-600 text-white px-6 py-3 rounded w-full"
        >
          Save Bill
        </button>
      </div>

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
          {[2026, 2027,2028,2029].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <input
          placeholder="Search Bill No"
          className="border p-2 ml-auto"
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* BILL LIST */}
      {bills.map((bill) => (
        <div key={bill.id} className="border p-4 rounded shadow bg-white">
          <div
            className="flex justify-between cursor-pointer"
            onClick={() =>
              setExpandedId(expandedId === bill.id ? null : bill.id)
            }
          >
            <div>
              <p className="font-bold">
                BILL-{String(bill.bill_number).padStart(4, "0")}
              </p>
              <p>{formatIST(bill.created_at)}</p>
            </div>
            <p>Amount: ₹{bill.total}</p>
            <p>GST: ₹{bill.gst}</p>
          </div>

          {expandedId === bill.id && (
            <div className="mt-3 border-t pt-3">
              {bill.items?.map((it, idx) => (
                <p key={idx}>
                  {it.metal} — {it.weight}g — ₹{it.amount}
                </p>
              ))}

              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => downloadBill(bill)}
                  className="bg-black text-white px-4 py-2 rounded"
                >
                  Download
                </button>

                <button
                  onClick={() => setDeleteId(bill.id)}
                  className="bg-red-600 text-white px-4 py-2 rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

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
              onClick={deleteBill}
            >
              Confirm Delete
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
