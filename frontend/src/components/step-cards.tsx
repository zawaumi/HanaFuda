"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import { SeasonMark, seasonForIndex } from "@/lib/season";
import styles from "./step-cards.module.css";

export interface StepCard {
  id: string;
  prompt: string;
  label: string;
  helper: string;
  placeholder: string;
  maxLength: number;
  required: boolean;
  multiline?: boolean;
}

interface StepCardsProps {
  steps: StepCard[];
  values: Record<string, string>;
  errors: Record<string, string | undefined>;
  onChange: (id: string, value: string) => void;
  /** Returns an error message for the step, or undefined when it may advance. */
  checkStep: (id: string) => string | undefined;
  onComplete: () => void;
  submitting: boolean;
  submitLabel: string;
  cancel: ReactNode;
  leading?: ReactNode;
  banner?: ReactNode;
}

export function StepCards({
  steps,
  values,
  errors,
  onChange,
  checkStep,
  onComplete,
  submitting,
  submitLabel,
  cancel,
  leading,
  banner,
}: StepCardsProps) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const hasMoved = useRef(false);
  const [index, setIndex] = useState(0);
  const [goingBack, setGoingBack] = useState(false);

  useEffect(() => {
    if (!hasMoved.current) return;
    inputRef.current?.focus();
  }, [index]);

  const step = steps[index];
  const isLast = index === steps.length - 1;
  const season = seasonForIndex(index);
  const error = errors[step.id];

  function goBack() {
    if (index === 0) return;
    hasMoved.current = true;
    setGoingBack(true);
    setIndex((current) => current - 1);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    if (checkStep(step.id)) {
      inputRef.current?.focus();
      return;
    }
    if (!isLast) {
      hasMoved.current = true;
      setGoingBack(false);
      setIndex((current) => current + 1);
      return;
    }
    const failed = steps.findIndex((item) => checkStep(item.id));
    if (failed >= 0) {
      hasMoved.current = true;
      setGoingBack(true);
      setIndex(failed);
      return;
    }
    onComplete();
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className={styles.progress}>
        <ol className={styles.pips}>
          {steps.map((item, position) => (
            <li
              className={`${styles.pip} ${position <= index ? styles.pipDone : ""}`}
              key={item.id}
              style={{ "--suit": seasonForIndex(position).color } as CSSProperties}
            >
              <span className="visually-hidden">{item.label}</span>
            </li>
          ))}
        </ol>
        <p className={styles.progressCount}>
          {index + 1} <span aria-hidden="true">/</span> {steps.length}
        </p>
      </div>

      {leading}

      <div className={styles.stage}>
        <span className={styles.stack} aria-hidden="true">
          {steps.slice(index + 1).map((item, depth) => (
            <span className={styles.stackCard} key={item.id} style={{ "--depth": depth } as CSSProperties} />
          ))}
        </span>

        <div
          className={`${styles.card} ${goingBack ? styles.cardBack : ""}`}
          key={step.id}
          style={{ "--suit": season.color } as CSSProperties}
        >
          <span className={styles.cardFrame} aria-hidden="true" />
          <div className={styles.cardHead}>
            <span className={styles.cardMark} aria-hidden="true">
              <SeasonMark season={season} />
            </span>
            <span className={styles.cardLabel}>
              {step.label}
              {step.required ? <em>必須</em> : <small>任意</small>}
            </span>
          </div>

          <label className={styles.prompt} htmlFor={step.id}>{step.prompt}</label>

          {step.multiline ? (
            <textarea
              ref={(element) => { inputRef.current = element; }}
              id={step.id}
              value={values[step.id] ?? ""}
              onChange={(event) => onChange(step.id, event.target.value)}
              maxLength={step.maxLength}
              rows={4}
              placeholder={step.placeholder}
              aria-invalid={Boolean(error)}
              aria-describedby={`${step.id}-help ${step.id}-error`}
              disabled={submitting}
            />
          ) : (
            <input
              ref={(element) => { inputRef.current = element; }}
              id={step.id}
              type="text"
              value={values[step.id] ?? ""}
              onChange={(event) => onChange(step.id, event.target.value)}
              maxLength={step.maxLength}
              placeholder={step.placeholder}
              aria-invalid={Boolean(error)}
              aria-describedby={`${step.id}-help ${step.id}-error`}
              disabled={submitting}
            />
          )}

          <p id={`${step.id}-help`} className={styles.helper}>{step.helper}</p>
          <p id={`${step.id}-error`} className={styles.fieldError} aria-live="polite">{error ?? ""}</p>
        </div>
      </div>

      {banner}

      <div className={styles.actions}>
        {index === 0 ? cancel : (
          <button className={styles.backButton} type="button" onClick={goBack} disabled={submitting}>
            <span aria-hidden="true">‹</span> 戻る
          </button>
        )}
        <button className="button button-primary" type="submit" disabled={submitting}>
          {isLast ? submitLabel : "次へ"}
          {!submitting && <span aria-hidden="true">›</span>}
        </button>
      </div>
    </form>
  );
}
