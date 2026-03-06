import { db } from './db.js';
import { formatCurrency } from './app.js';

export async function renderProductsTable() {
    const products = await db.getAll('products');
    const tbody = document.getElementById('products-table-body');
    tbody.innerHTML = '';

    products.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td data-label="الصورة"><img src="${p.image || 'https://via.placeholder.com/40'}" alt="img"></td>
            <td data-label="الاسم">${p.name}</td>
            <td data-label="الباركود">${p.barcode}</td>
            <td data-label="الفئة">${p.category}</td>
            <td data-label="السعر">${formatCurrency(p.price)}</td>
            <td data-label="المخزون">${p.stock}</td>
            <td data-label="إجراءات">
                <button class="btn-icon-small edit-btn" data-id="${p.id}"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-icon-small delete-btn" data-id="${p.id}"><i class="fa-solid fa-trash text-danger"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Attach Listeners
    tbody.querySelectorAll('.edit-btn').forEach(b => {
        b.onclick = () => openProductModal(parseInt(b.dataset.id));
    });
    tbody.querySelectorAll('.delete-btn').forEach(b => {
        b.onclick = () => deleteProduct(parseInt(b.dataset.id));
    });
}

// Add/Edit Logic
const modal = document.getElementById('product-modal');
const form = document.getElementById('product-form');

const addProductBtn = document.getElementById('add-product-btn');
if (addProductBtn) {
    addProductBtn.addEventListener('click', () => {
        openProductModal();
    });
}

const generateBarcodeBtn = document.getElementById('generate-barcode');
if (generateBarcodeBtn) {
    generateBarcodeBtn.addEventListener('click', () => {
        const barcodeInput = document.getElementById('prod-barcode');
        if (barcodeInput) {
            barcodeInput.value = Math.floor(Math.random() * 1000000000000).toString();
        }
    });
}

function openProductModal(id = null) {
    if (!form || !modal) return;
    
    form.reset();
    const prodIdInput = document.getElementById('prod-id');
    if (prodIdInput) prodIdInput.value = '';
    
    const modalTitle = document.getElementById('product-modal-title');
    if (modalTitle) modalTitle.textContent = 'إضافة منتج جديد';

    if (id) {
        db.get('products', id).then(p => {
            if (prodIdInput) prodIdInput.value = p.id;
            const nameInput = document.getElementById('prod-name');
            if (nameInput) nameInput.value = p.name;
            const barcodeInput = document.getElementById('prod-barcode');
            if (barcodeInput) barcodeInput.value = p.barcode;
            const categoryInput = document.getElementById('prod-category');
            if (categoryInput) categoryInput.value = p.category;
            const priceInput = document.getElementById('prod-price');
            if (priceInput) priceInput.value = p.price;
            const costInput = document.getElementById('prod-cost');
            if (costInput) costInput.value = p.cost;
            const stockInput = document.getElementById('prod-stock');
            if (stockInput) stockInput.value = p.stock;
            const minStockInput = document.getElementById('prod-min-stock');
            if (minStockInput) minStockInput.value = p.minStock;
            const imageInput = document.getElementById('prod-image');
            if (imageInput) imageInput.value = p.image || '';
            
            if (modalTitle) modalTitle.textContent = 'تعديل منتج';
        });
    }
    
    modal.classList.add('open');
}

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const idInput = document.getElementById('prod-id');
        const id = idInput ? idInput.value : null;
        
        const product = {
            name: document.getElementById('prod-name').value,
            barcode: document.getElementById('prod-barcode').value,
            category: document.getElementById('prod-category').value,
            price: parseFloat(document.getElementById('prod-price').value),
            cost: parseFloat(document.getElementById('prod-cost').value),
            stock: parseInt(document.getElementById('prod-stock').value),
            minStock: parseInt(document.getElementById('prod-min-stock').value),
            image: document.getElementById('prod-image').value
        };
    
        try {
            if (id) {
                product.id = parseInt(id);
                await db.update('products', product);
            } else {
                await db.add('products', product);
            }
            
            if (modal) modal.classList.remove('open');
            renderProductsTable();
            alert('تم الحفظ بنجاح');
        } catch (err) {
            alert('خطأ: قد يكون الباركود مكرر');
            console.error(err);
        }
    });
}

async function deleteProduct(id) {
    if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
        await db.delete('products', id);
        renderProductsTable();
    }
}
