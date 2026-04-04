import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { theme } from "../src/lib/theme";

export default function RootLayout() {
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
