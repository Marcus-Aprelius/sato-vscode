import type { ClientInitialState, VsCodeApi } from "./types";

declare global {
    interface Window {
        acquireVsCodeApi: () => VsCodeApi;
        initialState: ClientInitialState;
    }
}

export const vscode = window.acquireVsCodeApi();

export function readInitialState(): ClientInitialState {
    return window.initialState;
}
