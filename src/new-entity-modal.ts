import { App, Modal, Notice, Setting } from "obsidian";

import type { EntityType } from "./types";

const ENTITY_TYPES: EntityType[] = ["character", "place", "faction", "item", "event"];

export function entityFolderForType(type: EntityType): string {
  switch (type) {
    case "character": return "entities/characters";
    case "place":     return "entities/places";
    case "faction":   return "entities/factions";
    case "item":      return "entities/items";
    case "event":     return "entities/events";
  }
}

export function buildEntitySheetContent(input: { type: EntityType; name: string }): string {
  const lines = [
    "---",
    `type: ${input.type}`,
    `name: ${input.name}`,
    "aliases: []",
    "---",
    "",
    `# ${input.name}`,
    "",
    "<!-- describe the entity in flowing prose -->",
    "",
    "## Facts",
    "",
    "<!-- list atomic claims here. Example:",
    "- claim: \"has green eyes\"",
    "  status: canon",
    "  introduced_in: drafts/ch03.md",
    "  chapter_index: null",
    "-->",
    "",
  ];
  if (input.type !== "event") {
    lines.push(
      "## Relationships",
      "",
      "<!-- - with: OtherEntity",
      "  type: friend",
      "  status: canon -->",
      "",
    );
  }
  return lines.join("\n");
}

export class NewEntityModal extends Modal {
  private chosenType: EntityType = "character";
  private chosenName = "";

  constructor(app: App, private readonly onCreate: (path: string) => void) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "New canon entity" });

    new Setting(contentEl)
      .setName("Type")
      .addDropdown((dd: { addOption(v: string, t: string): unknown; setValue(v: string): unknown; onChange(cb: (v: string) => void): unknown }) => {
        for (const t of ENTITY_TYPES) dd.addOption(t, t);
        dd.setValue(this.chosenType);
        dd.onChange((value: string) => {
          this.chosenType = value as EntityType;
        });
      });

    new Setting(contentEl)
      .setName("Name")
      .addText((text: { setPlaceholder(p: string): unknown; onChange(cb: (v: string) => void): unknown; inputEl: { addEventListener(e: string, h: (ev: KeyboardEvent) => void): void } }) => {
        text.setPlaceholder("e.g., Aerin");
        text.onChange((v: string) => {
          this.chosenName = v.trim();
        });
        text.inputEl.addEventListener("keydown", (e: KeyboardEvent) => {
          if (e.key === "Enter") void this.submit();
        });
      });

    new Setting(contentEl)
      .addButton((btn: { setButtonText(t: string): unknown; setCta(): unknown; onClick(cb: () => void): unknown }) => {
        btn.setButtonText("Create");
        btn.setCta();
        btn.onClick(() => void this.submit());
      })
      .addButton((btn: { setButtonText(t: string): unknown; onClick(cb: () => void): unknown }) => {
        btn.setButtonText("Cancel");
        btn.onClick(() => this.close());
      });
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private async submit(): Promise<void> {
    if (!this.chosenName) {
      new Notice("Name required.");
      return;
    }
    const folder = entityFolderForType(this.chosenType);
    const path = `${folder}/${this.chosenName}.md`;
    try {
      await this.ensureFolder(folder);
      const vault = (this.app as { vault: { getAbstractFileByPath(p: string): unknown; create(p: string, c: string): Promise<unknown>; createFolder(p: string): Promise<unknown> } }).vault;
      const existing = vault.getAbstractFileByPath(path);
      if (existing) {
        new Notice(`Already exists: ${path}`, 4000);
        return;
      }
      const content = buildEntitySheetContent({ type: this.chosenType, name: this.chosenName });
      await vault.create(path, content);
      this.onCreate(path);
      new Notice(`Created ${path}`, 3000);
      this.close();
    } catch (err) {
      new Notice(`Failed: ${(err as Error).message}`, 4000);
    }
  }

  private async ensureFolder(path: string): Promise<void> {
    const vault = (this.app as { vault: { getAbstractFileByPath(p: string): unknown; createFolder(p: string): Promise<unknown> } }).vault;
    const existing = vault.getAbstractFileByPath(path);
    if (existing) return;
    await vault.createFolder(path);
  }
}
