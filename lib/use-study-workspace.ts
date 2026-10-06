"use client";
import { useEffect, useRef, useState } from "react";
import {
  createLocalStorageAdapter,
  emptyState,
  localStorageAdapter,
  StudyState,
  StudyStorage,
} from "./study";
import { createCloudStorage, supabase } from "./supabase";
/** Owns persistence and identity changes; presentation stays independent. */
export function useStudyWorkspace() {
  const [state, setState] = useState<StudyState>(emptyState);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [sync, setSync] = useState(false);
  const [saved, setSaved] = useState("");
  const cache = useRef<StudyStorage>(localStorageAdapter);
  const cloud = useRef<StudyStorage | null>(null);
  const identity = useRef<string | null>(null);
  const generation = useRef(0);
  const queue = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    let active = true;
    const initial = generation.current;
    localStorageAdapter
      .load()
      .then((s) => {
        if (active && initial === generation.current) {
          setState(s);
          setReady(true);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    if (!supabase)
      return () => {
        active = false;
      };
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const userId = session?.user.id || null;
      if (
        event !== "SIGNED_OUT" &&
        event !== "SIGNED_IN" &&
        event !== "INITIAL_SESSION"
      )
        return;
      if (userId === identity.current) return;
      identity.current = userId;
      const token = ++generation.current;
      setReady(false);
      setSync(false);
      const userCache = userId
        ? createLocalStorageAdapter(`ocw-study-v1:user:${userId}`)
        : localStorageAdapter;
      const userCloud = userId ? createCloudStorage(userId) : null;
      cache.current = userCache;
      cloud.current = userCloud;
      // Supabase auth callbacks must return before making further auth requests.
      setTimeout(async () => {
        try {
          const next = await (userCloud || userCache).load();
          if (active && token === generation.current) {
            setState(next);
            setSync(!!userCloud);
            setReady(true);
            setSaved(userCloud ? "Account loaded" : "Local workspace");
          }
        } catch (e) {
          if (!active || token !== generation.current) return;
          setError(e instanceof Error ? e.message : "Unable to load account.");
          try {
            const next = await userCache.load();
            if (active && token === generation.current) {
              setState(next);
              setReady(true);
            }
          } catch (e) {
            setError(
              e instanceof Error
                ? e.message
                : "Unable to read local account cache.",
            );
          }
        }
      }, 0);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    cache.current
      .save(state)
      .then(() => setSaved("Saved on this device"))
      .catch((e) => setError(e.message));
    if (!sync || !cloud.current) return;
    const adapter = cloud.current;
    const token = generation.current;
    const timer = setTimeout(() => {
      queue.current = queue.current
        .catch(() => {})
        .then(async () => {
          if (token !== generation.current) return;
          await adapter.save(state);
          if (token === generation.current) setSaved("Synced to your account");
        })
        .catch((e) => {
          if (token === generation.current) setError(e.message);
        });
    }, 350);
    return () => clearTimeout(timer);
  }, [state, ready, sync]);
  return { state, setState, ready, error, setError, sync, saved, setSaved };
}
