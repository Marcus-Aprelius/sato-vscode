import type { EntryView, GroupView, VaultStats } from "../../vault";
import type { Settings } from "../render";

export interface ClientInitialState {
    tree: GroupView;
    stats: VaultStats;
    settings: Settings;
    selectedEntryId?: string | null;
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
      }
    | {
          sep: true;
      };

export interface EntryFormFields {
    title: string;
    username: string;
    password: string;
    url: string;
    notes: string;
}

export type ClientEntry = EntryView;
