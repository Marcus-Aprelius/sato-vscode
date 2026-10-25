import type { ArchiveListItem, Settings } from "../render";
import type { EntryView, GroupView, VaultStats } from "../../vault";

export interface ClientInitialState {
    tree: GroupView;
    stats: VaultStats;
    settings: Settings;
    selectedEntryId?: string | null;
    readOnlyVault?: boolean;
    vaultFormat?: string;

    archives?: ArchiveListItem[];
    selectedArchivePath?: string;
}

export interface ArchivePreviewMessage {
    entryId: string;
    kind: | "text" | "image" | "unsupported" | "error";
    content?: string;
    mimeType?: string;
    message?: string;
}

export interface VsCodeApi {
    postMessage(message: unknown): void;
    getState?(): unknown;
    setState?(state: unknown): void;
}

export type MenuItem =
    | {
          label: string;
          title?: string;
          icon?: string;
          iconPosition?: "left" | "right";
          iconTone?: "locked" | "unlocked";
          disabled?: boolean;
          action: () => void;
          children?: never;
      }
    | {
          label: string;
          title?: string;
          icon?: string;
          iconPosition?: "left" | "right";
          iconTone?: "locked" | "unlocked";
          disabled?: boolean;
          children: MenuItem[];
          action?: never;
      }
    | { sep: true; };

export interface EntryFormFields {
    title: string;
    username: string;
    password: string;
    url: string;
    notes: string;
}

export type ClientEntry = EntryView;
