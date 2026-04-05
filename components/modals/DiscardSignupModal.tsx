import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";

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
          <Text style={styles.title}>Leave signup?</Text>
          <Text style={styles.text}>
            Your details will be lost and you will need to sign up again.
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.85} onPress={onStay}>
              <Text style={styles.secondaryTxt}>Keep Editing</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={onDiscard}>
              <Text style={styles.primaryTxt}>Discard Details</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 12, 24, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(49,47,184,0.08)",
  },
  title: {
    fontSize: 22,
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
    marginTop: 18,
  },
  secondaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
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
    height: 46,
    borderRadius: 14,
    backgroundColor: "#D7263D",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryTxt: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
});
