import { byId, maybeById } from "../dom";
import { closeModal, openModal } from "./modalLifecycle";
import { bindAboutModalActions, openAboutTab } from "./aboutModal";
import { bindEntryModalActions, fillEntryModal, openEntryModal } from "./entryModal";
import { bindArchivePasswordModalActions, closeArchivePasswordModal, openArchivePasswordModal, showArchivePasswordError } from "./archivePasswordModal";
import { bindArchiveUnlockModalActions, closeArchiveUnlockModal, openArchiveUnlockModal, showArchiveUnlockError } from "./archiveUnlockModal";
import { bindUnlockModalActions, closeUnlockModal, openUnlockModal, setKeyboardLayout, submitUnlockPassword } from "./unlockModal";

import {
    bindPrivateKeyPasswordModalActions,
    closePrivateKeyPasswordModal,
    openPrivateKeyPasswordModal,
    showPrivateKeyPasswordError
} from "./privateKeyPasswordModal";

import {
    bindCryptoUnlockModalActions,
    closeCryptoContainerUnlockModal,
    openCryptoContainerUnlockModal,
    setOpenPgpPrivateKeyPath,
    showCryptoContainerUnlockError,
    submitCryptoContainerPassword
} from "./cryptoUnlockModal";

import {
    bindConverterModalActions,
    openBase64Converter,
    openCryptoConverter,
    openEmptyCryptoConverter,
    openQrCodeGenerator,
    openQrCodeGeneratorWithValue
} from "./converterModal";

export {
    closePrivateKeyPasswordModal,
    openPrivateKeyPasswordModal,
    showPrivateKeyPasswordError,
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
    closeArchiveUnlockModal,
    openArchiveUnlockModal,
    showArchiveUnlockError,
    fillEntryModal,
    openEntryModal,
    openAboutTab,
    openBase64Converter,
    openQrCodeGenerator,
    openQrCodeGeneratorWithValue,
    openCryptoConverter,
    closeArchivePasswordModal,
    openArchivePasswordModal,
    showArchivePasswordError,
    openEmptyCryptoConverter
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
    bindConverterModalActions();
    bindArchiveUnlockModalActions();
    bindArchivePasswordModalActions();
    bindPrivateKeyPasswordModalActions();

    maybeById("dbinfo-close")?.addEventListener("click", closeModal);
    maybeById("dbinfo-header-close")?.addEventListener("click", closeModal);
    maybeById("about-close")?.addEventListener("click", closeModal);
    maybeById("about-header-close")?.addEventListener("click", closeModal);
}
