/**
 * Financial Utility Helpers
 * Standardizes all currency math to 2 decimal places to avoid floating point errors.
 * Uses the "Scale and Round" strategy: x * 100 -> round -> / 100
 */

// Format to Indian Currency (e.g., ₹ 1,20,500.50)
export const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
    }).format(amount || 0);
};

// Safe Addition: (a + b)
export const safeAdd = (a, b) => {
    const secureA = Number(a) || 0;
    const secureB = Number(b) || 0;
    const result = secureA + secureB;
    return Math.round((result + Number.EPSILON) * 100) / 100;
};

// Safe Subtraction: (a - b)
export const safeSubtract = (a, b) => {
    const secureA = Number(a) || 0;
    const secureB = Number(b) || 0;
    const result = secureA - secureB;
    return Math.round((result + Number.EPSILON) * 100) / 100;
}

// Safe Multiplication: (a * b) - useful for Rate * Weight
export const safeMultiply = (a, b) => {
    const secureA = Number(a) || 0;
    const secureB = Number(b) || 0;
    const result = secureA * secureB;
    return Math.round((result + Number.EPSILON) * 100) / 100;
};

// Safe Rounding (Just cleans up a number to 2 decimals)
export const safeRound = (num) => {
    const n = Number(num) || 0;
    return Math.round((n + Number.EPSILON) * 100) / 100;
};

// Calculate GST (3%)
export const calculateGST = (amount) => {
    const val = safeMultiply(amount, 0.03);
    return val;
}
