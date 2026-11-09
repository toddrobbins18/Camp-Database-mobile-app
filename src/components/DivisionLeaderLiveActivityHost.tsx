import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo";
import * as LiveActivity from "expo-live-activity";
import { useCampOperationalDate } from "../hooks/useCampOperationalDate";
import { useDivisionLeaderNow } from "../hooks/useDivisionLeaderNow";
import { divisionLeaderLiveActivityContent } from "../lib/divisionLeaderLiveActivity";

type NativeState = LiveActivity.LiveActivityState;

const CONFIG: LiveActivity.LiveActivityConfig = {
  backgroundColor: "#FFFFFF",
  titleColor: "#0a1e42",
  subtitleColor: "#4b5563",
  progressViewTint: "#2563eb",
  progressViewLabelColor: "#0a1e42",
  deepLinkUrl: "/dashboard",
  timerType: "digital",
};

function toNativeState(title: string, subtitle: string, endMs: number): NativeState {
  return {
    title,
    subtitle,
    progressBar: { date: endMs },
    imageName: "nest",
    dynamicIslandImageName: "nest",
  };
}

function iosLiveActivities(): boolean {
  return Platform.OS === "ios" && requireOptionalNativeModule("ExpoLiveActivity") != null;
}

export function DivisionLeaderLiveActivityHost() {
  const state = useDivisionLeaderNow();
  const { operationalDateString } = useCampOperationalDate();
  const activityIdRef = useRef<string | null>(null);
  const dismissedKeyRef = useRef<string | null>(null);
  const lastKeyRef = useRef<string | null>(null);
  const lastNativeRef = useRef<NativeState>(toNativeState("Schedule", "", Date.now()));

  useEffect(() => {
    if (!iosLiveActivities()) return;
    const sub = LiveActivity.addActivityUpdatesListener((event) => {
      if (event.activityID !== activityIdRef.current) return;
      if (event.activityState === "dismissed" || event.activityState === "ended") {
        dismissedKeyRef.current = lastKeyRef.current;
        activityIdRef.current = null;
      }
    });
    return () => {
      sub?.remove();
      const id = activityIdRef.current;
      if (!id) return;
      try {
        LiveActivity.stopActivity(id, lastNativeRef.current);
      } catch {
        // Native module missing until a new iOS build.
      }
      activityIdRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!iosLiveActivities()) {
      if (__DEV__ && Platform.OS === "ios") {
        console.warn("[LiveActivity] Native module is missing. Rebuild iOS after prebuild.");
      }
      return;
    }
    const content = divisionLeaderLiveActivityContent(state, operationalDateString, {
      allowIdle: __DEV__,
    });

    try {
      if (!content) {
        if (activityIdRef.current) {
          LiveActivity.stopActivity(activityIdRef.current, lastNativeRef.current);
          activityIdRef.current = null;
        }
        lastKeyRef.current = null;
        return;
      }

      const native = toNativeState(content.title, content.subtitle, content.endMs);
      lastNativeRef.current = native;

      if (dismissedKeyRef.current === content.key) return;
      dismissedKeyRef.current = null;

      if (activityIdRef.current) {
        if (lastKeyRef.current === content.key) return;
        lastKeyRef.current = content.key;
        LiveActivity.updateActivity(activityIdRef.current, native);
        return;
      }

      lastKeyRef.current = content.key;
      const id = LiveActivity.startActivity(native, CONFIG);
      if (id) {
        activityIdRef.current = id;
        if (__DEV__) console.log("[LiveActivity] started", id, native.title);
      } else if (__DEV__) {
        console.warn("[LiveActivity] startActivity returned nothing");
      }
    } catch (error) {
      console.warn("[LiveActivity] start failed", error);
    }
  }, [state, operationalDateString]);

  return null;
}
