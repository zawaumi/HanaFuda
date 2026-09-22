"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  dataSource,
  isApiError,
  type Conversation,
  type Person,
} from "@/lib/api";
import styles from "./home-dashboard.module.css";

const quickTopics = [
  {
    label: "最近の発見",
    starter: "最近、ちょっと面白かったことってありますか？",
  },
  {
    label: "休日の過ごし方",
    starter: "休みの日は、どんなことをして過ごすことが多いですか？",
  },
  {
    label: "次にやりたいこと",
    starter: "これから挑戦してみたいことってありますか？",
  },
] as const;

type HomeState =
  | { status: "loading" }
  | { status: "ready"; persons: Person[]; conversations: Conversation[] }
  | { status: "error"; message: string };

type RecentPerson = Person & { lastConversationAt: string };

function buildRecentPersons(
  persons: Person[],
  conversations: Conversation[],
): RecentPerson[] {
  const latestByPerson = new Map<string, string>();

  for (const conversation of conversations) {
    if (!conversation.person_id) continue;
    const current = latestByPerson.get(conversation.person_id);
    if (!current || conversation.created_at > current) {
      latestByPerson.set(conversation.person_id, conversation.created_at);
    }
  }

  return persons
    .flatMap((person) => {
      const lastConversationAt = latestByPerson.get(person.id);
      return lastConversationAt ? [{ ...person, lastConversationAt }] : [];
    })
    .sort((left, right) =>
      right.lastConversationAt.localeCompare(left.lastConversationAt),
    )
    .slice(0, 4);
}

function formatConversationDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
  }).format(new Date(value));
}

function errorMessage(error: unknown) {
  return isApiError(error)
    ? error.message
    : "データを読み込めませんでした。時間をおいて再度お試しください。";
}

async function fetchHomeData() {
  const [persons, conversations] = await Promise.all([
    dataSource.getPersons(),
    dataSource.getConversations(),
  ]);
  return { persons, conversations };
}

export function HomeDashboard() {
  const [state, setState] = useState<HomeState>({ status: "loading" });

  const loadHome = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const { persons, conversations } = await fetchHomeData();
      setState({ status: "ready", persons, conversations });
    } catch (error) {
      setState({ status: "error", message: errorMessage(error) });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchHomeData()
      .then(({ persons, conversations }) => {
        if (!cancelled) setState({ status: "ready", persons, conversations });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ status: "error", message: errorMessage(error) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const recentPersons = useMemo(
    () =>
      state.status === "ready"
        ? buildRecentPersons(state.persons, state.conversations)
        : [],
    [state],
  );

  return (
    <div className={styles.home}>
      <h1 className="visually-hidden">ホーム</h1>

      <section className={`${styles.hero} surface`} aria-labelledby="new-person">
        <div>
          <span className="status-chip">初めて会う人</span>
          <h2 id="new-person">相手を登録して、会話を準備</h2>
          <p>名前と関係だけでも始められます。詳しい情報は後から追加できます。</p>
        </div>
        <Link className="button button-primary" href="/connections/new">
          相手を登録する
          <span aria-hidden="true">›</span>
        </Link>
      </section>

      <section className={`${styles.section} ${styles.quickSection}`} aria-labelledby="quick-topics">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.sectionLabel}>QUICK TOPICS</p>
            <h2 id="quick-topics">さくっと話題</h2>
          </div>
          <p>相手を登録せず、そのまま使える話題です。</p>
        </div>
        <ol className={styles.topicGrid}>
          {quickTopics.map((topic, index) => (
            <li className={`${styles.topicCard} surface`} key={topic.label}>
              <span className={styles.topicNumber}>0{index + 1}</span>
              <h3>{topic.label}</h3>
              <p>「{topic.starter}」</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={`${styles.section} ${styles.recentSection}`} aria-labelledby="recent-people">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.sectionLabel}>RECENT</p>
            <h2 id="recent-people">最近話した人</h2>
          </div>
          <Link className={styles.textLink} href="/connections">
            すべて見る <span aria-hidden="true">›</span>
          </Link>
        </div>

        {state.status === "loading" ? <RecentPeopleLoading /> : null}

        {state.status === "error" ? (
          <div className={`${styles.feedback} surface`} role="alert">
            <div>
              <h3>読み込みに失敗しました</h3>
              <p>{state.message}</p>
            </div>
            <button className={styles.retryButton} type="button" onClick={loadHome}>
              もう一度試す
            </button>
          </div>
        ) : null}

        {state.status === "ready" && recentPersons.length === 0 ? (
          <div className={`${styles.feedback} surface`}>
            <div>
              <h3>まだ会話履歴がありません</h3>
              <p>相手を登録して、最初の会話を準備しましょう。</p>
            </div>
            <Link className={styles.secondaryButton} href="/connections/new">
              相手を登録する
            </Link>
          </div>
        ) : null}

        {state.status === "ready" && recentPersons.length > 0 ? (
          <ul className={styles.personGrid}>
            {recentPersons.map((person) => (
              <li className={`${styles.personCard} surface`} key={person.id}>
                <div className={styles.personTopline}>
                  <span className={styles.personAvatar} aria-hidden="true">
                    {person.name.slice(0, 1)}
                  </span>
                  <div>
                    <h3>{person.name}</h3>
                    <p>{person.relationship}</p>
                  </div>
                </div>
                <p className={styles.personNote}>{person.known_information}</p>
                <div className={styles.personFooter}>
                  <span>最終会話: {formatConversationDate(person.lastConversationAt)}</span>
                  <Link href={`/connections/${person.id}/deck/new`}>
                    話題を準備 <span aria-hidden="true">›</span>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}

function RecentPeopleLoading() {
  return (
    <div className={styles.personGrid} aria-busy="true" aria-label="読み込み中">
      {[0, 1].map((item) => (
        <div className={`${styles.personCard} ${styles.skeleton} surface`} key={item}>
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}
