import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { theme } from "../src/lib/theme";
import { registerHeartbeatTask } from "../src/lib/checkinTask";

export default function RootLayout() {
  useEffect(() => {
    registerHeartbeatTask();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.bg },
          animation: "fade",
        }}
      />
    </>
  );
}
