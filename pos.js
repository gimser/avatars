import { db } from './db.js';
import { formatCurrency, playSound } from './app.js';

let cart = [];
let products = [];
let currentCategory = 'all';

export async function initPOS() {
    // Initial Load
    await refreshPOS();
    renderCategories();

    // Event Listeners
    const searchInput = document.getElementById('pos-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterProducts(e.target.value);
        });
    }

    const scanBtn = document.getElementById('scan-btn');
    if (scanBtn) {
        scanBtn.addEventListener('click', () => {
            startScanner();
        });
    }

    const clearCartBtn = document.getElementById('clear-cart');
    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', () => {
            if (confirm('هل أنت متأكد من مسح السلة؟')) {
                clearCart();
            }
        });
    }

    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (cart.length === 0) {
                alert('السلة فارغة!');
                return;
            }
            openCheckoutModal();
        });
    }

    const confirmPaymentBtn = document.getElementById('confirm-payment');
    if (confirmPaymentBtn) {
        confirmPaymentBtn.addEventListener('click', () => {
            processPayment();
        });
    }

    // Mobile Cart Toggles
    const viewCartBtn = document.getElementById('view-cart-btn');
    if (viewCartBtn) {
        viewCartBtn.addEventListener('click', () => {
            const cartArea = document.getElementById('cart-area');
            if (cartArea) cartArea.classList.add('open');
        });
    }

    const closeCartBtn = document.getElementById('close-cart-btn');
    if (closeCartBtn) {
        closeCartBtn.addEventListener('click', () => {
            const cartArea = document.getElementById('cart-area');
            if (cartArea) cartArea.classList.remove('open');
        });
    }

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F1') {
            e.preventDefault();
            document.getElementById('pos-search').focus();
        }
        if (e.key === 'F2') {
            e.preventDefault();
            startScanner();
        }
        if (e.key === 'F4') {
            e.preventDefault();
            if (cart.length > 0) openCheckoutModal();
        }
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

export async function refreshPOS() {
    products = await db.getAll('products');
    renderProductsGrid();
}

export function renderProductsGrid() {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = '';

    const filtered = products.filter(p => {
        const matchCat = currentCategory === 'all' || p.category === currentCategory;
        const search = document.getElementById('pos-search').value.toLowerCase();
        const matchSearch = p.name.toLowerCase().includes(search) || p.barcode.includes(search);
        return matchCat && matchSearch;
    });

    filtered.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.onclick = () => addToCart(p);
        
        const stockClass = p.stock <= p.minStock ? 'low' : '';
        const img = p.image || 'https://via.placeholder.com/150?text=' + encodeURIComponent(p.name);

        card.innerHTML = `
            <span class="stock-badge ${stockClass}">${p.stock}</span>
            <img src="${img}" alt="${p.name}" loading="lazy">
            <div class="product-info">
                <div class="product-name">${p.name}</div>
                <div class="product-price">${formatCurrency(p.price)}</div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function renderCategories() {
    const categories = [...new Set(products.map(p => p.category))];
    const container = document.getElementById('categories-filter');
    
    // Keep "All" button
    container.innerHTML = '<button class="cat-btn active" data-cat="all">الكل</button>';
    
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'cat-btn';
        btn.textContent = cat;
        btn.dataset.cat = cat;
        btn.onclick = () => {
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = cat;
            renderProductsGrid();
        };
        container.appendChild(btn);
    });
    
    // Re-attach "All" listener
    container.querySelector('[data-cat="all"]').onclick = function() {
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentCategory = 'all';
        renderProductsGrid();
    };
}

function filterProducts(query) {
    renderProductsGrid();
}

function addToCart(product) {
    if (product.stock <= 0) {
        playSound('error');
        alert('المنتج نفذ من المخزون!');
        return;
    }

    const existing = cart.find(item => item.id === product.id);
    if (existing) {
        if (existing.qty >= product.stock) {
            playSound('error');
            alert('لا توجد كمية كافية!');
            return;
        }
        existing.qty++;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    
    playSound('success');
    if (navigator.vibrate) navigator.vibrate(50);
    
    renderCart();
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    renderCart();
}

function updateQty(id, change) {
    const item = cart.find(i => i.id === id);
    if (!item) return;

    const newQty = item.qty + change;
    if (newQty > item.stock) {
        alert('الكمية غير متوفرة');
        return;
    }
    if (newQty <= 0) {
        removeFromCart(id);
    } else {
        item.qty = newQty;
        renderCart();
    }
}

function renderCart() {
    const container = document.getElementById('cart-items');
    container.innerHTML = '';

    if (cart.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <i class="fa-solid fa-basket-shopping"></i>
                <p>السلة فارغة</p>
            </div>`;
        updateTotals();
        return;
    }

    cart.forEach(item => {
        const el = document.createElement('div');
        el.className = 'cart-item';
        el.innerHTML = `
            <div class="item-details">
                <h4>${item.name}</h4>
                <div class="price">${formatCurrency(item.price)} x ${item.qty}</div>
            </div>
            <div class="item-controls">
                <button class="qty-btn minus" data-id="${item.id}">-</button>
                <span>${item.qty}</span>
                <button class="qty-btn plus" data-id="${item.id}">+</button>
                <button class="btn-text text-danger remove" data-id="${item.id}">&times;</button>
            </div>
        `;
        container.appendChild(el);
    });

    // Attach listeners
    container.querySelectorAll('.minus').forEach(b => b.onclick = () => updateQty(parseInt(b.dataset.id), -1));
    container.querySelectorAll('.plus').forEach(b => b.onclick = () => updateQty(parseInt(b.dataset.id), 1));
    container.querySelectorAll('.remove').forEach(b => b.onclick = () => removeFromCart(parseInt(b.dataset.id)));

    updateTotals();
}

