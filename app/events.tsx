import { View, Text, StyleSheet } from "react-native";
import AppShell from "../components/layout/AppShell";

export default function PlaceholderScreen() {
  return (
    <AppShell>
      <View style={styles.center}>
        <Text style={styles.sub}>events — coming soon</Text>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  sub: { fontSize: 14, color: "#aaa" },
});
