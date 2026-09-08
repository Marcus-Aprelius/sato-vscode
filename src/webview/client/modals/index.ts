import { byId, maybeById } from "../dom";
import { closeModal, openModal } from "./modalLifecycle";
import { bindAboutModalActions, openAboutTab } from "./aboutModal";

import {
    bindUnlockModalActions,
    closeUnlockModal,
    openUnlockModal,
    setKeyboardLayout,
    submitUnlockPassword
} from "./unlockModal";

import {
    bindCryptoUnlockModalActions,
    closeCryptoContainerUnlockModal,
    openCryptoContainerUnlockModal,
    setOpenPgpPrivateKeyPath,
    showCryptoContainerUnlockError,
    submitCryptoContainerPassword
} from "./cryptoUnlockModal";

import {
    bindEntryModalActions,
    fillEntryModal,
    openEntryModal
} from "./entryModal";

export {
    closeModal,
    openModal,
    closeUnlockModal,
    openUnlockModal,
    setKeyboardLayout,
    submitUnlockPassword,
    closeCryptoContainerUnlockModal,
    openCryptoContainerUnlockModal,
    setOpenPgpPrivateKeyPath,
    showCryptoContainerUnlockError,
    submitCryptoContainerPassword,
    fillEntryModal,
    openEntryModal,
    openAboutTab
};

export function bindModalActions(): void {
    byId("modal-backdrop").addEventListener("click", (event) => {
        if (event.target === byId("modal-backdrop")) {
            closeModal();
        }
    });

    bindEntryModalActions();
    bindUnlockModalActions();
    bindCryptoUnlockModalActions();
    bindAboutModalActions();

    maybeById("dbinfo-close")?.addEventListener("click", closeModal);
    maybeById("about-close")?.addEventListener("click", closeModal);
}
