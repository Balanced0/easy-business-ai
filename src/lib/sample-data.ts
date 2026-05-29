export const salesTrend = [
  { month: "Jan", sales: 12400, orders: 240 },
  { month: "Feb", sales: 13800, orders: 268 },
  { month: "Mar", sales: 15200, orders: 295 },
  { month: "Apr", sales: 14100, orders: 281 },
  { month: "May", sales: 16800, orders: 322 },
  { month: "Jun", sales: 19200, orders: 365 },
  { month: "Jul", sales: 21500, orders: 410 },
  { month: "Aug", sales: 20100, orders: 388 },
  { month: "Sep", sales: 22400, orders: 425 },
  { month: "Oct", sales: 24800, orders: 471 },
  { month: "Nov", sales: 27200, orders: 510 },
  { month: "Dec", sales: 31500, orders: 588 },
];

export const demandForecast = [
  { week: "W1", actual: 320, forecast: 310 },
  { week: "W2", actual: 360, forecast: 345 },
  { week: "W3", actual: 340, forecast: 355 },
  { week: "W4", actual: 410, forecast: 395 },
  { week: "W5", actual: null, forecast: 430 },
  { week: "W6", actual: null, forecast: 460 },
  { week: "W7", actual: null, forecast: 485 },
  { week: "W8", actual: null, forecast: 510 },
];

export const inventoryAlerts = [
  { sku: "TSH-204", name: "Cotton T-Shirt (Black, M)", stock: 8, status: "low", recommend: 120 },
  { sku: "SNK-501", name: "Runner Sneakers — Size 9", stock: 3, status: "low", recommend: 60 },
  { sku: "MUG-018", name: "Ceramic Mug 350ml", stock: 412, status: "overstock", recommend: 0 },
  { sku: "BAG-077", name: "Canvas Tote Bag", stock: 15, status: "low", recommend: 80 },
  { sku: "HDP-330", name: "Wireless Headphones", stock: 287, status: "overstock", recommend: 0 },
];

export const competitorPrices = [
  { product: "Cotton T-Shirt", you: 19.99, compA: 21.5, compB: 18.99, compC: 22.0, rating: 4.4 },
  { product: "Runner Sneakers", you: 79.0, compA: 85.0, compB: 74.99, compC: 89.0, rating: 4.6 },
  { product: "Canvas Tote Bag", you: 14.5, compA: 16.0, compB: 13.99, compC: 17.5, rating: 4.2 },
  { product: "Wireless Headphones", you: 59.99, compA: 64.99, compB: 55.0, compC: 69.0, rating: 4.1 },
  { product: "Ceramic Mug 350ml", you: 9.99, compA: 11.0, compB: 8.5, compC: 12.0, rating: 4.7 },
];

export const sentimentBreakdown = [
  { name: "ইতিবাচক / Positive", value: 64, color: "var(--color-chart-2)" },
  { name: "নিরপেক্ষ / Neutral", value: 22, color: "var(--color-chart-3)" },
  { name: "নেতিবাচক / Negative", value: 14, color: "var(--color-destructive)" },
];

export const positiveTrends = [
  "সাম্প্রতিক রিভিউয়ের ৩৮% এ দ্রুত ডেলিভারির প্রশংসা / Fast shipping mentioned in 38% of recent reviews",
  "পোশাক ক্যাটাগরিতে পণ্যের মান প্রশংসিত / Product quality praised across apparel category",
  "কাস্টমার সাপোর্টের সাড়া ৪.৮/৫ রেটেড / Customer support response time rated 4.8/5",
];

export const complaints = [
  "Runner Sneakers এর সাইজ ছোট মনে হচ্ছে (১২ বার উল্লেখ) / Sizing runs small on Runner Sneakers (12 mentions)",
  "গ্লাসওয়্যার অর্ডারে প্যাকেজিং ক্ষতি (৮ বার উল্লেখ) / Packaging damage on glassware orders (8 mentions)",
  "গত সপ্তাহে EU অঞ্চলে ডেলিভারি বিলম্বিত (৬ বার উল্লেখ) / Delayed delivery in EU region last week (6 mentions)",
];

export const trendingProducts = [
  { name: "Runner Sneakers", growth: "+34%" },
  { name: "Canvas Tote Bag", growth: "+22%" },
  { name: "Cotton T-Shirt", growth: "+18%" },
  { name: "Ceramic Mug 350ml", growth: "+11%" },
];

export const summaryCards = [
  { label: "মোট বিক্রয় / Total Sales", value: "$248,920", delta: "+12.4%", positive: true },
  { label: "রাজস্ব / Revenue", value: "$182,540", delta: "+8.1%", positive: true },
  { label: "ইনভেন্টরি ঝুঁকি / Inventory Risk", value: "৭ items", delta: "৩ low · ৪ overstock", positive: false },
  { label: "ট্রেন্ডিং পণ্য / Trending Products", value: "১২", delta: "+৪ এই সপ্তাহে / +4 this week", positive: true },
];

export const aiSummary = `বিক্রয় মাসে ১২.৪% বৃদ্ধি পেয়েছে, প্রধানত Runner Sneakers (+৩৪%) এবং Canvas Tote Bag (+২২%) এর কারণে। ৩টি SKU সেফ স্টকের নিচে এবং ৭ দিনের মধ্যে স্টক আউট হতে পারে। Competitor B হেডফোনের দাম ৮% কমিয়েছে — শেয়ার রক্ষায় শর্ট-টার্ম প্রমো বিবেচনা করুন। গ্রাহক সন্তুষ্টি দৃঢ়ভাবে ইতিবাচক (৬৪%)। / Sales are up 12.4% MoM, driven primarily by Runner Sneakers (+34%) and Canvas Tote Bags (+22%). Inventory risk is moderate: 3 SKUs are below safe stock and likely to stock out within 7 days. Competitor B has reduced prices on headphones by 8% — consider a short-term promo to defend share. Customer sentiment remains strongly positive (64%), though sizing complaints on sneakers warrant a product page update.`;
