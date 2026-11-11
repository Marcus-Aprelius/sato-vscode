"use strict";

const WALLETS = {
    onchain: "bc1qc7gqfryhj8s8pxjqjgtwd5uydzrsyaq6v2rklh",
    lightning: "lno1pgqppmsrse80qf0aara4slvcjxrvu6j2rp5ftmjy4yntlsmsutpkvkt6878s9enak2c9cc6ske4jq93h622p72q0j3t64edal8r4p7dhfv0pa8d3qgpvf374dy54652h804ghuqsyhqjf3d6prhneute2athzpqj92j9gnsqx0p45069hwfl2g20nlku7efggwj2zqtp8jx47w83t66y3s5xhmcug3ej68wpd27kxmw7685djd8e4dh0rmrq9f2mju64kgg2tw8m5gyhf0h7fz9yj6q87l5ekcxnq64mjfzk446jqqegh2pcnxlrfln6w3w6psru7hd83er5qw7v9pymyxmpuz63spnt22ngs7prt8qqrfe4r0dhe3r8gf9u6nqs"
};

let selectedUsd = 10;
let currentBtcPrice = 0;
let currentUnit = "btc";
let activeNetwork = "onchain";
let updateCooldownTimer = 0;
const updateCooldownSeconds = 60;

function formatWithSpaces(value) {
    return Number(value).toLocaleString("en-US").replace(/,/g, " ");
}

async function copyText(text, button) {
    try {
        await navigator.clipboard.writeText(text);
        const icon = button?.querySelector("i");

        if (icon) {
            const old = icon.className;
            icon.className = "fa-solid fa-check text-success";
            window.setTimeout(() => { icon.className = old; }, 1200);
        }

    } catch (error) {
        console.error("Unable to copy address:", error);
        window.alert("Unable to copy the address. Please copy it manually.");
    }
}

function selectAmount(amount) {
    selectedUsd = Number(amount);
    document.querySelectorAll(".amount-btn").forEach((button) => button.classList.toggle("active", Number(button.dataset.amount) === selectedUsd));
    const custom = document.getElementById("custom-amount-input");

    if (custom) custom.value = "";
    generateCryptoQR();
}

function handleCustomAmount(value) {
    const amount = Math.min(1000, Math.max(0, Number(value)));

    if (!Number.isFinite(amount) || amount <= 0) return;

    selectedUsd = amount;
    document.querySelectorAll(".amount-btn").forEach((button) => button.classList.remove("active"));
    generateCryptoQR();
}

function renderUsdRate() {
    const usdBtcRate = document.getElementById("usd-btc-rate");

    if (!usdBtcRate || !Number.isFinite(currentBtcPrice) || currentBtcPrice <= 0) {
        return;
    }

    if (currentUnit === "sats") {
        const satsPerUsd = Math.round(100000000 / currentBtcPrice);

        usdBtcRate.innerHTML = `
            <strong>1 USD</strong> =
            <a href="https://coincodex.com/convert/usd/satoshi-sats/" target="_blank" rel="noopener noreferrer" class="text-primary text-decoration-none" title="View 1 USD in Satoshi">${formatWithSpaces(satsPerUsd)} Satoshi</a>
        `;
        return;
    }

    const btcPerUsd = 1 / currentBtcPrice;
    const formattedBtcPerUsd = btcPerUsd.toFixed(10).replace(/0+$/, "").replace(/\.$/, "");

    usdBtcRate.innerHTML = `
        <strong>1 USD</strong> =
        <a href="https://www.coingecko.com/en/coins/bitcoin" target="_blank" rel="noopener noreferrer" class="text-primary text-decoration-none" title="View Bitcoin price on CoinGecko">${formattedBtcPerUsd} BTC</a>
    `;
}

