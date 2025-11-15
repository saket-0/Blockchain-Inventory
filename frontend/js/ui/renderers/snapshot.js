// frontend/js/ui/renderers/snapshot.js
import { inventory } from '../../app-state.js';

export const renderSnapshotView = (snapshotData) => {
    const appContent = document.getElementById('app-content');
    if (!appContent) return;
    
    const { kpis, inventory: snapshotInventory, snapshotTime } = snapshotData;

    appContent.querySelector('#snapshot-time-display').textContent = new Date(snapshotTime).toLocaleString();
    // vvv MODIFIED THIS LINE vvv
    appContent.querySelector('#kpi-snapshot-total-value').textContent = `₹${kpis.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    // ^^^ END MODIFICATION ^^^
    appContent.querySelector('#kpi-snapshot-total-units').textContent = kpis.totalUnits;
    appContent.querySelector('#kpi-snapshot-transactions').textContent = kpis.transactionCount;

    const productGrid = appContent.querySelector('#snapshot-product-grid');
    productGrid.innerHTML = '';

    const inventoryMap = new Map(snapshotInventory.reverse());
    
    if (inventoryMap.size === 0) {
        productGrid.innerHTML = `<p class="text-slate-500 lg:col-span-4">No products existed in the system at this time.</p>`;
        return;
    }

    inventoryMap.forEach((product, productId) => {
        if (product.is_deleted) return;

        const productCard = document.createElement('div');
        productCard.className = 'product-card'; 

        const locationsMap = new Map(product.locations);
        let totalStock = 0;
        locationsMap.forEach(qty => totalStock += qty);

        const imageUrl = product.imageUrl || '';

        productCard.innerHTML = `
            ${imageUrl ? 
                `<img src="${imageUrl}" alt="${product.productName}" class="product-card-image" onerror="this.style.display='none'; this.parentElement.querySelector('.product-card-placeholder').style.display='flex';">` : 
                ``
            }
            <div class="product-card-placeholder" style="${imageUrl ? 'display: none;' : 'display: flex;'}">
                <i class="ph-bold ph-package"></i>
            </div>
            
            <div class="product-card-content">
                <div class="flex-1">
                    <p class="text-xs font-medium text-indigo-600 mb-1">${product.category || 'Uncategorized'}</p>
                    <h3 class="font-semibold text-base text-slate-800 truncate" title="${product.productName}">${product.productName}</h3>
                    <p class="text-xs text-slate-500 mb-2">${productId}</p>
                </div>
                
                <div class="flex justify-between items-center text-sm font-semibold mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span class="text-slate-600">Price (at time):</span>
                    <span>₹${(product.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                <div class="flex justify-between items-center text-sm font-semibold mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span class="text-slate-600">Total Stock (at time):</span>
                    <span>${totalStock} units</span>
                </div>
            </div>
        `;
        productGrid.appendChild(productCard);
    });
};