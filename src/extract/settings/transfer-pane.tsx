// Import and export pane of the Settings dialog: all settings as a zip, and Reset. Import keeps the current
// API key when the file has none; Reset keeps the key too.
import JSZip from 'jszip';
import { useRef, useState } from 'react';
import { Actions, Btn, Check, Notice, SplitActions } from '../../ui/index.ts';
import { buildSettingsZip, defaultSettings, readSettingsFile } from './settings.ts';
import { useSettingsCtl } from './settings-ctl.ts';

export function TransferPane() {
  const ctl = useSettingsCtl();
  const { ws } = ctl;
  const [includeKey, setIncludeKey] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function exportZip() {
    if (includeKey && !ctl.settings.agent.key) ws.toast('There is no API key to include.');
    const blob = await buildSettingsZip(JSZip, ctl.settings, { includeKey });
    ws.download(blob, 'figextract-settings.zip');
  }

  async function importFile(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const { settings: next, hasKey } = await readSettingsFile(JSZip, file, file.name);
      const cur = ctl.settings.agent;
      if (!hasKey) next.agent = { ...next.agent, key: cur.key, rememberKey: cur.rememberKey };
      ctl.replaceAll(next);
      ws.toast(`Settings imported from ${file.name}${hasKey ? ', with an API key' : ''}.`);
    } catch (err) {
      console.error(err);
      ws.toast(`Could not import settings: ${(err as Error).message}`, true);
    }
  }

  function reset() {
    if (!confirm('Reset all settings to the defaults? The API key is kept.')) return;
    const next = defaultSettings();
    next.agent.key = ctl.settings.agent.key;
    next.agent.rememberKey = ctl.settings.agent.rememberKey;
    ctl.replaceAll(next);
    ws.toast('Settings reset.');
  }

  return (
    <>
      <Check
        id="settings-include-key"
        label="Include the API key in the export"
        title="The key is stored as plain text in the zip"
        checked={includeKey}
        onChange={setIncludeKey}
      />
      {includeKey ? (
        <Notice>
          The key is stored as plain text in the zip. Anyone with the file can spend your OpenRouter credit.
        </Notice>
      ) : null}
      <SplitActions>
        <Btn id="settings-export" icon="download" title="Save all settings to a zip" onClick={() => void exportZip()}>
          Export settings (.zip)
        </Btn>
        <Btn
          icon="upload"
          title="Replace the current settings with a settings zip. If the file has no API key, the current key is kept."
          onClick={() => fileInput.current?.click()}
        >
          Import settings (.zip)
        </Btn>
      </SplitActions>
      <input
        ref={fileInput}
        id="settings-import"
        type="file"
        accept=".zip,.json,application/zip,application/json"
        hidden
        onChange={(e) => void importFile(e.target)}
      />
      <Actions>
        <Btn
          variant="danger"
          icon="reset"
          id="settings-reset"
          title="Back to the defaults; the API key is kept"
          onClick={reset}
        >
          Reset all settings
        </Btn>
      </Actions>
    </>
  );
}
