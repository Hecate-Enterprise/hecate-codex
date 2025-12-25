// Modal Component

const modalContainer = document.getElementById('modal-container');
const modalContent = document.getElementById('modal-content');

let currentOnClose = null;

export function openModal(title, content, options = {}) {
    const { size = 'md', onClose = null } = options;

    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-2xl',
        lg: 'max-w-4xl',
        xl: 'max-w-6xl',
        full: 'max-w-full mx-8'
    };

    modalContent.className = `bg-white rounded-lg shadow-xl w-full mx-4 max-h-[90vh] overflow-auto ${sizeClasses[size] || sizeClasses.md}`;

    modalContent.innerHTML = `
        <div class="flex items-center justify-between p-4 border-b">
            <h3 class="text-lg font-semibold text-gray-900">${title}</h3>
            <button id="modal-close-btn" class="text-gray-400 hover:text-gray-600 transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        </div>
        <div class="p-4" id="modal-body">
            ${content}
        </div>
    `;

    currentOnClose = onClose;

    modalContainer.classList.remove('hidden');
    modalContainer.classList.add('showing');

    // Close button handler
    document.getElementById('modal-close-btn').addEventListener('click', closeModal);

    // Close on backdrop click
    modalContainer.addEventListener('click', handleBackdropClick);

    // Close on Escape key
    document.addEventListener('keydown', handleEscapeKey);

    return modalContent.querySelector('#modal-body');
}

export function closeModal() {
    modalContainer.classList.add('hidden');
    modalContainer.classList.remove('showing');

    if (currentOnClose) {
        currentOnClose();
        currentOnClose = null;
    }

    modalContainer.removeEventListener('click', handleBackdropClick);
    document.removeEventListener('keydown', handleEscapeKey);
}

function handleBackdropClick(e) {
    if (e.target === modalContainer) {
        closeModal();
    }
}

function handleEscapeKey(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
}

export function updateModalContent(content) {
    const body = modalContent.querySelector('#modal-body');
    if (body) {
        body.innerHTML = content;
    }
}

export function getModalBody() {
    return modalContent.querySelector('#modal-body');
}

// Confirm dialog helper
export function confirm(message, { title = 'Confirm', confirmText = 'Confirm', cancelText = 'Cancel', danger = false } = {}) {
    return new Promise((resolve) => {
        const content = `
            <p class="text-gray-600 mb-6">${message}</p>
            <div class="flex justify-end gap-3">
                <button id="confirm-cancel" class="btn btn-secondary">${cancelText}</button>
                <button id="confirm-ok" class="btn ${danger ? 'btn-danger' : 'btn-primary'}">${confirmText}</button>
            </div>
        `;

        openModal(title, content, {
            size: 'sm',
            onClose: () => resolve(false)
        });

        document.getElementById('confirm-cancel').addEventListener('click', () => {
            closeModal();
            resolve(false);
        });

        document.getElementById('confirm-ok').addEventListener('click', () => {
            closeModal();
            resolve(true);
        });
    });
}
