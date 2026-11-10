// "Needs review" of the Agent card: checks answered below the policy confidence (escalated typed questions)
// and panels whose extraction was rejected. Each entry starts with a chip of its panel, which selects the panel
// and goes to its page. Human answers apply at once through the API and are logged with source "human". The
// list is derived from the questions the card fetched and the panels' review state.
import { useState } from 'react';
import type { Panel, Question } from '../../types/index.ts';
import { Actions, BoundInput, Btn, Chip, Field, Fields, Hint, InputPair, Notice } from '../../ui/index.ts';
import { answerLabel, answerText, pct } from './agent-state.ts';

export interface ReviewHandlers {
  busy: boolean;
  canRun: boolean;
  /** The active panel, whose chip is pressed. */
  activeId: string;
  panelName: (id: string) => string;
  /** Select the panel (and go to its page); a question may also zoom to its evidence. */
  select: (panelId: string, q?: Question) => void;
  answer: (q: Question, value: unknown) => void;
  review: (panelId: string, status: 'accepted' | 'rejected') => void;
  remove: (panelId: string) => void;
  redo: (panelId: string, note: string) => void;
}

function PanelChip({ panelId, q, h }: { panelId: string; q?: Question; h: ReviewHandlers }) {
  return (
    <Chip
      className="review-panel"
      pressed={panelId === h.activeId}
      title="Select this panel and go to its page"
      onClick={() => h.select(panelId, q)}
    >
      {h.panelName(panelId)}
    </Chip>
  );
}

function DeleteButton({ panelId, h }: { panelId: string; h: ReviewHandlers }) {
  return (
    <Btn
      variant="danger"
      icon="trash"
      disabled={h.busy}
      title="Delete this panel and its extraction (undo restores it)"
      onClick={() => h.remove(panelId)}
    >
      Delete the panel
    </Btn>
  );
}

function GridSizeAnswer({ q, h }: { q: Question; h: ReviewHandlers }) {
  const init = (q.escalated?.answer || q.suggested) as { rows: number; cols: number };
  const [rows, setRows] = useState(String(init.rows));
  const [cols, setCols] = useState(String(init.cols));
  return (
    <>
      <Fields>
        <Field as="div" label="Rows × columns">
          <InputPair>
            <BoundInput kind="number" min={1} className="num" aria-label="Rows" value={rows} onInput={setRows} />
            <BoundInput kind="number" min={1} className="num" aria-label="Columns" value={cols} onInput={setCols} />
          </InputPair>
        </Field>
      </Fields>
      <Actions>
        <Btn icon="check" onClick={() => h.answer(q, { rows: Number(rows), cols: Number(cols) })}>
          Apply
        </Btn>
      </Actions>
    </>
  );
}

function QuestionItem({ q, h }: { q: Question; h: ReviewHandlers }) {
  const esc = q.escalated!;
  const on = (v: boolean) => (v ? true : undefined);
  return (
    <li>
      <PanelChip panelId={q.panelId} q={q} h={h} />
      <div>{q.prompt}</div>
      <Hint>{`${esc.source || 'An agent'} suggested ${answerText(esc.answer)} (${pct(esc.confidence)} sure)`}</Hint>
      {q.type === 'confirm_grid_size' ? (
        <GridSizeAnswer q={q} h={h} />
      ) : (
        <Actions>
          {q.type === 'confirm_extraction' ? (
            // A review of the panel as it is now, so it also works after the values changed since the question
            // was asked. Reject keeps the panel to fix or redo; Delete is the hard no.
            <>
              <Btn icon="check" pressed={on(esc.answer === 'accept')} onClick={() => h.review(q.panelId, 'accepted')}>
                Accept
              </Btn>
              <Btn
                variant="danger"
                icon="close"
                pressed={on(esc.answer === 'reject')}
                onClick={() => h.review(q.panelId, 'rejected')}
              >
                Reject
              </Btn>
              <DeleteButton panelId={q.panelId} h={h} />
            </>
          ) : (
            (q.answerSchema.enum as string[]).map((opt) => (
              <Btn key={opt} icon="check" pressed={on(opt === esc.answer)} onClick={() => h.answer(q, opt)}>
                {answerLabel(opt)}
              </Btn>
            ))
          )}
        </Actions>
      )}
    </li>
  );
}

function RejectedItem({ panel, h }: { panel: Panel; h: ReviewHandlers }) {
  const rv = panel.review!;
  const [note, setNote] = useState(rv.note || '');
  const sure = rv.by !== 'human' && Number.isFinite(rv.confidence) ? ` (${pct(rv.confidence)} sure)` : '';
  return (
    <li className="rejected">
      <PanelChip panelId={panel.id} h={h} />
      <Notice>{`Rejected${rv.by ? ` by ${rv.by}` : ''}${sure}.`}</Notice>
      <Field stack label="Note for the agent" title="What is wrong; passed to the agent when it redoes the panel">
        <BoundInput
          spellCheck={false}
          value={note}
          onInput={setNote}
          onCommit={() => {
            panel.review!.note = note.trim();
          }}
        />
      </Field>
      <Actions>
        <Btn variant="primary" icon="ai" disabled={h.busy || !h.canRun} onClick={() => h.redo(panel.id, note.trim())}>
          Redo with agent
        </Btn>
        <Btn icon="check" onClick={() => h.review(panel.id, 'accepted')}>
          Accept anyway
        </Btn>
        <DeleteButton panelId={panel.id} h={h} />
      </Actions>
    </li>
  );
}

export function ReviewList({
  questions,
  rejected,
  h,
}: {
  questions: Question[];
  rejected: Panel[];
  h: ReviewHandlers;
}) {
  return (
    <div id="agent-review" className="agent-review" hidden={!questions.length && !rejected.length}>
      <h3>Needs review</h3>
      <ul id="agent-review-list">
        {rejected.map((p) => (
          <RejectedItem key={`${p.id}:${p.review?.resultHash}`} panel={p} h={h} />
        ))}
        {questions.map((q) => (
          <QuestionItem key={q.id} q={q} h={h} />
        ))}
      </ul>
    </div>
  );
}
