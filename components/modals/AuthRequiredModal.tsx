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
        <Pressable style={styles.modalCard} onPress={() => { }}>
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
    backgroundColor: "rgba(15, 18, 40, 0.56)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 26,
    borderWidth: 1,
    borderColor: "rgba(49,47,184,0.10)",
    overflow: "hidden",
    shadowColor: "#1B196A",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 12,
  },
  modalBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#EEF0FF",
    borderWidth: 1,
    borderColor: "rgba(49,47,184,0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    alignSelf: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Outfit_600SemiBold",
    color: "#121426",
    marginBottom: 8,
    letterSpacing: 0,
    textAlign: "center",
  },
  modalText: {
    fontSize: 14,
    lineHeight: 18,
    color: "#5c6278",
    marginBottom: 18,
    textAlign: "center",
    fontFamily: "Outfit_400Regular",
    letterSpacing: 0,
  },
  modalButtonWrap: {
    borderRadius: 16,
    overflow: "hidden",
  },
  modalButton: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Outfit_700Bold",
    letterSpacing: 0,
  },
});
