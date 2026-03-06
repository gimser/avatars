import { db } from './db.js';
import { formatCurrency } from './app.js';

export async function renderSalesTable() {
    const sales = await db.getAll('sales');
    const tbody = document.getElementById('sales-table-body');
    tbody.innerHTML = '';

    // Sort by date desc
    sales.sort((a, b) => new Date(b.date) - new Date(a.date));

    sales.forEach(s => {
        const tr = document.createElement('tr');
        const date = new Date(s.date).toLocaleString('ar-SA');
        
        tr.innerHTML = `
            <td data-label="رقم الفاتورة">#${s.id}</td>
            <td data-label="التاريخ">${date}</td>
            <td data-label="عدد العناصر">${s.items.length}</td>
            <td data-label="الإجمالي">${formatCurrency(s.total)}</td>
            <td data-label="طريقة الدفع">${s.paymentMethod === 'cash' ? 'نقداً' : 'بطاقة'}</td>
            <td data-label="إجراءات">
                <button class="btn-icon-small print-btn" data-id="${s.id}"><i class="fa-solid fa-print"></i></button>
                <button class="btn-icon-small view-btn" data-id="${s.id}"><i class="fa-solid fa-eye"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    // Listeners
    tbody.querySelectorAll('.print-btn').forEach(b => {
        b.onclick = () => printInvoice(parseInt(b.dataset.id));
    });
}

async function printInvoice(id) {
    const sale = await db.get('sales', id);
    if (!sale) return;

    // Generate PDF using jsPDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 200] // Thermal paper size approx
    });

    // Add Arabic font support (simplified here, ideally load font base64)
    // For this demo, we assume standard font or English for simplicity if Arabic fails in standard jsPDF without custom font
    // But we will try to use a font that supports it or just standard text
    
    doc.setFontSize(12);
    doc.text('Smart POS', 40, 10, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Invoice #${sale.id}`, 40, 20, { align: 'center' });
    doc.text(new Date(sale.date).toLocaleDateString(), 40, 25, { align: 'center' });
    
    let y = 35;
    doc.setFontSize(8);
    sale.items.forEach(item => {
        doc.text(`${item.name} x${item.qty}`, 5, y);
        doc.text(`${item.price * item.qty}`, 75, y, { align: 'right' });
        y += 5;
    });
    
    doc.line(5, y, 75, y);
    y += 5;
    
    doc.setFontSize(10);
    doc.text(`Total: ${sale.total}`, 75, y, { align: 'right' });
    
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
}
