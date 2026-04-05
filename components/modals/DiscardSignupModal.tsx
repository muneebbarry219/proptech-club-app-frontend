import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AlertTriangle } from "lucide-react-native";

interface DiscardSignupModalProps {
  visible: boolean;
  onStay: () => void;
  onDiscard: () => void;
}

export default function DiscardSignupModal({
  visible,
  onStay,
  onDiscard,
}: DiscardSignupModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onStay}>
      <Pressable style={styles.backdrop} onPress={onStay}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.badge}>
            <AlertTriangle size={22} color="#B42318" strokeWidth={2.2} />
          </View>
          <Text style={styles.title}>Leave signup?</Text>
          <Text style={styles.text}>
            Your details will be lost and you will need to sign up again.
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.85} onPress={onStay}>
              <Text style={styles.secondaryTxt}>Keep Editing</Text>
            </TouchableOpacity>
            <LinearGradient colors={["#D7263D", "#A61B30"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryBtn}>
              <TouchableOpacity style={styles.primaryBtnInner} activeOpacity={0.85} onPress={onDiscard}>
                <Text style={styles.primaryTxt}>Discard Details</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 18, 40, 0.56)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 26,
    borderWidth: 1,
    borderColor: "rgba(49,47,184,0.10)",
    shadowColor: "#1B196A",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 12,
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#FFF1F1",
    borderWidth: 1,
    borderColor: "rgba(215,38,61,0.14)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 23,
    fontWeight: "900",
    color: "#121426",
    textAlign: "center",
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
    color: "#5c6278",
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  secondaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(49,47,184,0.16)",
    backgroundColor: "#F5F4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryTxt: {
    fontSize: 13,
    fontWeight: "700",
    color: "#312FB8",
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  primaryBtnInner: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryTxt: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
});
