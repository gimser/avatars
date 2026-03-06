const DB_NAME = 'SmartPOS_DB';
const DB_VERSION = 1;

export const db = {
    db: null,

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Products Store
                if (!db.objectStoreNames.contains('products')) {
                    const productsStore = db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
                    productsStore.createIndex('barcode', 'barcode', { unique: true });
                    productsStore.createIndex('category', 'category', { unique: false });
                }

                // Sales Store
                if (!db.objectStoreNames.contains('sales')) {
                    const salesStore = db.createObjectStore('sales', { keyPath: 'id', autoIncrement: true });
                    salesStore.createIndex('date', 'date', { unique: false });
                }

                // Settings Store
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('DB Initialized');
                resolve(this.db);
            };

            request.onerror = (event) => {
                console.error('DB Error', event);
                reject(event);
            };
        });
    },

    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async get(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async add(storeName, item) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(item);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async update(storeName, item) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(item);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async delete(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async getByBarcode(barcode) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['products'], 'readonly');
            const store = transaction.objectStore('products');
            const index = store.index('barcode');
            const request = index.get(barcode);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // Seed dummy data if empty
    async seed() {
        const products = await this.getAll('products');
        if (products.length === 0) {
            const dummyProducts = [
                { name: 'كولا', barcode: '123456', price: 2.5, cost: 1.5, stock: 100, category: 'مشروبات', minStock: 10 },
                { name: 'ماء', barcode: '111111', price: 1.0, cost: 0.5, stock: 200, category: 'مشروبات', minStock: 20 },
                { name: 'شيبس', barcode: '222222', price: 5.0, cost: 3.0, stock: 50, category: 'مأكولات', minStock: 5 },
                { name: 'شاحن آيفون', barcode: '333333', price: 50.0, cost: 20.0, stock: 15, category: 'إلكترونيات', minStock: 3 },
            ];
            for (const p of dummyProducts) {
                await this.add('products', p);
            }
            
            // Default Settings
            await this.update('settings', { key: 'store_info', value: {
                name: 'متجر السعادة',
                address: 'الرياض - شارع الملك فهد',
                phone: '0555555555',
                taxRate: 15
            }});
        }
    }
};
