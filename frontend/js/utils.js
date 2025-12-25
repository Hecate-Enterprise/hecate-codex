// Utility functions for Hecate Codex

export function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

export function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

export function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

export function formatNumber(num) {
    if (num === null || num === undefined) return '-';
    return new Intl.NumberFormat('en-US').format(num);
}

export function getStatusBadge(status) {
    if (!status) return '-';
    const statusLabels = {
        'available': 'Available',
        'assigned': 'Assigned',
        'in_maintenance': 'In Maintenance',
        'retired': 'Retired',
        'disposed': 'Disposed'
    };

    const label = statusLabels[status] || status;
    return `<span class="badge badge-${status}">${label}</span>`;
}

export function getMaintenanceTypeBadge(type) {
    if (!type) return '-';
    const colors = {
        'preventive': 'bg-blue-100 text-blue-800',
        'corrective': 'bg-red-100 text-red-800',
        'inspection': 'bg-yellow-100 text-yellow-800',
        'upgrade': 'bg-green-100 text-green-800'
    };
    const labels = {
        'preventive': 'Preventive',
        'corrective': 'Corrective',
        'inspection': 'Inspection',
        'upgrade': 'Upgrade'
    };

    const colorClass = colors[type] || 'bg-gray-100 text-gray-800';
    const label = labels[type] || type;
    return `<span class="badge ${colorClass}">${label}</span>`;
}

export function getDepreciationMethodLabel(method) {
    if (!method) return '-';
    const labels = {
        'straight_line': 'Straight Line',
        'declining_balance': 'Declining Balance',
        'none': 'None',
        // Also support uppercase for backward compatibility
        'STRAIGHT_LINE': 'Straight Line',
        'DECLINING_BALANCE': 'Declining Balance',
        'NONE': 'None'
    };
    return labels[method] || method;
}

export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export function truncate(text, length = 50) {
    if (!text || text.length <= length) return text || '';
    return text.substring(0, length) + '...';
}

export function createLoadingSpinner() {
    return '<div class="flex justify-center items-center p-8"><div class="spinner"></div></div>';
}

export function createEmptyState(message, icon = null) {
    return `
        <div class="text-center py-12">
            ${icon ? `<div class="text-gray-400 mb-4">${icon}</div>` : ''}
            <p class="text-gray-500">${message}</p>
        </div>
    `;
}

export function getFormData(form) {
    const formData = new FormData(form);
    const data = {};

    for (const [key, value] of formData.entries()) {
        // Handle empty strings
        if (value === '') {
            data[key] = null;
        }
        // Handle numbers
        else if (form.elements[key]?.type === 'number') {
            data[key] = value ? parseFloat(value) : null;
        }
        // Handle dates
        else if (form.elements[key]?.type === 'date') {
            data[key] = value || null;
        }
        else {
            data[key] = value;
        }
    }

    return data;
}

export function setFormData(form, data) {
    for (const [key, value] of Object.entries(data)) {
        const element = form.elements[key];
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = Boolean(value);
            } else if (value !== null && value !== undefined) {
                element.value = value;
            } else {
                element.value = '';
            }
        }
    }
}

export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}
