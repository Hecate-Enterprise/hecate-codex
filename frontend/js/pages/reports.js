// Reports Page - Depreciation Reports

import { api } from '../api.js';
import { openModal, closeModal } from '../components/modal.js';
import { showSuccess, showError } from '../components/toast.js';
import { formatDate, formatCurrency, createLoadingSpinner, getDepreciationMethodLabel } from '../utils.js';

let assets = [];

const Reports = {
    async init(container) {
        container.innerHTML = createLoadingSpinner();

        try {
            const [assetsRes, report] = await Promise.all([
                api.getAssets({ page: 1, page_size: 100 }),
                api.getDepreciationReport()
            ]);

            assets = assetsRes.items || [];

            this.render(container, report);
            this.bindEvents(container);
        } catch (error) {
            console.error('Error loading reports:', error);
            showError('Failed to load reports');
            container.innerHTML = `
                <div class="text-center py-12">
                    <p class="text-red-600">Failed to load reports</p>
                    <button class="btn btn-primary mt-4" onclick="location.reload()">Retry</button>
                </div>
            `;
        }
    },

    render(container, report) {
        // Calculate summary
        const totalPurchaseValue = report.reduce((sum, r) => sum + (r.purchase_price || 0), 0);
        const totalCurrentValue = report.reduce((sum, r) => sum + (r.current_value || 0), 0);
        const totalAccumulatedDepreciation = report.reduce((sum, r) => sum + (r.accumulated_depreciation || 0), 0);

        container.innerHTML = `
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h1 class="text-2xl font-bold text-gray-800">Reports</h1>
                    <p class="text-gray-600">Asset depreciation and financial reports</p>
                </div>
            </div>

            <!-- Summary Cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div class="card">
                    <p class="text-sm text-gray-600">Total Purchase Value</p>
                    <p class="text-2xl font-bold text-gray-800">${formatCurrency(totalPurchaseValue)}</p>
                </div>
                <div class="card">
                    <p class="text-sm text-gray-600">Total Current Value</p>
                    <p class="text-2xl font-bold text-green-600">${formatCurrency(totalCurrentValue)}</p>
                </div>
                <div class="card">
                    <p class="text-sm text-gray-600">Total Depreciation</p>
                    <p class="text-2xl font-bold text-red-600">${formatCurrency(totalAccumulatedDepreciation)}</p>
                </div>
            </div>

            <!-- Calculate Depreciation -->
            <div class="card mb-6">
                <h2 class="text-lg font-semibold text-gray-800 mb-4">Calculate Depreciation</h2>
                <div class="flex gap-4 items-end flex-wrap">
                    <div class="flex-1 min-w-[200px]">
                        <label class="form-label">Select Asset</label>
                        <select id="calc-asset" class="form-input">
                            <option value="">Choose an asset...</option>
                            ${assets.map(a => `<option value="${a.id}">${a.name} (${a.asset_tag})</option>`).join('')}
                        </select>
                    </div>
                    <div class="w-[200px]">
                        <label class="form-label">Period End Date</label>
                        <input type="date" id="calc-date" class="form-input" value="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <button id="calculate-btn" class="btn btn-primary" disabled>Calculate</button>
                </div>
                <div id="calc-result" class="mt-4 hidden"></div>
            </div>

            <!-- Depreciation Report Table -->
            <div class="card">
                <h2 class="text-lg font-semibold text-gray-800 mb-4">Depreciation Report</h2>
                ${report.length > 0 ? `
                    <div class="overflow-x-auto">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Asset</th>
                                    <th>Category</th>
                                    <th>Method</th>
                                    <th class="text-right">Purchase Price</th>
                                    <th class="text-right">Current Value</th>
                                    <th class="text-right">Accumulated Depreciation</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${report.map(item => `
                                    <tr>
                                        <td>
                                            <div>
                                                <p class="font-medium">${item.asset_name}</p>
                                                <p class="text-xs text-gray-500">${item.asset_tag}</p>
                                            </div>
                                        </td>
                                        <td>${item.category_name || '-'}</td>
                                        <td>
                                            <span class="text-sm">${getDepreciationMethodLabel(item.depreciation_method)}</span>
                                        </td>
                                        <td class="text-right">${formatCurrency(item.purchase_price)}</td>
                                        <td class="text-right text-green-600">${formatCurrency(item.current_value)}</td>
                                        <td class="text-right text-red-600">${formatCurrency(item.accumulated_depreciation)}</td>
                                        <td>
                                            <button class="btn btn-secondary btn-sm view-history-btn" data-id="${item.asset_id}">
                                                History
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : `
                    <p class="text-gray-500 text-center py-8">No depreciation data available. Add assets with categories that have depreciation settings.</p>
                `}
            </div>
        `;
    },

    bindEvents(container) {
        const assetSelect = container.querySelector('#calc-asset');
        const calculateBtn = container.querySelector('#calculate-btn');

        assetSelect.addEventListener('change', () => {
            calculateBtn.disabled = !assetSelect.value;
        });

        calculateBtn.addEventListener('click', async () => {
            await this.calculateDepreciation(container);
        });

        container.addEventListener('click', async (e) => {
            if (e.target.closest('.view-history-btn')) {
                const assetId = parseInt(e.target.closest('.view-history-btn').dataset.id);
                await this.viewDepreciationHistory(assetId);
            }
        });
    },

    async calculateDepreciation(container) {
        const assetId = parseInt(container.querySelector('#calc-asset').value);
        const periodEnd = container.querySelector('#calc-date').value;
        const resultDiv = container.querySelector('#calc-result');

        if (!assetId || !periodEnd) {
            showError('Please select an asset and period end date');
            return;
        }

        resultDiv.innerHTML = createLoadingSpinner();
        resultDiv.classList.remove('hidden');

        try {
            const result = await api.calculateDepreciation(assetId, periodEnd);

            if (result) {
                resultDiv.innerHTML = `
                    <div class="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <h4 class="font-medium text-green-800 mb-2">Depreciation Calculated</h4>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <p class="text-gray-600">Period</p>
                                <p class="font-medium">${formatDate(result.period_start)} - ${formatDate(result.period_end)}</p>
                            </div>
                            <div>
                                <p class="text-gray-600">Depreciation Amount</p>
                                <p class="font-medium text-red-600">${formatCurrency(result.depreciation_amount)}</p>
                            </div>
                            <div>
                                <p class="text-gray-600">Accumulated Depreciation</p>
                                <p class="font-medium">${formatCurrency(result.accumulated_depreciation)}</p>
                            </div>
                            <div>
                                <p class="text-gray-600">Book Value</p>
                                <p class="font-medium text-green-600">${formatCurrency(result.book_value)}</p>
                            </div>
                        </div>
                    </div>
                `;
                showSuccess('Depreciation calculated and recorded');
            } else {
                resultDiv.innerHTML = `
                    <div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p class="text-yellow-800">No depreciation calculated. The asset may be fully depreciated or have no depreciation settings.</p>
                    </div>
                `;
            }
        } catch (error) {
            resultDiv.innerHTML = `
                <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p class="text-red-800">${error.message || 'Failed to calculate depreciation'}</p>
                </div>
            `;
        }
    },

    async viewDepreciationHistory(assetId) {
        const asset = assets.find(a => a.id === assetId);

        try {
            const history = await api.getDepreciationHistory(assetId);

            const content = history.length > 0 ? `
                <div class="overflow-x-auto">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Period</th>
                                <th class="text-right">Depreciation</th>
                                <th class="text-right">Accumulated</th>
                                <th class="text-right">Book Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${history.map(entry => `
                                <tr>
                                    <td>${formatDate(entry.period_start)} - ${formatDate(entry.period_end)}</td>
                                    <td class="text-right text-red-600">${formatCurrency(entry.depreciation_amount)}</td>
                                    <td class="text-right">${formatCurrency(entry.accumulated_depreciation)}</td>
                                    <td class="text-right text-green-600">${formatCurrency(entry.book_value)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : `
                <p class="text-gray-500 text-center py-8">No depreciation history for this asset.</p>
            `;

            openModal(`Depreciation History: ${asset?.name || 'Asset'}`, content + `
                <div class="flex justify-end mt-4">
                    <button class="btn btn-secondary" id="close-btn">Close</button>
                </div>
            `, { size: 'lg' });

            document.getElementById('close-btn').addEventListener('click', closeModal);

        } catch (error) {
            showError('Failed to load depreciation history');
        }
    },

    destroy() {
        assets = [];
    }
};

export default Reports;
