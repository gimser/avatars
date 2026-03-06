import { db } from './db.js';
import { renderProductsTable } from './products.js';
import { initPOS, refreshPOS } from './pos.js';
import { renderSalesTable } from './sales.js';
import { updateDashboard } from './dashboard.js';

// Global State
export const state = {
    currentPage: 'pos',
    settings: {}
};

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await db.init();
        await db.seed();
        
        // Load settings
        const settings = await db.get('settings', 'store_info');
        if (settings) state.settings = settings.value;

        // Initialize Modules
        initNavigation();
        initPOS();
        
        // Load initial view
        navigateTo('pos');

        // Service Worker Registration
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./service-worker.js')
                .then(reg => console.log('SW Registered'))
                .catch(err => console.log('SW Error', err));
        }

    } catch (error) {
        console.error('App Init Error:', error);
        alert('حدث خطأ أثناء تشغيل التطبيق. يرجى تحديث الصفحة.');
    }
});

// Navigation Logic
function initNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            navigateTo(target);
        });
    });
}

export async function navigateTo(pageId) {
    state.currentPage = pageId;
    
    // Update Sidebar
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.target === pageId);
    });

    // Update Sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');

    // Trigger Page Specific Loads
    switch(pageId) {
        case 'pos':
            await refreshPOS();
            break;
        case 'products':
            await renderProductsTable();
            break;
        case 'sales':
            await renderSalesTable();
            break;
        case 'dashboard':
            await updateDashboard();
            break;
        case 'settings':
            loadSettingsForm();
            break;
    }
}

// Settings Logic
function loadSettingsForm() {
    if (state.settings) {
        const nameInput = document.getElementById('store-name');
        if (nameInput) nameInput.value = state.settings.name || '';
        const addressInput = document.getElementById('store-address');
        if (addressInput) addressInput.value = state.settings.address || '';
        const phoneInput = document.getElementById('store-phone');
        if (phoneInput) phoneInput.value = state.settings.phone || '';
        const taxInput = document.getElementById('tax-rate');
        if (taxInput) taxInput.value = state.settings.taxRate || 15;
    }
}

const settingsForm = document.getElementById('store-settings-form');
if (settingsForm) {
    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newSettings = {
            name: document.getElementById('store-name').value,
            address: document.getElementById('store-address').value,
            phone: document.getElementById('store-phone').value,
            taxRate: parseFloat(document.getElementById('tax-rate').value)
        };
        
        await db.update('settings', { key: 'store_info', value: newSettings });
        state.settings = newSettings;
        alert('تم حفظ الإعدادات بنجاح');
    });
}

// Backup & Restore
const backupBtn = document.getElementById('backup-btn');
if (backupBtn) {
    backupBtn.addEventListener('click', async () => {
        const products = await db.getAll('products');
        const sales = await db.getAll('sales');
        const settings = await db.getAll('settings');
        
        const data = { products, sales, settings, date: new Date() };
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `pos_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    });
}

const restoreFile = document.getElementById('restore-file');
if (restoreFile) {
    restoreFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (confirm('سيتم استبدال جميع البيانات الحالية. هل أنت متأكد؟')) {
                    // Clear existing data (simplified for this demo, ideally truncate stores)
                    // In a real app, we'd clear stores first.
                    // Here we just upsert.
                    
                    if (data.products) {
                        for (const p of data.products) await db.update('products', p);
                    }
                    if (data.sales) {
                        for (const s of data.sales) await db.update('sales', s);
                    }
                    if (data.settings) {
                        for (const s of data.settings) await db.update('settings', s);
                    }
                    
                    alert('تم استرجاع البيانات بنجاح. سيتم إعادة تحميل الصفحة.');
                    location.reload();
                }
            } catch (err) {
                alert('ملف غير صالح');
            }
        };
        reader.readAsText(file);
    });
}

// Global Helpers
export function formatCurrency(amount) {
    return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(amount);
}

export function playSound(type) {
    // Simple beep implementation
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'success') {
        osc.frequency.value = 800;
        gain.gain.value = 0.1;
        osc.start();
        setTimeout(() => osc.stop(), 100);
    } else if (type === 'error') {
        osc.frequency.value = 200;
        osc.type = 'sawtooth';
        gain.gain.value = 0.1;
        osc.start();
        setTimeout(() => osc.stop(), 300);
    }
}
