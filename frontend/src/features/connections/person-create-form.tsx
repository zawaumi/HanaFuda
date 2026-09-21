"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { dataSource, isApiError, type Person } from "@/lib/api";
import styles from "./person-create-form.module.css";

type FieldName = "name" | "relationship" | "knownInformation" | "situation";
type FieldErrors = Partial<Record<FieldName, string>>;

interface FormValues {
  name: string;
  relationship: string;
  knownInformation: string;
  situation: string;
}

interface SuccessState {
  person: Person;
  situation: string;
}

const initialValues: FormValues = {
  name: "",
  relationship: "",
  knownInformation: "",
  situation: "",
};

function validate(values: FormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (values.name.trim().length > 50) {
    errors.name = "50文字以内で入力してください。";
  }
  if (!values.relationship.trim()) {
    errors.relationship = "自分との関係を入力してください。";
  } else if (values.relationship.trim().length > 50) {
    errors.relationship = "50文字以内で入力してください。";
  }
  if (values.knownInformation.trim().length > 500) {
    errors.knownInformation = "500文字以内で入力してください。";
  }
  if (!values.situation.trim()) {
    errors.situation = "会う場所や状況を入力してください。";
  } else if (values.situation.trim().length > 120) {
    errors.situation = "120文字以内で入力してください。";
  }
  return errors;
}

function submitErrorMessage(error: unknown) {
  return isApiError(error)
    ? error.message
    : "登録できませんでした。時間をおいて再度お試しください。";
}

export function PersonCreateForm() {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);

  function updateField(field: FieldName, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const nextErrors = validate(values);
    setErrors(nextErrors);
    setSubmitError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const person = await dataSource.createPerson({
        name: values.name.trim() || "名前不明",
        relationship: values.relationship.trim(),
        known_information: values.knownInformation.trim(),
      });
      setSuccess({ person, situation: values.situation.trim() });
    } catch (error) {
      setSubmitError(submitErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    const parameters = new URLSearchParams({ situation: success.situation });
    return (
      <div className={styles.successPage}>
        <section className={`${styles.successCard} surface`} aria-live="polite">
          <span className={styles.successIcon} aria-hidden="true">✓</span>
          <p className="eyebrow">Registered</p>
          <h1>{success.person.name}を登録しました</h1>
          <p>続けて、今回の会話に合った話題を準備しましょう。</p>
          <div className={styles.successActions}>
            <Link
              className="button button-primary"
              href={`/connections/${success.person.id}/deck/new?${parameters}`}
            >
              会話設定へ進む <span aria-hidden="true">›</span>
            </Link>
            <Link className={styles.textLink} href="/connections">
              つながり一覧へ戻る
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className="page-header">
        <p className="eyebrow">New connection</p>
        <h1>新しい相手を登録</h1>
        <p>分かる範囲だけで大丈夫です。名前が分からなくても始められます。</p>
      </header>

      <form className={`${styles.form} surface`} onSubmit={handleSubmit} noValidate>
        <div className={styles.formIntro}>
          <div>
            <span className={styles.step}>1</span>
            <h2>相手について</h2>
          </div>
          <p><span aria-hidden="true">*</span> は必須項目です</p>
        </div>

        <div className={styles.fields}>
          <Field
            id="person-name"
            label="名前・呼び名"
            helper="任意。空欄の場合は「名前不明」で登録します。"
            error={errors.name}
          >
            <input
              id="person-name"
              name="name"
              type="text"
              value={values.name}
              onChange={(event) => updateField("name", event.target.value)}
              maxLength={51}
              placeholder="例: 佐藤さん"
              aria-invalid={Boolean(errors.name)}
              aria-describedby="person-name-help person-name-error"
              disabled={isSubmitting}
            />
          </Field>

          <Field
            id="person-relationship"
            label="自分との関係"
            required
            helper="どこで知り合ったか、どんな関係かを入力します。"
            error={errors.relationship}
          >
            <input
              id="person-relationship"
              name="relationship"
              type="text"
              value={values.relationship}
              onChange={(event) => updateField("relationship", event.target.value)}
              maxLength={51}
              placeholder="例: 大学のゼミ仲間"
              aria-invalid={Boolean(errors.relationship)}
              aria-describedby="person-relationship-help person-relationship-error"
              disabled={isSubmitting}
            />
          </Field>

          <Field
            id="known-information"
            label="知っていること"
            helper="任意。興味、最近聞いたこと、共通点など。"
            error={errors.knownInformation}
          >
            <textarea
              id="known-information"
              name="known_information"
              value={values.knownInformation}
              onChange={(event) => updateField("knownInformation", event.target.value)}
              maxLength={501}
              rows={4}
              placeholder="例: 音楽が好き。最近ライブへ行った。"
              aria-invalid={Boolean(errors.knownInformation)}
              aria-describedby="known-information-help known-information-error"
              disabled={isSubmitting}
            />
          </Field>
        </div>

        <div className={styles.divider} />

        <div className={styles.formIntro}>
          <div>
            <span className={styles.step}>2</span>
            <h2>今回会う状況</h2>
          </div>
        </div>

        <div className={styles.fields}>
          <Field
            id="meeting-situation"
            label="会う場所・状況"
            required
            helper="登録後の会話設定へ引き継ぎます。"
            error={errors.situation}
          >
            <input
              id="meeting-situation"
              name="situation"
              type="text"
              value={values.situation}
              onChange={(event) => updateField("situation", event.target.value)}
              maxLength={121}
              placeholder="例: ハッカソン会場で初めて会う"
              aria-invalid={Boolean(errors.situation)}
              aria-describedby="meeting-situation-help meeting-situation-error"
              disabled={isSubmitting}
            />
          </Field>
        </div>

        {submitError ? (
          <div className={styles.submitError} role="alert">
            <strong>登録に失敗しました</strong>
            <span>{submitError}</span>
          </div>
        ) : null}

        <div className={styles.formActions}>
          <Link className={styles.cancelLink} href="/connections">
            キャンセル
          </Link>
          <button className="button button-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "登録中…" : "登録して次へ"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  id,
  label,
  helper,
  error,
  required = false,
  children,
}: {
  id: string;
  label: string;
  helper: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>
        {label} {required ? <span>必須</span> : <small>任意</small>}
      </label>
      {children}
      <p id={`${id}-help`} className={styles.helper}>{helper}</p>
      <p id={`${id}-error`} className={styles.fieldError} aria-live="polite">
        {error ?? ""}
      </p>
    </div>
  );
}