function updateTotals() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const taxRate = 0.15; // Should come from settings
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    document.getElementById('subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('tax').textContent = formatCurrency(tax);
    document.getElementById('total').textContent = formatCurrency(total);
    document.getElementById('checkout-total').textContent = formatCurrency(total);

    // Update Mobile Bar
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    document.getElementById('mobile-cart-count').textContent = count;
    document.getElementById('mobile-cart-total').textContent = formatCurrency(total);
    
    // Toggle active class
    const mobileBar = document.getElementById('mobile-cart-bar');
    if (cart.length > 0) {
        mobileBar.classList.add('active');
    } else {
        mobileBar.classList.remove('active');
    }
}

function clearCart() {
    cart = [];
    renderCart();
    document.getElementById('cart-area').classList.remove('open');
}

// Checkout Logic
function openCheckoutModal() {
    const modal = document.getElementById('checkout-modal');
    modal.classList.add('open');
    document.getElementById('amount-paid').value = '';
    document.getElementById('change-amount').textContent = '0.00';
    document.getElementById('amount-paid').focus();
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('open'));
    if (scannerStream) {
        scannerStream.getTracks().forEach(track => track.stop());
        scannerStream = null;
    }
}

document.querySelectorAll('.close-modal, .close-modal-btn').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
});

// Payment Processing
async function processPayment() {
    const total = parseFloat(document.getElementById('total').textContent.replace(/[^\d.-]/g, ''));
    const paidInput = document.getElementById('amount-paid').value;
    const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
    
    let paid = parseFloat(paidInput);
    
    if (paymentMethod === 'cash') {
        if (isNaN(paid) || paid < total) {
            alert('المبلغ المدفوع غير كافي!');
            return;
        }
    } else {
        paid = total; // Card payment is exact
    }

    const change = paid - total;
    
    // Create Sale Record
    const sale = {
        date: new Date(),
        items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, cost: i.cost })),
        subtotal: cart.reduce((sum, i) => sum + (i.price * i.qty), 0),
        tax: total - (total / 1.15), // Approximate back-calc
        total: total,
        paymentMethod: paymentMethod,
        paid: paid,
        change: change,
        cashier: 'Default User' // Should come from auth
    };

    try {
        // Save Sale
        const saleId = await db.add('sales', sale);
        
        // Update Stock
        for (const item of cart) {
            const product = await db.get('products', item.id);
            product.stock -= item.qty;
            await db.update('products', product);
        }

        // Print Receipt
        printReceipt(sale, saleId);

        // Reset
        playSound('success');
        alert(`تمت العملية بنجاح! الباقي: ${formatCurrency(change)}`);
        cart = [];
        renderCart();
        closeAllModals();
        
        // Refresh products grid to show new stock
        products = await db.getAll('products');
        renderProductsGrid();

    } catch (err) {
        console.error(err);
        alert('حدث خطأ أثناء حفظ العملية');
    }
}

function printReceipt(sale, id) {
    // Simple window print for now, or jsPDF
    // For thermal printer, we usually generate a specific layout
    console.log('Printing receipt', id);
}

// Scanner Logic
let scannerStream = null;
async function startScanner() {
    const modal = document.getElementById('scanner-modal');
    modal.classList.add('open');
    
    const codeReader = new ZXing.BrowserMultiFormatReader();
    try {
        const videoInputDevices = await codeReader.listVideoInputDevices();
        const selectedDeviceId = videoInputDevices[0].deviceId;
        
        codeReader.decodeFromVideoDevice(selectedDeviceId, 'scanner-video', (result, err) => {
            if (result) {
                console.log(result);
                const barcode = result.text;
                const product = products.find(p => p.barcode === barcode);
                
                if (product) {
                    addToCart(product);
                    playSound('success');
                    closeAllModals();
                    codeReader.reset();
                } else {
                    playSound('error');
                    alert('منتج غير موجود');
                }
            }
        });
    } catch (err) {
        console.error(err);
        alert('لا يمكن الوصول للكاميرا');
    }
}
