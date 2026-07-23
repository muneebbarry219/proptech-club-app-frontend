import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { X } from "lucide-react-native";

export type RegistrationQuestion = { id: string; question: string; is_required: boolean; question_type: "text" | "multiple_choice" | "checkboxes"; options: string[] };

export default function EventRegistrationModal({ visible, eventId, eventTitle, questions, apiFetch, onClose, onSubmitted }: {
  visible: boolean; eventId: string; eventTitle: string; questions: RegistrationQuestion[];
  apiFetch: (path: string, options?: RequestInit) => Promise<Response>;
  onClose: () => void; onSubmitted: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => { if (!visible) setAnswers({}); }, [visible]);

  const submit = async () => {
    const missing = questions.find(item => item.is_required && (item.question_type === "checkboxes" ? selectedValues(answers[item.id]).length === 0 : !answers[item.id]?.trim()));
    if (missing) return Alert.alert("Answer required", `Please answer: ${missing.question}`);
    setSubmitting(true);
    try {
      const response = await apiFetch("/rpc/submit_event_registration", {
        method: "POST",
        body: JSON.stringify({ p_event_id: eventId, p_answers: questions.map(item => ({ question_id: item.id, answer: answers[item.id]?.trim() ?? "" })) }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        Alert.alert("Registration failed", error.message ?? "Please try again.");
        return;
      }
      onSubmitted();
    } finally { setSubmitting(false); }
  };

  const selectedValues = (value?: string) => {
    if (!value) return [] as string[];
    try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  };

  const toggleCheckbox = (questionId: string, option: string) => setAnswers(current => {
    const selected = selectedValues(current[questionId]);
    const next = selected.includes(option) ? selected.filter(item => item !== option) : [...selected, option];
    return { ...current, [questionId]: JSON.stringify(next) };
  });

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={s.sheet}>
        <View style={s.header}><View style={{ flex: 1 }}><Text style={s.title}>Register for event</Text><Text style={s.subtitle} numberOfLines={1}>{eventTitle}</Text></View><TouchableOpacity onPress={onClose} style={s.close}><X size={19} color="#312FB8" /></TouchableOpacity></View>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          {questions.map((item, index) => <View key={item.id}>
            <Text style={s.label}>{index + 1}. {item.question}{item.is_required ? " *" : ""}</Text>
            {item.question_type === "text" ? <TextInput value={answers[item.id] ?? ""} onChangeText={value => setAnswers(current => ({ ...current, [item.id]: value }))} style={s.input} multiline textAlignVertical="top" maxLength={2000} placeholder="Your answer" placeholderTextColor="#AAA" /> : <View style={s.options}>{item.options.map(option => {
              const selected = item.question_type === "checkboxes" ? selectedValues(answers[item.id]).includes(option) : answers[item.id] === option;
              return <TouchableOpacity key={option} style={[s.option, selected && s.optionSelected]} onPress={() => item.question_type === "checkboxes" ? toggleCheckbox(item.id, option) : setAnswers(current => ({ ...current, [item.id]: option }))}><View style={[item.question_type === "checkboxes" ? s.checkbox : s.radio, selected && s.choiceSelected]}>{selected && <Text style={s.checkmark}>✓</Text>}</View><Text style={[s.optionText, selected && s.optionTextSelected]}>{option}</Text></TouchableOpacity>;
            })}</View>}
          </View>)}
          <TouchableOpacity style={[s.submit, submitting && { opacity: 0.65 }]} disabled={submitting} onPress={submit}>{submitting ? <ActivityIndicator color="#FFF" /> : <Text style={s.submitText}>Submit registration</Text>}</TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,15,30,0.48)" },
  sheet: { maxHeight: "88%", borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: "#FFF", overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", padding: 18, borderBottomWidth: 1, borderBottomColor: "#EEEEF5" },
  title: { fontSize: 18, color: "#1A1A2E", fontFamily: "Outfit_700Bold" }, subtitle: { marginTop: 3, fontSize: 12, color: "#777" },
  close: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#EEEDFE", alignItems: "center", justifyContent: "center" },
  content: { padding: 18, paddingBottom: 34 }, label: { marginTop: 12, marginBottom: 7, color: "#29293C", fontSize: 13, fontFamily: "Outfit_600SemiBold" },
  input: { minHeight: 82, borderRadius: 12, borderWidth: 1, borderColor: "#DDDDEA", padding: 12, color: "#1A1A2E", backgroundColor: "#FAFAFD" },
  options: { gap: 8 }, option: { minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: "#DDDDEA", paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  optionSelected: { borderColor: "#312FB8", backgroundColor: "#F2F1FF" }, optionText: { flex: 1, color: "#45455A", fontSize: 13 }, optionTextSelected: { color: "#312FB8", fontFamily: "Outfit_600SemiBold" },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: "#AAA", alignItems: "center", justifyContent: "center" }, checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: "#AAA", alignItems: "center", justifyContent: "center" }, choiceSelected: { borderColor: "#312FB8", backgroundColor: "#312FB8" }, checkmark: { color: "#FFF", fontSize: 12, fontFamily: "Outfit_700Bold" },
  submit: { height: 52, marginTop: 22, borderRadius: 14, backgroundColor: "#312FB8", alignItems: "center", justifyContent: "center" }, submitText: { color: "#FFF", fontSize: 15, fontFamily: "Outfit_700Bold" },
});
