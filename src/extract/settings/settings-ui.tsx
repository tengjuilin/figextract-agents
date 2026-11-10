// The Settings dialog's content: header with the close button (a submit button of <form method="dialog">, so
// the browser closes the <dialog>), the section nav and the panes. Like the sidebar, the panes carry no
// explanatory prose; a section's explanation is its nav button's tooltip and its fields' titles. The <dialog>
// element, showModal, the backdrop click and the stored settings stay in settings-dialog.ts. The panes render
// after the first open and then stay mounted (hidden when not current), so drafts survive switching tabs.
import { StrictMode, useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import type { SettingsSource } from '../../types/index.ts';
import { IconBtn, SettingsProvider } from '../../ui/index.ts';
import { AgentPane } from './agent-pane.tsx';
import { ColorsPane } from './colors-pane.tsx';
import { HotkeysPane } from './hotkeys-pane.tsx';
import { MatchingPane } from './matching-pane.tsx';
import { type SettingsCtl, SettingsCtlContext } from './settings-ctl.ts';
import { TransferPane } from './transfer-pane.tsx';

// Section id, nav label, the nav button's tooltip (what used to be each pane's intro paragraph: the dialog
// follows the sidebar's no-prose rule, docs/ui.md section 7) and the pane.
const TABS: [id: string, label: string, title: string, Content: () => React.ReactNode][] = [
  [
    'agent',
    'Agent',
    "The Heatmap tool's Agent card and Read labels with AI. Settings are saved in this browser as you change them.",
    AgentPane,
  ],
  [
    'matching',
    'Matching',
    'How colors are matched to the colorbar. New panels start with these values; a change here applies to every panel of that tool in the open project (Undo reverts it). Panels keep their values in the project zip.',
    MatchingPane,
  ],
  [
    'hotkeys',
    'Hotkeys',
    'Esc (cancel), Space (pan), Enter and Backspace (polygons) and Delete or Backspace (regions, profiles) are fixed. Ctrl on Windows and Linux is ⌘ on a Mac, so hotkeys and settings files work on both.',
    HotkeysPane,
  ],
  [
    'colors',
    'Colors',
    "Colors of the marks drawn over figures. Pick colors that stand out from the figure's own colormap. Masks and flag layers keep their transparency.",
    ColorsPane,
  ],
  [
    'transfer',
    'Import and export',
    'All settings (agent, matching, hotkeys and colors) in one zip, to load in another browser',
    TransferPane,
  ],
];

function Pane({ id, tab, children }: { id: string; tab: string; children: React.ReactNode }) {
  return (
    <section className="settings-pane" data-settings-pane={id} hidden={tab !== id}>
      {children}
    </section>
  );
}

export function SettingsDialogUi({ ctl }: { ctl: SettingsCtl }) {
  const { tab, shown } = useSyncExternalStore(ctl.ui.subscribe, ctl.ui.get);
  return (
    <>
      <form method="dialog" className="settings-head">
        <h2 id="settings-title">Settings</h2>
        <IconBtn type="submit" icon="close" label="Close settings" value="close" />
      </form>
      <div className="settings-body">
        <nav className="settings-nav" aria-label="Settings sections">
          {TABS.map(([id, label, title]) => (
            <button
              key={id}
              type="button"
              className={tab === id ? 'active' : undefined}
              aria-current={tab === id ? 'page' : undefined}
              title={title}
              data-settings-tab={id}
              onClick={() => ctl.ui.setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        {shown &&
          TABS.map(([id, label, , Content]) => (
            <Pane key={id} id={id} tab={tab}>
              <h3>{label}</h3>
              <Content />
            </Pane>
          ))}
      </div>
    </>
  );
}

/** Render the dialog's content into the (empty) <dialog>; `source` feeds useSettings. */
export function mountSettingsDialog(dialog: HTMLDialogElement, ctl: SettingsCtl, source: SettingsSource) {
  const root = createRoot(dialog);
  flushSync(() =>
    root.render(
      <StrictMode>
        <SettingsProvider source={source} mac={ctl.mac}>
          <SettingsCtlContext.Provider value={ctl}>
            <SettingsDialogUi ctl={ctl} />
          </SettingsCtlContext.Provider>
        </SettingsProvider>
      </StrictMode>,
    ),
  );
}
