// ========================================================
// PRODUCTOMETER PORTAL - MAIN PORTAL CONTROLLER
// ========================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Sync Diamond Wallet across portal views
    const diamondWalletEl = document.getElementById('globalDiamondWallet');
    if (diamondWalletEl) {
        const diamonds = parseInt(localStorage.getItem('productometer_diamond_wallet'), 10) || 0;
        diamondWalletEl.textContent = diamonds;
    }
});
