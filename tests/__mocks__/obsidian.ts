// Minimal mock so jest can import modules that reference 'obsidian'.
// Real Obsidian classes only run inside Obsidian's runtime; unit tests
// stub them so pure-logic modules (ApiClient, helpers) can be tested.

export class Plugin {
  app: { workspace: { openLinkText(_link: string, _source: string, _newLeaf?: boolean): Promise<void> } } = {
    workspace: { openLinkText: async () => {} },
  };
  manifest: { version: string } = { version: "0.0.0" };
  async loadData(): Promise<unknown> { return {}; }
  async saveData(_data: unknown): Promise<void> {}
  addStatusBarItem(): HTMLElement {
    // Return a stub with methods that status-bar.ts uses
    const el = {
      addClass: (_c: string) => {},
      removeClass: (_c: string) => {},
      setText: (_t: string) => {},
    } as unknown as HTMLElement;
    return el;
  }
  addSettingTab(_tab: unknown): void {}
  addCommand(_cmd: unknown): void {}
  registerView(_t: string, _f: unknown): void {}
}
export class PluginSettingTab {
  containerEl: { empty(): void; createEl(_t: string, _o?: unknown): unknown };
  constructor(_app: unknown, _plugin: unknown) {
    this.containerEl = { empty: () => {}, createEl: () => ({}) };
  }
}
export class Modal {
  app: unknown;
  contentEl: { empty(): void; createEl(_t: string, _o?: unknown): unknown };
  constructor(app: unknown) {
    this.app = app;
    this.contentEl = { empty: () => {}, createEl: () => ({}) };
  }
  open(): void {}
  close(): void {}
}
export class FuzzySuggestModal<T> {
  constructor(_app: unknown) {}
  setPlaceholder(_text: string) {}
  open(): void {}
  close(): void {}
  getItems(): T[] { return []; }
  getItemText(_item: T): string { return ""; }
  onChooseItem(_item: T, _evt: MouseEvent | KeyboardEvent): void {}
  onOpen(): void {}
  onClose(): void {}
}
export class ItemView {
  contentEl: HTMLElement = {} as HTMLElement;
  app: { workspace: { openLinkText(_link: string, _source: string, _newLeaf?: boolean): Promise<void> }; vault: unknown } = {
    workspace: { openLinkText: async () => {} },
    vault: {},
  };
  constructor(_leaf: unknown) {}
  registerEvent(_ref: unknown): void {}
}
export class MarkdownView {}
export class Notice {
  constructor(_message: string, _timeout?: number) {}
}
export class Setting {
  constructor(_containerEl: unknown) {}
  setName(_n: string) { return this; }
  setDesc(_d: string) { return this; }
  addText(_cb: unknown) { return this; }
  addToggle(_cb: unknown) { return this; }
  addDropdown(_cb: unknown) { return this; }
  addButton(_cb: unknown) { return this; }
}
export type App = {
  workspace: { openLinkText(_link: string, _source: string, _newLeaf?: boolean): Promise<void> };
};
export type WorkspaceLeaf = unknown;
export type TFile = { path: string; basename: string };
