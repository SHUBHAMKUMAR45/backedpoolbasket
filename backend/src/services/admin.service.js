import Order from '../models/Order.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import { PAGINATION } from '../utils/constants.js';

export const getOverview = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  // Stats aggregation (Parallel Promises)
  const [
    totalOrders,
    revenueTodayResult,
    newCustomersToday,
    activeProducts,
    pendingOrders,
    revenueChartRaw,
    categoryBreakdown,
    recentActivity
  ] = await Promise.all([
    Order.countDocuments(),
    Order.aggregate([
      { $match: { createdAt: { $gte: today }, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$pricing.total' } } }
    ]),
    User.countDocuments({ role: 'user', createdAt: { $gte: today } }),
    Product.countDocuments({ isActive: true }),
    Order.countDocuments({ status: 'pending' }),
    Order.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo }, status: { $nin: ['cancelled', 'refunded'] } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$pricing.total' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]),
    Order.aggregate([
      { $match: { status: { $nin: ['cancelled', 'refunded'] } } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $lookup: {
          from: 'categories',
          localField: 'product.category',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: '$category' },
      {
        $group: {
          _id: '$category.name',
          value: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      }
    ]),
    Order.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'name email')
      .lean()
  ]);

  const revenueToday = revenueTodayResult[0]?.total || 0;

  // Format revenue chart (Fill in missing dates with 0 value)
  const revenueChart = [];
  const dateMap = new Map(revenueChartRaw.map((item) => [item._id, item]));

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const val = dateMap.get(dateStr);
    revenueChart.push({
      date: dateStr,
      revenue: val ? val.revenue : 0,
      orders: val ? val.orders : 0
    });
  }

  return {
    stats: {
      totalOrders,
      revenueToday,
      newCustomersToday,
      activeProducts,
      pendingOrders
    },
    revenueChart,
    categoryBreakdown: categoryBreakdown.map((c) => ({ name: c._id, value: c.value })),
    recentActivity
  };
};

export const getAnalytics = async ({ period }) => {
  const now = new Date();
  let startDate;

  if (period === 'weekly') {
    startDate = new Date(now.setDate(now.getDate() - 7));
  } else if (period === 'yearly') {
    startDate = new Date(now.setFullYear(now.getFullYear() - 1));
  } else {
    // default to monthly (30 days)
    startDate = new Date(now.setDate(now.getDate() - 30));
  }
  startDate.setHours(0, 0, 0, 0);

  // Match orders inside window
  const matchFilter = { createdAt: { $gte: startDate }, status: { $nin: ['cancelled', 'refunded'] } };

  const [
    monthlyRevenueRaw,
    categorySalesRaw,
    topProductsRaw,
    metricsAgg,
    customerStats
  ] = await Promise.all([
    // Revenue grouped by year-month
    Order.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          revenue: { $sum: '$pricing.total' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]),
    // Category sales totals
    Order.aggregate([
      { $match: matchFilter },
      { $unwind: '$items' },
      { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $lookup: { from: 'categories', localField: 'product.category', foreignField: '_id', as: 'category' } },
      { $unwind: '$category' },
      {
        $group: {
          _id: '$category.name',
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          quantity: { $sum: '$items.quantity' }
        }
      }
    ]),
    // Top 5 products
    Order.aggregate([
      { $match: matchFilter },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          unitsSold: { $sum: '$items.quantity' },
          totalSales: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { unitsSold: -1 } },
      { $limit: 5 }
    ]),
    // Profit Metrics
    Order.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$pricing.total' },
          orderCount: { $sum: 1 }
        }
      }
    ]),
    // Customer Repeat statistics
    Order.aggregate([
      { $match: { status: { $nin: ['cancelled', 'refunded'] } } },
      { $group: { _id: '$user', count: { $sum: 1 } } }
    ])
  ]);

  // Compute metrics
  const monthlyProfit = metricsAgg[0]?.totalRevenue || 0;
  const avgOrderValue = metricsAgg[0]?.orderCount
    ? Math.round(monthlyProfit / metricsAgg[0].orderCount)
    : 0;

  // Calculate repeat customer percentage
  const totalCustomers = customerStats.length;
  const repeatCustomersCount = customerStats.filter((c) => c.count > 1).length;
  const repeatCustomers = totalCustomers > 0 ? Math.round((repeatCustomersCount / totalCustomers) * 100) : 0;

  return {
    metrics: {
      monthlyProfit,
      avgOrderValue,
      repeatCustomers
    },
    monthlyRevenue: monthlyRevenueRaw.map((item) => ({ month: item._id, revenue: item.revenue })),
    categorySales: categorySalesRaw.map((item) => ({ category: item._id, revenue: item.revenue, units: item.quantity })),
    topProducts: topProductsRaw.map((item) => ({ name: item._id, units: item.unitsSold, sales: item.totalSales }))
  };
};

export const getCustomers = async (query) => {
  const page = parseInt(query.page || 1, 10);
  const limit = parseInt(query.limit || PAGINATION.DEFAULT_LIMIT, 10);
  const { search } = query;

  const userFilter = { role: 'user' };

  if (search) {
    userFilter.$or = [
      { name: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
      { phone: new RegExp(search, 'i') }
    ];
  }

  const skip = (page - 1) * limit;
  const total = await User.countDocuments(userFilter);
  const users = await User.find(userFilter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();

  const userIds = users.map((u) => u._id);

  // Group user purchases via Aggregation
  const orderStats = await Order.aggregate([
    { $match: { user: { $in: userIds }, status: { $nin: ['cancelled', 'refunded'] } } },
    {
      $group: {
        _id: '$user',
        totalOrders: { $sum: 1 },
        totalSpent: { $sum: '$pricing.total' }
      }
    }
  ]);

  const statsMap = new Map(orderStats.map((item) => [item._id.toString(), item]));

  const customers = users.map((u) => {
    const stats = statsMap.get(u._id.toString());
    return {
      ...u,
      totalOrders: stats ? stats.totalOrders : 0,
      totalSpent: stats ? stats.totalSpent : 0
    };
  });

  const pages = Math.ceil(total / limit);

  return {
    customers,
    pagination: {
      page,
      limit,
      total,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1
    }
  };
};

export const getInventory = async () => {
  const products = await Product.find({ isActive: true })
    .select('name stock sku category')
    .populate('category', 'name')
    .lean();

  const outOfStock = [];
  const lowStock = [];
  const inStock = [];

  products.forEach((p) => {
    if (p.stock === 0) {
      outOfStock.push(p);
    } else if (p.stock <= 10) {
      lowStock.push(p);
    } else {
      inStock.push(p);
    }
  });

  return {
    inventory: {
      inStockCount: inStock.length,
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length
    },
    alerts: {
      outOfStock,
      lowStock
    }
  };
};
