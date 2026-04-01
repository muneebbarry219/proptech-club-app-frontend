import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Frown } from "lucide-react-native";

interface AuthRequiredModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AuthRequiredModal({ visible, onClose }: AuthRequiredModalProps) {
  const router = useRouter();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <View style={styles.modalBadge}>
            <Frown size={22} color="#312FB8" strokeWidth={2.1} />
          </View>
          <Text style={styles.modalTitle}>Sign in to unlock access</Text>
          <Text style={styles.modalText}>Create an account or sign in first to access this feature.</Text>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => {
              onClose();
              router.push("/auth/sign-in" as any);
            }}
            style={styles.modalButtonWrap}
          >
            <LinearGradient
              colors={["#312FB8", "#1B196A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modalButton}
            >
              <Text style={styles.modalButtonText}>Continue to Sign In</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 12, 24, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#fff",
    borderRadius: 26,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(49,47,184,0.08)",
    overflow: "hidden",
    shadowColor: "#1B196A",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 10,
  },
  modalBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#EEF0FF",
    borderWidth: 1,
    borderColor: "rgba(49,47,184,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    alignSelf: "center",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#121426",
    marginBottom: 6,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  modalText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#5c6278",
    marginBottom: 14,
    textAlign: "center",
  },
  modalButtonWrap: {
    borderRadius: 14,
    overflow: "hidden",
  },
  modalButton: {
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
});
