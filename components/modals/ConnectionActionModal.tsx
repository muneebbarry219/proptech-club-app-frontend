import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Clock3, X } from "lucide-react-native";

interface ConnectionActionModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ConnectionActionModal({
  visible,
  title,
  message,
  confirmLabel,
  onClose,
  onConfirm,
}: ConnectionActionModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.card} onPress={() => {}}>
          <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.85}>
            <X size={14} color="#72768B" strokeWidth={2.2} />
          </TouchableOpacity>

          <View style={s.header}>
            <View style={s.iconWrap}>
              <Clock3 size={18} color="#312FB8" strokeWidth={2.2} />
            </View>
            <Text style={s.title}>{title}</Text>
            <Text style={s.message}>{message}</Text>
          </View>

          <View style={s.actions}>
            <TouchableOpacity style={s.secondaryBtn} activeOpacity={0.85} onPress={onClose}>
              <Text style={s.secondaryTxt}>Keep</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.primaryBtn} activeOpacity={0.85} onPress={onConfirm}>
              <Text style={s.primaryTxt}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,18,40,0.56)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#fff",
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(49,47,184,0.10)",
    shadowColor: "#1B196A",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 12,
  },
  closeBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(49,47,184,0.12)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  header: {
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 18,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(49,47,184,0.10)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontFamily: "Outfit_600SemiBold",
    letterSpacing: 0,
    color: "#171A34",
    textAlign: "center",
  },
  message: {
    marginTop: 6,
    fontSize: 12,
    color: "#6E7391",
    lineHeight: 18,
    textAlign: "center",
    fontFamily: "Outfit_400Regular",
    letterSpacing: 0,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
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
    fontFamily: "Outfit_600SemiBold",
    letterSpacing: 0,
    color: "#312FB8",
  },
  primaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#312FB8",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryTxt: {
    fontSize: 13,
    fontFamily: "Outfit_700Bold",
    letterSpacing: 0,
    color: "#fff",
  },
});
