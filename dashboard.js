import { db } from './db.js';
import { formatCurrency } from './app.js';

let salesChart = null;
let topProductsChart = null;

export async function updateDashboard() {
    const sales = await db.getAll('sales');
    const products = await db.getAll('products');

    // Calculate Stats
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const todaySales = sales
        .filter(s => new Date(s.date) >= today)
        .reduce((sum, s) => sum + s.total, 0);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthSales = sales
        .filter(s => new Date(s.date) >= monthStart)
        .reduce((sum, s) => sum + s.total, 0);

    const lowStock = products.filter(p => p.stock <= p.minStock).length;

    // Update DOM
    document.getElementById('today-sales').textContent = formatCurrency(todaySales);
    document.getElementById('month-sales').textContent = formatCurrency(monthSales);
    document.getElementById('total-products-count').textContent = products.length;
    document.getElementById('low-stock-count').textContent = lowStock;

    renderCharts(sales);
}

function renderCharts(sales) {
    const ctx1 = document.getElementById('salesChart').getContext('2d');
    const ctx2 = document.getElementById('topProductsChart').getContext('2d');

    // Prepare Data for Sales Chart (Last 7 days)
    const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
    }).reverse();

    const salesData = last7Days.map(date => {
        return sales
            .filter(s => new Date(s.date).toISOString().split('T')[0] === date)
            .reduce((sum, s) => sum + s.total, 0);
    });

    if (salesChart) salesChart.destroy();
    salesChart = new Chart(ctx1, {
        type: 'line',
        data: {
            labels: last7Days,
            datasets: [{
                label: 'المبيعات',
                data: salesData,
                borderColor: '#3498db',
                tension: 0.4
            }]
        }
    });

    // Top Products
    const productSales = {};
    sales.forEach(s => {
        s.items.forEach(i => {
            productSales[i.name] = (productSales[i.name] || 0) + i.qty;
        });
    });

    const sortedProducts = Object.entries(productSales)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    if (topProductsChart) topProductsChart.destroy();
    topProductsChart = new Chart(ctx2, {
        type: 'doughnut',
        data: {
            labels: sortedProducts.map(p => p[0]),
            datasets: [{
                data: sortedProducts.map(p => p[1]),
                backgroundColor: ['#3498db', '#e74c3c', '#f1c40f', '#2ecc71', '#9b59b6']
            }]
        }
    });
}
