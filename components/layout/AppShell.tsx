import { ReactNode } from "react";
import { View, StyleSheet } from "react-native";
import AppHeader from "../navigation/AppHeader";
import BottomNav from "../navigation/BottomNav";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <View style={styles.container}>
      <AppHeader />
      <View style={styles.content}>{children}</View>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f1ff",
  },
  content: {
    flex: 1,
  },
});
