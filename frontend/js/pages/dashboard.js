// Dashboard Page

import { api } from '../api.js';
import { formatDate, formatCurrency, getStatusBadge, createLoadingSpinner } from '../utils.js';
import { showError } from '../components/toast.js';

const Dashboard = {
    async init(container) {
        container.innerHTML = createLoadingSpinner();

        try {
            const [assetsResponse, upcomingMaintenance] = await Promise.all([
                api.getAssets({ page: 1, page_size: 100 }),
                api.getUpcomingMaintenance(30)
            ]);

            const assets = assetsResponse.items || [];
            const maintenance = upcomingMaintenance || [];

            this.render(container, assets, maintenance);
        } catch (error) {
            console.error('Error loading dashboard:', error);
            showError('Failed to load dashboard data');
            container.innerHTML = `
                <div class="text-center py-12">
                    <p class="text-red-600">Failed to load dashboard: ${error.message}</p>
                    <button class="btn btn-primary mt-4" onclick="location.reload()">Retry</button>
                </div>
            `;
        }
    },

    render(container, assets, maintenance) {
        // Calculate stats
        const stats = {
            total: assets.length,
            available: assets.filter(a => a.status === 'available').length,
            assigned: assets.filter(a => a.status === 'assigned').length,
            inMaintenance: assets.filter(a => a.status === 'in_maintenance').length,
            retired: assets.filter(a => a.status === 'retired').length,
            totalValue: assets.reduce((sum, a) => sum + (a.current_value || 0), 0)
        };

        const recentAssets = assets.slice(0, 5);

        container.innerHTML = `
            <div class="mb-6">
                <h1 class="text-2xl font-bold text-gray-800">Dashboard</h1>
                <p class="text-gray-600">Overview of your asset management</p>
            </div>

            <!-- Stats Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div class="card">
                    <div class="flex items-center">
                        <div class="p-3 rounded-full bg-blue-100 text-blue-600">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                            </svg>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm text-gray-600">Total Assets</p>
                            <p class="text-2xl font-bold text-gray-800">${stats.total}</p>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="flex items-center">
                        <div class="p-3 rounded-full bg-green-100 text-green-600">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                            </svg>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm text-gray-600">Available</p>
                            <p class="text-2xl font-bold text-gray-800">${stats.available}</p>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="flex items-center">
                        <div class="p-3 rounded-full bg-purple-100 text-purple-600">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                            </svg>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm text-gray-600">Assigned</p>
                            <p class="text-2xl font-bold text-gray-800">${stats.assigned}</p>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="flex items-center">
                        <div class="p-3 rounded-full bg-yellow-100 text-yellow-600">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm text-gray-600">Total Value</p>
                            <p class="text-2xl font-bold text-gray-800">${formatCurrency(stats.totalValue)}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Recent Assets -->
                <div class="card">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-lg font-semibold text-gray-800">Recent Assets</h2>
                        <a href="#/assets" class="text-primary-600 hover:text-primary-700 text-sm">View all</a>
                    </div>
                    ${recentAssets.length > 0 ? `
                        <div class="space-y-3">
                            ${recentAssets.map(asset => `
                                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <p class="font-medium text-gray-800">${asset.name}</p>
                                        <p class="text-sm text-gray-500">${asset.asset_tag}</p>
                                    </div>
                                    <div class="text-right">
                                        ${getStatusBadge(asset.status)}
                                        <p class="text-sm text-gray-500 mt-1">${formatCurrency(asset.current_value)}</p>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <p class="text-gray-500 text-center py-4">No assets yet</p>
                    `}
                </div>

                <!-- Upcoming Maintenance -->
                <div class="card">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-lg font-semibold text-gray-800">Upcoming Maintenance</h2>
                        <a href="#/maintenance" class="text-primary-600 hover:text-primary-700 text-sm">View all</a>
                    </div>
                    ${maintenance.length > 0 ? `
                        <div class="space-y-3">
                            ${maintenance.slice(0, 5).map(item => `
                                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <p class="font-medium text-gray-800">${item.description || 'Scheduled Maintenance'}</p>
                                        <p class="text-sm text-gray-500">Asset ID: ${item.asset_id}</p>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-sm font-medium text-orange-600">${formatDate(item.next_due)}</p>
                                        <p class="text-xs text-gray-500">Every ${item.frequency_days} days</p>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <p class="text-gray-500 text-center py-4">No upcoming maintenance</p>
                    `}
                </div>
            </div>

            <!-- Status Distribution -->
            <div class="card mt-6">
                <h2 class="text-lg font-semibold text-gray-800 mb-4">Asset Status Distribution</h2>
                <div class="flex gap-4 flex-wrap">
                    <div class="flex items-center gap-2">
                        <div class="w-4 h-4 rounded bg-green-500"></div>
                        <span class="text-sm text-gray-600">Available: ${stats.available}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-4 h-4 rounded bg-blue-500"></div>
                        <span class="text-sm text-gray-600">Assigned: ${stats.assigned}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-4 h-4 rounded bg-yellow-500"></div>
                        <span class="text-sm text-gray-600">In Maintenance: ${stats.inMaintenance}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-4 h-4 rounded bg-gray-500"></div>
                        <span class="text-sm text-gray-600">Retired: ${stats.retired}</span>
                    </div>
                </div>
                <!-- Simple bar chart -->
                <div class="mt-4 h-8 flex rounded-lg overflow-hidden">
                    ${stats.total > 0 ? `
                        <div class="bg-green-500" style="width: ${(stats.available / stats.total) * 100}%"></div>
                        <div class="bg-blue-500" style="width: ${(stats.assigned / stats.total) * 100}%"></div>
                        <div class="bg-yellow-500" style="width: ${(stats.inMaintenance / stats.total) * 100}%"></div>
                        <div class="bg-gray-500" style="width: ${(stats.retired / stats.total) * 100}%"></div>
                    ` : `
                        <div class="bg-gray-200 w-full"></div>
                    `}
                </div>
            </div>
        `;
    }
};

export default Dashboard;
