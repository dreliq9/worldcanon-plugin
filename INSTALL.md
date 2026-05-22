# Installing Worldbuilder Canon

The plugin has two parts that work together:

1. **Sidecar** — a small program that watches your vault and serves canon data.
2. **Plugin** — runs inside Obsidian, shows the side pane, search, and entity creation.

You install both once. They auto-start every time after that.

## 1. Install the sidecar

Follow the instructions in `~/Projects/worldcanon/` (or wherever your worldcanon repo lives).
On Windows you'll set up Task Scheduler so the sidecar starts at login.

Verify it's running by visiting <http://127.0.0.1:7777/stats> in a browser — you should see JSON.

## 2. Install the plugin into your vault

```bash
./install.sh "/path/to/your/Vault"
```

This copies `manifest.json`, `main.js`, and `styles.css` into
`<Vault>/.obsidian/plugins/worldcanon-canon/`.

## 3. Enable in Obsidian

1. Open the vault in Obsidian.
2. Settings → Community plugins.
3. If Restricted Mode is on, turn it off.
4. Find "Worldbuilder Canon" in the installed list and toggle it on.

## 4. Verify

- The bottom status bar should show `Canon: ✓ N chunks, M facts` in green.
- Command palette: `Canon: Search`, `Canon: New entity`, `Canon: Open pane`.

If the status bar is red ("sidecar down"), the sidecar isn't running. Start it and the bar
will go green within 30 seconds.

## Updating

Run `npm run build` then `./install.sh "/path/to/Vault"` again, and reload the plugin in
Obsidian (settings → Community plugins → toggle off + on).
