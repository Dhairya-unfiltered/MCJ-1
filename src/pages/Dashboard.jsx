import { useEffect, useState } from "react";
import supabase from "../services/supabase";
import Navbar from "../components/Navbar";
import { IndianRupee, ShoppingCart, TrendingDown, Calendar, ArrowUpRight, ArrowDownRight, Wallet } from "lucide-react";

// Utility to format currency
const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0, // No decimals for cleaner dashboard
    }).format(amount);
};

export default function Dashboard() {
    const today = new Date();
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    const [loading, setLoading] = useState(true);

    const [stats, setStats] = useState({
        sales: { count: 0, amount: 0, gst: 0, total: 0 },
        purchases: { count: 0, amount: 0, gst: 0, total: 0 },
        expenses: { count: 0, amount: 0, gst: 0, total: 0 },
    });

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
    ];
    const years = [2025, 2026, 2027, 2028, 2029, 2030];

    useEffect(() => {
        fetchDashboardData();
    }, [selectedMonth, selectedYear]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // 1. Calculate IST Date Range
            const IST_OFFSET_HOURS = 5.5;
            const startUTC = new Date(
                Date.UTC(selectedYear, selectedMonth, 1, 0, 0, 0) -
                IST_OFFSET_HOURS * 60 * 60 * 1000
            ).toISOString();

            const endUTC = new Date(
                Date.UTC(selectedYear, selectedMonth + 1, 1, 0, 0, 0) -
                IST_OFFSET_HOURS * 60 * 60 * 1000
            ).toISOString();

            // 2. Fetch Data in Parallel
            const [sellRes, purchaseRes, expenseRes] = await Promise.all([
                supabase.from("sell_bills").select("*").gte("created_at", startUTC).lt("created_at", endUTC),
                supabase.from("purchase_bills").select("*").gte("created_at", startUTC).lt("created_at", endUTC),
                supabase.from("expenses").select("*").gte("created_at", startUTC).lt("created_at", endUTC),
            ]);

            if (sellRes.error) throw sellRes.error;
            if (purchaseRes.error) throw purchaseRes.error;
            if (expenseRes.error) throw expenseRes.error;

            // 3. Aggregate Data

            // SELL STATS (DB 'total' is Grand Total)
            const sellData = sellRes.data || [];
            const sellGST = sellData.reduce((s, i) => s + (Number(i.gst) || 0), 0);
            const sellGrandTotal = sellData.reduce((s, i) => s + (Number(i.total) || 0), 0);
            const sellTaxable = sellGrandTotal - sellGST;

            // PURCHASE STATS (DB 'total' is Taxable Amount in Purchase, GST is separate)
            // Correction: In Purchase.jsx save logic: total = subtotal (taxable), gst = gstAmount.
            const purData = purchaseRes.data || [];
            const purTaxable = purData.reduce((s, i) => s + (Number(i.total) || 0), 0);
            const purGST = purData.reduce((s, i) => s + (Number(i.gst) || 0), 0);
            const purGrandTotal = purTaxable + purGST;

            // EXPENSE STATS
            const expData = expenseRes.data || [];
            const expTaxable = expData.reduce((s, i) => s + (Number(i.amount) || 0), 0);
            const expGST = expData.reduce((s, i) => s + (Number(i.gst) || 0), 0);
            const expGrandTotal = expTaxable + expGST;

            setStats({
                sales: { count: sellData.length, amount: sellTaxable, gst: sellGST, total: sellGrandTotal },
                purchases: { count: purData.length, amount: purTaxable, gst: purGST, total: purGrandTotal },
                expenses: { count: expData.length, amount: expTaxable, gst: expGST, total: expGrandTotal },
            });

        } catch (err) {
            console.error("Dashboard Fetch Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const Card = ({ title, data, colorClass, icon: Icon, mainColor }) => (
        <div className={`bg-white rounded-2xl shadow-sm hover:shadow-md transition-all p-6 border border-gray-100 group`}>
            <div className="flex justify-between items-start mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`p-1.5 rounded-lg ${colorClass} bg-opacity-10`}>
                            <Icon size={18} className={mainColor} />
                        </span>
                        <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">{title}</p>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-800 mt-2">{formatCurrency(data.total)}</h3>
                </div>
                <div className="text-right">
                    <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-full">
                        {data.count} Bills
                    </span>
                </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-gray-50">
                <div className="flex justify-between text-sm items-center">
                    <span className="text-gray-500 flex items-center gap-1">Taxable</span>
                    <span className="font-semibold text-gray-700">{formatCurrency(data.amount)}</span>
                </div>
                <div className="flex justify-between text-sm items-center">
                    <span className="text-gray-500 flex items-center gap-1">GST: </span>
                    <span className="font-semibold text-gray-700">{formatCurrency(data.gst)}</span>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <Navbar />
            <div className="min-h-screen bg-gray-50 pb-12">
                <div className="max-w-7xl mx-auto p-4 md:p-8">

                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
                            <p className="text-gray-500 mt-1">Financial summary for {months[selectedMonth]} {selectedYear}</p>
                        </div>

                        <div className="flex bg-white p-1.5 rounded-xl shadow-sm border border-gray-200">
                            <div className="relative group">
                                <select
                                    className="appearance-none bg-transparent pl-4 pr-8 py-2 text-gray-700 font-bold cursor-pointer outline-none focus:text-yellow-600 transition"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                >
                                    {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                                </select>
                                <Calendar size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                            <div className="w-px bg-gray-200 my-1"></div>
                            <div className="relative group">
                                <select
                                    className="appearance-none bg-transparent pl-4 pr-8 py-2 text-gray-700 font-bold cursor-pointer outline-none focus:text-yellow-600 transition"
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                                >
                                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                                </select>
                                <Calendar size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-32">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
                            <p className="text-gray-500 text-sm font-medium">Crunching numbers...</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* CARDS GRID */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Card
                                    title="Sales"
                                    data={stats.sales}
                                    colorClass="bg-yellow-50"
                                    mainColor="text-yellow-600"
                                    icon={IndianRupee}
                                />
                                <Card
                                    title="Purchases"
                                    data={stats.purchases}
                                    colorClass="bg-blue-50"
                                    mainColor="text-blue-600"
                                    icon={ShoppingCart}
                                />
                                <Card
                                    title="Expenses"
                                    data={stats.expenses}
                                    colorClass="bg-red-50"
                                    mainColor="text-red-500"
                                    icon={TrendingDown}
                                />
                            </div>

                            {/* NET SUMMARY */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                        <Wallet size={18} className="text-gray-500" /> Net Summary
                                    </h3>
                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Calculated</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                                    {/* Net GST */}
                                    <div className="p-6">
                                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Net GST Payable</p>
                                        <div className="flex items-baseline gap-2">
                                            <h4 className={`text-2xl font-bold ${stats.sales.gst - (stats.purchases.gst + stats.expenses.gst) >= 0 ? "text-red-600" : "text-green-600"}`}>
                                                {formatCurrency(stats.sales.gst - (stats.purchases.gst + stats.expenses.gst))}
                                            </h4>
                                            <span className="text-xs text-gray-400">(Collected - Paid)</span>
                                        </div>
                                    </div>

                                    {/* Sales Revenue */}
                                    <div className="p-6">
                                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Total Inflow</p>
                                        <div className="flex items-baseline gap-2">
                                            <h4 className="text-2xl font-bold text-gray-800">
                                                {formatCurrency(stats.sales.total)}
                                            </h4>
                                            <ArrowUpRight size={16} className="text-green-500" />
                                        </div>
                                    </div>

                                    {/* Outflow */}
                                    <div className="p-6">
                                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Total Outflow</p>
                                        <div className="flex items-baseline gap-2">
                                            <h4 className="text-2xl font-bold text-gray-800">
                                                {formatCurrency(stats.purchases.total + stats.expenses.total)}
                                            </h4>
                                            <ArrowDownRight size={16} className="text-red-500" />
                                        </div>
                                    </div>

                                    {/* Net Profit */}
                                    <div className="p-6 bg-yellow-50/50">
                                        <p className="text-xs text-yellow-800 uppercase font-bold tracking-wider mb-2">Net Cash Flow</p>
                                        <div className="flex items-baseline gap-2">
                                            <h4 className={`text-2xl font-bold ${stats.sales.total - (stats.purchases.total + stats.expenses.total) >= 0 ? "text-green-600" : "text-red-500"}`}>
                                                {formatCurrency(stats.sales.total - (stats.purchases.total + stats.expenses.total))}
                                            </h4>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
