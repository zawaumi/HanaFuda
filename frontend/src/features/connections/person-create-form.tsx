"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { StepCards, type StepCard } from "@/components/step-cards";
import { dataSource, isApiError, type Person } from "@/lib/api";
import { SeasonMark, seasonForIndex } from "@/lib/season";
import styles from "./person-create-form.module.css";

interface SuccessState {
  person: Person;
  situation: string;
}

const steps: StepCard[] = [
  {
    id: "person-name",
    prompt: "相手を、なんと呼びますか？",
    label: "名前・呼び名",
    helper: "空欄のままでも進めます。あとから変更できます。",
    placeholder: "例: 佐藤さん",
    maxLength: 51,
    required: false,
  },
  {
    id: "person-relationship",
    prompt: "その人とは、どんな関係ですか？",
    label: "自分との関係",
    helper: "どこで知り合ったか、いまどんな間柄かを書きます。",
    placeholder: "例: 大学のゼミ仲間",
    maxLength: 51,
    required: true,
  },
  {
    id: "known-information",
    prompt: "その人について、知っていることは？",
    label: "知っていること",
    helper: "興味、最近聞いたこと、共通点など。空欄でも進めます。",
    placeholder: "例: 音楽が好き。最近ライブへ行った。",
    maxLength: 501,
    required: false,
    multiline: true,
  },
  {
    id: "meeting-situation",
    prompt: "今回は、どこで会いますか？",
    label: "会う場所・状況",
    helper: "このあとの話題づくりに使います。",
    placeholder: "例: ハッカソン会場で初めて会う",
    maxLength: 121,
    required: true,
  },
];

const limits: Record<string, { max: number; requiredMessage?: string }> = {
  "person-name": { max: 50 },
  "person-relationship": { max: 50, requiredMessage: "自分との関係を入力してください。" },
  "known-information": { max: 500 },
  "meeting-situation": { max: 120, requiredMessage: "会う場所や状況を入力してください。" },
};

function checkValue(id: string, value: string) {
  const limit = limits[id];
  const trimmed = value.trim();
  if (!trimmed && limit.requiredMessage) return limit.requiredMessage;
  if (trimmed.length > limit.max) return `${limit.max}文字以内で入力してください。`;
  return undefined;
}

function submitErrorMessage(error: unknown) {
  return isApiError(error)
    ? error.message
    : "登録できませんでした。時間をおいて再度お試しください。";
}

export function PersonCreateForm() {
  const submittingRef = useRef(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);

  function handleChange(id: string, value: string) {
    setValues((current) => ({ ...current, [id]: value }));
    setErrors((current) => ({ ...current, [id]: undefined }));
    setSubmitError(null);
  }

  function checkStep(id: string) {
    const message = checkValue(id, values[id] ?? "");
    setErrors((current) => ({ ...current, [id]: message }));
    return message;
  }

  async function complete() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const person = await dataSource.createPerson({
        name: (values["person-name"] ?? "").trim() || "名前不明",
        relationship: (values["person-relationship"] ?? "").trim(),
        known_information: (values["known-information"] ?? "").trim(),
      });
      setSuccess({ person, situation: (values["meeting-situation"] ?? "").trim() });
    } catch (error) {
      setSubmitError(submitErrorMessage(error));
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  if (success) {
    const parameters = new URLSearchParams({ situation: success.situation });
    return (
      <div className={styles.successPage}>
        <section className={`${styles.successCard} surface`} aria-live="polite">
          <span className={styles.successIcon} aria-hidden="true">
            <SeasonMark season={seasonForIndex(2)} />
          </span>
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
      <h1 className="visually-hidden">新しい相手を登録</h1>
      <StepCards
        steps={steps}
        values={values}
        errors={errors}
        onChange={handleChange}
        checkStep={checkStep}
        onComplete={() => { void complete(); }}
        submitting={isSubmitting}
        submitLabel={isSubmitting ? "登録中…" : "登録する"}
        cancel={<Link className={styles.textLink} href="/connections">キャンセル</Link>}
        banner={submitError ? (
          <div className={styles.submitError} role="alert">
            <strong>登録に失敗しました</strong>
            <span>{submitError}</span>
          </div>
        ) : null}
      />
    </div>
  );
}
