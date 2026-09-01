export const modalState = {
    openPgpPrivateKeyPath: "",
    cryptoUnlockRequiresPrivateKey: false,
    cryptoUnlockEntryId: null as string | null
};

export function resetCryptoUnlockState(): void {
    modalState.cryptoUnlockEntryId = null;
    modalState.openPgpPrivateKeyPath = "";
    modalState.cryptoUnlockRequiresPrivateKey = false;
}