function renderUsdRate() {
    const usdBtcRate = document.getElementById("usd-btc-rate");

    if (!usdBtcRate || !Number.isFinite(currentBtcPrice) || currentBtcPrice <= 0) {
        return;
    }

    if (currentUnit === "sats") {
        const satsPerUsd = Math.round(100000000 / currentBtcPrice);

        usdBtcRate.innerHTML = `
            <strong>1 USD</strong> =
            <a href="https://coincodex.com/convert/usd/satoshi-sats/" target="_blank" rel="noopener noreferrer" class="text-primary text-decoration-none" title="View 1 USD in Satoshi">${formatWithSpaces(satsPerUsd)} Satoshi</a>
        `;
        return;
    }

    const btcPerUsd = 1 / currentBtcPrice;
    const formattedBtcPerUsd = btcPerUsd.toFixed(10).replace(/0+$/, "").replace(/\.$/, "");

    usdBtcRate.innerHTML = `
        <strong>1 USD</strong> =
        <a href="https://www.coingecko.com/en/coins/bitcoin" target="_blank" rel="noopener noreferrer" class="text-primary text-decoration-none" title="View Bitcoin price on CoinGecko">${formattedBtcPerUsd} BTC</a>
    `;
}

function setUnit(unit) {
    currentUnit = unit === "sats" ? "sats" : "btc";
    document.getElementById("btn-unit-btc")?.classList.toggle("active", currentUnit === "btc");
    document.getElementById("btn-unit-sats")?.classList.toggle("active", currentUnit === "sats");
    document.getElementById("unit-switch-group")?.classList.toggle("sats-active", currentUnit === "sats");
    generateCryptoQR();
    renderUsdRate();
}

function switchNetwork(network) {
    activeNetwork = network === "lightning" ? "lightning" : "onchain";
    document.getElementById("tab-onchain")?.classList.toggle("active", activeNetwork === "onchain");
    document.getElementById("tab-lightning")?.classList.toggle("active", activeNetwork === "lightning");
    document.getElementById("network-tabs-group")?.classList.toggle("lightning-active", activeNetwork === "lightning");
    generateCryptoQR();
}

