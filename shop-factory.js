let factoryOwned = localStorage.getItem('factoryOwned') === 'true';
let factoryUpgradeLevel = parseInt(localStorage.getItem('factoryUpgradeLevel') || '0');
let factoryInterval = null;

function updateShopUI() {
    const status = document.getElementById('factory-status');
    const upgrade = document.getElementById('factory-upgrade');
    const buyBtn = document.getElementById('buy-factory-btn');
    const upgradeBtn = document.getElementById('upgrade-factory-btn');
    if (factoryOwned) {
        status.textContent = 'Factory: Owned';
        upgrade.textContent = 'Upgrade: ' + factoryUpgradeLevel;
        buyBtn.style.display = 'none';
        upgradeBtn.style.display = 'inline-block';
    } else {
        status.textContent = 'Factory: Not owned';
        upgrade.textContent = '';
        buyBtn.style.display = 'inline-block';
        upgradeBtn.style.display = 'none';
    }
}

function showFactoryImage() {
    if (!document.getElementById('factory-img')) {
        const img = document.createElement('img');
        img.src = 'factory.gif';
        img.id = 'factory-img';
        img.className = 'factory-img';
        img.style.left = '50px';
        img.style.bottom = '50px';
        document.body.appendChild(img);
    }
}

function startFactoryProduction() {
    if (factoryInterval) clearInterval(factoryInterval);
    factoryInterval = setInterval(() => {
        spawnFactoryYoshicoin();
    }, 2500 - 50 * factoryUpgradeLevel);
}

function spawnFactoryYoshicoin() {
    const factoryImg = document.getElementById('factory-img');
    if (!factoryImg) return;
    const coin = document.createElement('img');
    coin.src = 'yoshicoin.webp';
    coin.className = 'factory-yoshicoin';
    coin.style.left = (parseInt(factoryImg.style.left) + 40) + 'px';
    coin.style.bottom = (parseInt(factoryImg.style.bottom) + 13) + 'px';
    coin.style.transform = 'translateX(0px)';
    document.body.appendChild(coin);
    setTimeout(() => {
        coin.style.transform = 'translateX(120px)';
    }, 50);
    setTimeout(() => {
        if (coin.parentNode) coin.parentNode.removeChild(coin);
        let yoshicoins = parseInt(localStorage.getItem('yoshicoinCount')) || 0;
        yoshicoins += 1 + factoryUpgradeLevel;
        localStorage.setItem('yoshicoinCount', yoshicoins);
        if (typeof updateYoshicoinDisplay === 'function') updateYoshicoinDisplay();
        showFactoryCoinText(1 + factoryUpgradeLevel, factoryImg.style.left, factoryImg.style.bottom);
    }, 1050);
}

function showFactoryCoinText(amount, left, bottom) {
    const textDiv = document.createElement('div');
    textDiv.className = 'factory-coin-text';
    textDiv.textContent = `+${amount} Yoshicoin`;
    textDiv.style.left = (parseInt(left) + 120) + 'px';
    textDiv.style.bottom = (parseInt(bottom) + 20) + 'px';
    document.body.appendChild(textDiv);
    setTimeout(() => {
        if (textDiv.parentNode) textDiv.parentNode.removeChild(textDiv);
    }, 1000);
}

function factoryUpgradeCost() {
    return 200 + factoryUpgradeLevel * 100;
}

document.addEventListener('DOMContentLoaded', () => {
    updateShopUI();
    if (factoryOwned) {
        showFactoryImage();
        startFactoryProduction();
    }
    document.getElementById('buy-factory-btn').onclick = function() {
        let yoshicoins = parseInt(localStorage.getItem('yoshicoinCount')) || 0;
        if (yoshicoins >= 100 && !factoryOwned) {
            yoshicoins -= 100;
            localStorage.setItem('yoshicoinCount', yoshicoins);
            factoryOwned = true;
            localStorage.setItem('factoryOwned', 'true');
            factoryUpgradeLevel = 0;
            localStorage.setItem('factoryUpgradeLevel', '0');
            updateShopUI();
            showFactoryImage();
            startFactoryProduction();
            if (typeof updateYoshicoinDisplay === 'function') updateYoshicoinDisplay();
        }
    };
    document.getElementById('upgrade-factory-btn').onclick = function() {
        let yoshicoins = parseInt(localStorage.getItem('yoshicoinCount')) || 0;
        const upgradeCost = factoryUpgradeCost();
        if (yoshicoins >= upgradeCost && factoryOwned) {
            yoshicoins -= upgradeCost;
            factoryUpgradeLevel += 1;
            localStorage.setItem('yoshicoinCount', yoshicoins);
            localStorage.setItem('factoryUpgradeLevel', factoryUpgradeLevel);
            updateShopUI();
            startFactoryProduction();
            if (typeof updateYoshicoinDisplay === 'function') updateYoshicoinDisplay();
        }
    };
});