async function fetchBtcPrice({ manual = false } = {}) {
    const text = document.getElementById("btc-price-text");
    const usdBtcRate = document.getElementById("usd-btc-rate");
    const updateButton = document.getElementById("update-btn");
    const updateIcon = updateButton?.querySelector("i");

    if (updateButton?.disabled) {
        return false;
    }

    if (manual && updateButton) {
        updateButton.disabled = true;
        updateButton.setAttribute("aria-busy", "true");
        updateIcon?.classList.add("fa-spin");
    }

    if (text && manual) {
        text.textContent = "Updating rate...";
    }

    if (usdBtcRate && manual) {
        usdBtcRate.textContent = "1 USD = Updating...";
    }

    try {
        const requestUrl = new URL("https://api.coingecko.com/api/v3/simple/price");
        requestUrl.searchParams.set("ids", "bitcoin");
        requestUrl.searchParams.set("vs_currencies", "usd");
        requestUrl.searchParams.set("_", String(Date.now()));

        const response = await fetch(requestUrl.toString(), {
            method: "GET",
            cache: "no-store",
            headers: { Accept: "application/json" }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const updatedPrice = Number(data?.bitcoin?.usd);

        if (!Number.isFinite(updatedPrice) || updatedPrice <= 0) {
            throw new Error("Invalid BTC price");
        }

        currentBtcPrice = updatedPrice;

        if (text) {
            text.innerHTML = `<strong>1 BTC</strong> = <a href="https://www.coingecko.com/en/coins/bitcoin" target="_blank" rel="noopener noreferrer" class="text-primary text-decoration-none" title="View Bitcoin price on CoinGecko">$${formatWithSpaces(currentBtcPrice)} USD</a>`;
        }

        renderUsdRate();
        generateCryptoQR();
        return true;

    } catch (error) {
        console.error("Unable to load BTC price:", error);

        if (text) {
            text.textContent = "Rate update failed";
        }

        if (usdBtcRate) {
            usdBtcRate.textContent = "1 USD = Rate unavailable";
        }

        return false;

    } finally {
        if (manual && updateButton) {
            updateButton.removeAttribute("aria-busy");
            updateIcon?.classList.remove("fa-spin");
        }
    }
}

function startUpdateCooldown(seconds = updateCooldownSeconds) {
    const updateButton = document.getElementById("update-btn");
    if (!updateButton) {
        return;
    }

    window.clearInterval(updateCooldownTimer);
    let remaining = seconds;
    updateButton.disabled = true;
    const renderCountdown = () => { updateButton.innerHTML = `<i class="fa-solid fa-rotate me-1"></i>Update (${remaining})`; };

    renderCountdown();
    updateCooldownTimer = window.setInterval(() => {
        remaining -= 1;

        if (remaining <= 0) {
            window.clearInterval(updateCooldownTimer);
            updateCooldownTimer = 0;
            updateButton.disabled = false;
            updateButton.innerHTML = '<i class="fa-solid fa-rotate me-1"></i>Update';
            return;
        }
        renderCountdown();
    }, 1000);
}

async function manualUpdateRate() {
    const updated = await fetchBtcPrice({ manual: true });

    if (updated) {
        startUpdateCooldown();
    } else {
        const updateButton = document.getElementById("update-btn");

        if (updateButton) {
            updateButton.disabled = false;
            updateButton.innerHTML = '<i class="fa-solid fa-rotate me-1"></i>Retry';
        }
    }
}

function shortenWallet(value, startLength = 28, endLength = 12) {
    const normalized = typeof value === "string" ? value.trim() : "";
    return normalized.length <= startLength + endLength + 3 ? normalized : `${normalized.slice(0, startLength)}...${normalized.slice(-endLength)}`;
}

function qrUrl(data, size = 180) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

function walletQrUrl(network) {
    const wallet = WALLETS[network];
    return qrUrl(network === "onchain" ? `bitcoin:${wallet}` : `lightning:${wallet}`, 174);
}

function showWalletQr(button) {
    const network = button.dataset.wallet;
    const popup = document.getElementById("wallet-qr-popup");
    const image = document.getElementById("wallet-qr-popup-image");
    const mainQr = document.getElementById("qr-image");
    if (!network || !WALLETS[network] || !popup || !image) return;

    image.src = walletQrUrl(network);
    image.alt = network === "onchain" ? "BTC (On-Chain)" : "Lightning Network";
    mainQr?.classList.add("is-obscured");
    popup.classList.add("is-visible");
    popup.setAttribute("aria-hidden", "false");

    const rect = button.getBoundingClientRect();
    const width = 196;
    const height = 196;
    const margin = 10;
    const left = Math.max(margin, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - margin));
    let top = rect.bottom + margin;

    if (top + height > window.innerHeight - margin) top = rect.top - height - margin;
    popup.style.left = `${left}px`;
    popup.style.top = `${Math.max(margin, top)}px`;
}

function hideWalletQr() {
    const popup = document.getElementById("wallet-qr-popup");
    popup?.classList.remove("is-visible");
    popup?.setAttribute("aria-hidden", "true");
    document.getElementById("qr-image")?.classList.remove("is-obscured");
}

function generateCryptoQR() {
    if (!Number.isFinite(currentBtcPrice) || currentBtcPrice <= 0 || !Number.isFinite(selectedUsd) || selectedUsd <= 0) return;
    const btcAmount = selectedUsd / currentBtcPrice;
    const satoshis = Math.round(btcAmount * 100000000);
    const amount = document.getElementById("crypto-amount-text");
    const image = document.getElementById("qr-image");
    const wallet = WALLETS[activeNetwork];
    const uri = activeNetwork === "onchain" ? `bitcoin:${wallet}?amount=${btcAmount.toFixed(8)}` : `lightning:${wallet}`;

    if (amount) {
        amount.textContent = currentUnit === "sats" ? formatWithSpaces(satoshis) : btcAmount.toFixed(8);
    }

    if (image) {
        image.alt = activeNetwork === "onchain" ? "Bitcoin On-Chain payment QR code" : "Lightning Network payment QR code";
        image.src = qrUrl(uri, 180);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const onchain = document.getElementById("onchain-address");
    const lightning = document.getElementById("lightning-address");

    if (onchain) onchain.textContent = WALLETS.onchain;
    if (lightning) {
        lightning.textContent = shortenWallet(WALLETS.lightning); lightning.title = WALLETS.lightning;
    }

    document.querySelectorAll(".wallet-qr-button").forEach((button) => {
        button.addEventListener("mouseenter", () => showWalletQr(button));
        button.addEventListener("mouseleave", hideWalletQr);
        button.addEventListener("focus", () => showWalletQr(button));
        button.addEventListener("blur", hideWalletQr);
    });
    window.addEventListener("scroll", hideWalletQr, true);
    window.addEventListener("resize", hideWalletQr);
    void fetchBtcPrice().then((updated) => {
        if (updated) {
            startUpdateCooldown();
        }
    });
});
