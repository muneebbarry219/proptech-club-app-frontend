import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  LayoutAnimation,
  UIManager,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Eye, EyeOff, X, Camera, Pencil, LogOut, Image as ImageIcon, Check } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuth, type Profile, type UserRole, type UserLocation } from "../../context/AuthContext";
import AppHeader from "../../components/navigation/AppHeader";
import BottomNav from "../../components/navigation/BottomNav";
import DiscardSignupModal from "../../components/modals/DiscardSignupModal";
import { AUTH_URL, SUPABASE_ANON_KEY } from "../../constants/supabase";
import { clearPendingSignupDraft, getPendingSignupDraft, type PendingSignupDraft } from "../../utils/pending-signup";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ROLES: { value: UserRole; label: string }[] = [
  { value: "developer", label: "Developer" },
  { value: "investor", label: "Investor" },
  { value: "broker", label: "Broker" },
  { value: "architect", label: "Architect" },
  { value: "tech", label: "Tech" },
];

const LOCATIONS: { value: UserLocation; label: string }[] = [
  { value: "karachi", label: "Karachi" },
  { value: "lahore", label: "Lahore" },
  { value: "islamabad", label: "Islamabad" },
  { value: "uae", label: "UAE" },
  { value: "ksa", label: "KSA" },
  { value: "other", label: "Other" },
];

const LOOKING_FOR_OPTIONS = [
  "Investment",
  "Sales",
  "Partnerships",
  "Tech Solutions",
  "Land",
  "Buyers",
  "Investors",
  "Joint Ventures",
];
const BIO_MAX_LENGTH = 120;

const ROLE_COLORS: Record<string, string> = {
  developer: "#312FB8",
  investor: "#0F6E56",
  broker: "#854F0B",
  architect: "#993556",
  tech: "#185FA5",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function PasswordSheet({
  visible,
  onClose,
  getAccessToken,
}: {
  visible: boolean;
  onClose: () => void;
  getAccessToken: () => string | null;
}) {
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setNewPass("");
    setConfirm("");
    setError("");
    setShowPass(false);
  };

  const handleSubmit = async () => {
    if (newPass.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPass !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = getAccessToken();
      if (!token) {
        setError("Not authenticated.");
        setLoading(false);
        return;
      }

      const payload = { password: newPass };
      console.log("[Backend Payload]", { method: "PUT", url: `${AUTH_URL}/user`, body: payload });
      const res = await fetch(`${AUTH_URL}/user`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message ?? "Failed to update password.");
        return;
      }

      reset();
      onClose();
      Alert.alert("Success", "Your password has been updated.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        reset();
        onClose();
      }}
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <Pressable
          style={ms.backdrop}
          onPress={() => {
            reset();
            onClose();
          }}
        >
          <Pressable style={ms.sheet} onPress={() => { }}>
            <View style={ms.handle} />
            <View style={ms.row}>
              <Text style={ms.title}>Change Password</Text>
              <TouchableOpacity
                onPress={() => {
                  reset();
                  onClose();
                }}
                style={ms.closeBtn}
              >
                <X size={18} color="#888" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {!!error && (
              <View style={ms.errBox}>
                <Text style={ms.errTxt}>{error}</Text>
              </View>
            )}

            <Text style={ms.fieldLabel}>NEW PASSWORD</Text>
            <View style={{ position: "relative", marginBottom: 16 }}>
              <TextInput
                style={[ms.input, { paddingRight: 48, marginBottom: 0 }]}
                value={newPass}
                onChangeText={setNewPass}
                placeholder="Min. 6 characters"
                placeholderTextColor="#bbb"
                secureTextEntry={!showPass}
                autoFocus
              />
              <TouchableOpacity onPress={() => setShowPass((v) => !v)} style={ms.eyeBtn}>
                {showPass ? <EyeOff size={16} color="#aaa" strokeWidth={2} /> : <Eye size={16} color="#aaa" strokeWidth={2} />}
              </TouchableOpacity>
            </View>

            <Text style={ms.fieldLabel}>CONFIRM PASSWORD</Text>
            <TextInput
              style={ms.input}
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Repeat new password"
              placeholderTextColor="#bbb"
              secureTextEntry={!showPass}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />

            <TouchableOpacity onPress={handleSubmit} disabled={loading} style={ms.saveWrap} activeOpacity={0.85}>
              <LinearGradient colors={["#312FB8", "#1B196A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={ms.saveBtn}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={ms.saveTxt}>Update Password</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <Text style={s.fieldLabel}>{label}</Text>;
}

function CompleteSignupFlow({
  existingUser,
  signUp,
  createProfile,
  signOut,
}: {
  existingUser: { id: string; email: string } | null;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  createProfile: (data: Omit<Profile, "id" | "is_verified" | "created_at">) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isDraftSignup = mode === "complete-signup";

  const [draft, setDraft] = useState<PendingSignupDraft | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(isDraftSignup);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const [company, setCompany] = useState("");
  const [currentFocus, setCurrentFocus] = useState("");
  const [role, setRole] = useState<UserRole | null>(null);
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [location, setLocation] = useState<UserLocation>("karachi");

  useEffect(() => {
    let active = true;

    (async () => {
      if (!isDraftSignup) {
        setLoadingDraft(false);
        return;
      }

      const pending = await getPendingSignupDraft();
      if (!active) return;

      if (!pending) {
        router.replace("/auth/sign-up");
        return;
      }

      setDraft(pending);
      setLoadingDraft(false);
    })();

    return () => {
      active = false;
    };
  }, [isDraftSignup, router]);

  const toggleLookingFor = (item: string) => {
    setLookingFor((prev) => (prev.includes(item) ? prev.filter((entry) => entry !== item) : [...prev, item]));
  };

  const validatePersonalStep = () => {
    if (!company.trim()) return "Please enter your company or organisation.";
    if (!role) return "Please select your role.";
    if (!location) return "Please select your location.";
    return "";
  };

  const validateProfessionalStep = () => {
    if (!currentFocus.trim()) return "Please enter your current focus.";
    if (!lookingFor.length) return "Please choose at least one option for looking for.";
    return "";
  };

  const handleDiscard = async () => {
    await clearPendingSignupDraft();
    if (existingUser) {
      await signOut();
    }
    setShowDiscardModal(false);
    router.replace("/auth/sign-up");
  };

  const handleSubmit = async () => {
    const validationError = validateProfessionalStep();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError("");

    if (!draft) {
      setSubmitting(false);
      setError("Your signup session expired. Please sign up again.");
      if (existingUser) {
        await signOut();
      }
      router.replace("/auth/sign-up");
      return;
    }

    if (!existingUser) {
      const signupResult = await signUp(draft.email, draft.password);
      if (signupResult.error) {
        setSubmitting(false);
        setError(signupResult.error);
        return;
      }
    }

    const profileResult = await createProfile({
      full_name: draft.fullName.trim(),
      company: company.trim(),
      role,
      current_focus: currentFocus.trim(),
      looking_for: lookingFor,
      location,
      whatsapp: draft.whatsapp.trim(),
      bio: null,
      avatar_url: null,
    });

    setSubmitting(false);

    if (profileResult.error) {
      setError(profileResult.error);
      return;
    }

    await clearPendingSignupDraft();
    router.replace("/home");
  };

  if (loadingDraft) {
    return (
      <View style={[s.container, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color="#312FB8" size="large" />
      </View>
    );
  }

  const flowTitle = existingUser ? "Complete Your Profile" : "Finish Your Signup";
  const flowSubtitle = existingUser
    ? "Complete the two required steps below before continuing."
    : "Complete the two required steps below to create your account.";
  const submitLabel = existingUser ? "Complete Profile" : "Create Account";
  const stepTitle = step === 1 ? "Personal Details" : "Professional Details";
  const stepSubtitle = step === 1 ? "Step 1 of 2" : "Step 2 of 2";
  const signupSummary = draft
    ? [draft.fullName, draft.email, draft.whatsapp].filter(Boolean)
    : [];

  const handleNextStep = () => {
    const validationError = validatePersonalStep();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setStep(2);
  };

  return (
    <LinearGradient colors={["#0f0e7a", "#1a18a0", "#312FB8"]} start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[s.completeScroll, { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 24) + 20 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity onPress={() => setShowDiscardModal(true)} style={s.back}>
            <ArrowLeft size={18} color="#fff" strokeWidth={2.4} />
          </TouchableOpacity>

          <View style={s.completeHeader}>
            <Text style={s.completeTitle}>{flowTitle}</Text>
            <Text style={s.completeSubtitle}>{flowSubtitle}</Text>
          </View>

          <View style={s.completeCard}>
            <View style={s.stepTabs}>
              <View style={[s.stepTab, step === 1 && s.stepTabActive]}>
                <Text style={[s.stepTabText, step === 1 && s.stepTabTextActive]}>1. Personal</Text>
              </View>
              <View style={[s.stepTab, step === 2 && s.stepTabActive]}>
                <Text style={[s.stepTabText, step === 2 && s.stepTabTextActive]}>2. Professional</Text>
              </View>
            </View>
            <Text style={s.stepTitle}>{stepTitle}</Text>
            <Text style={s.stepSubtitle}>{stepSubtitle}</Text>

            {!!error && (
              <View style={s.errorBox}>
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            {step === 1 ? (
              <>
                <Text style={s.label}>COMPANY / ORGANISATION</Text>
                <TextInput style={s.completeInput} value={company} onChangeText={setCompany} placeholder="Company name" placeholderTextColor="#aaa" />

                <Text style={[s.label, s.mt]}>ROLE</Text>
                <View style={s.chipsWrap}>
                  {ROLES.map((item) => (
                    <TouchableOpacity key={item.value} onPress={() => setRole(item.value)} style={[s.chip, role === item.value && s.chipOn]}>
                      <Text style={[s.chipTxt, role === item.value && s.chipTxtOn]}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[s.label, s.mt]}>LOCATION</Text>
                <View style={s.chipsWrap}>
                  {LOCATIONS.map((item) => (
                    <TouchableOpacity key={item.value} onPress={() => setLocation(item.value)} style={[s.chip, location === item.value && s.chipOn]}>
                      <Text style={[s.chipTxt, location === item.value && s.chipTxtOn]}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : (
              <>
                <Text style={[s.label, s.mt]}>CURRENT FOCUS</Text>
                <TextInput
                  style={[s.completeInput, s.completeTextarea]}
                  value={currentFocus}
                  onChangeText={setCurrentFocus}
                  placeholder="What are you currently focused on?"
                  placeholderTextColor="#aaa"
                  multiline
                  textAlignVertical="top"
                />

                <Text style={[s.label, s.mt]}>LOOKING FOR</Text>
                <View style={s.chipsWrap}>
                  {LOOKING_FOR_OPTIONS.map((item) => (
                    <TouchableOpacity key={item} onPress={() => toggleLookingFor(item)} style={[s.chip, lookingFor.includes(item) && s.chipOn]}>
                      <Text style={[s.chipTxt, lookingFor.includes(item) && s.chipTxtOn]}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {!!signupSummary.length && (
                  <View style={s.signupSummary}>
                    <Text style={s.signupSummaryLabel}>Saved from signup</Text>
                    <Text style={s.signupSummaryValue}>{signupSummary[0]}</Text>
                    {signupSummary.slice(1).map((item) => (
                      <Text key={item} style={s.signupSummaryMeta}>
                        {item}
                      </Text>
                    ))}
                  </View>
                )}
              </>
            )}

            <View style={s.stepActions}>
              {step === 2 ? (
                <TouchableOpacity onPress={() => { setError(""); setStep(1); }} activeOpacity={0.85} style={s.stepSecondaryBtn}>
                  <Text style={s.stepSecondaryBtnText}>Back</Text>
                </TouchableOpacity>
              ) : (
                <View style={s.stepActionSpacer} />
              )}

              {step === 1 ? (
                <TouchableOpacity onPress={handleNextStep} activeOpacity={0.85} style={s.stepPrimaryBtnWrap}>
                  <LinearGradient colors={["#312FB8", "#1B196A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.submitBtn}>
                    <Text style={s.submitText}>Continue</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={handleSubmit} disabled={submitting} activeOpacity={0.85} style={s.stepPrimaryBtnWrap}>
                  <LinearGradient colors={["#312FB8", "#1B196A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.submitBtn}>
                    {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>{submitLabel}</Text>}
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <DiscardSignupModal visible={showDiscardModal} onStay={() => setShowDiscardModal(false)} onDiscard={handleDiscard} />
    </LinearGradient>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, updateProfile, signOut, getAccessToken, signUp, createProfile, isLoading } = useAuth();
  const { mode } = useLocalSearchParams<{ mode?: string }>();

  const isCompletingSignup = mode === "complete-signup" || (!isLoading && !!user && !profile);

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [whatsapp, setWhatsapp] = useState(profile?.whatsapp ?? "");
  const [company, setCompany] = useState(profile?.company ?? "");
  const [currentFocus, setCurrentFocus] = useState(profile?.current_focus ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [avatarUri, setAvatarUri] = useState(profile?.avatar_url ?? "");
  const [role, setRole] = useState<UserRole | null>(profile?.role ?? null);
  const [lookingFor, setLookingFor] = useState<string[]>(profile?.looking_for ?? []);
  const [location, setLocation] = useState<UserLocation>(profile?.location ?? "karachi");

  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState(false);
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [savingProfessional, setSavingProfessional] = useState(false);
  const [savedPersonal, setSavedPersonal] = useState(false);
  const [savedProfessional, setSavedProfessional] = useState(false);
  const [editingTopBio, setEditingTopBio] = useState(false);
  const [savingTopBio, setSavingTopBio] = useState(false);
  const [savedTopBio, setSavedTopBio] = useState(false);

  const [passwordSheetOpen, setPasswordSheetOpen] = useState(false);
  const [cameraSheetOpen, setCameraSheetOpen] = useState(false);
  const [signOutModalOpen, setSignOutModalOpen] = useState(false);
  const [saveErr, setSaveErr] = useState("");

  useEffect(() => {
    if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [
    editingPersonal,
    savingPersonal,
    savedPersonal,
    editingProfessional,
    savingProfessional,
    savedProfessional,
    editingTopBio,
    savingTopBio,
    savedTopBio,
  ]);

  const cancelPersonalEdit = () => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setWhatsapp(profile.whatsapp ?? "");
    setLocation(profile.location ?? "karachi");
    setEditingPersonal(false);
  };

  const cancelProfessionalEdit = () => {
    if (!profile) return;
    setCompany(profile.company ?? "");
    setRole(profile.role ?? null);
    setCurrentFocus(profile.current_focus ?? "");
    setLookingFor(profile.looking_for ?? []);
    setEditingProfessional(false);
  };

  const cancelTopBioEdit = () => {
    if (!profile) return;
    setBio(profile.bio ?? "");
    setEditingTopBio(false);
  };

  const handleSavePersonal = async () => {
    setSavingPersonal(true);
    setSaveErr("");

    const result = await updateProfile({
      full_name: fullName.trim(),
      whatsapp: whatsapp.trim() || null,
      location,
    });

    setSavingPersonal(false);
    if (result.error) {
      setSaveErr(result.error);
      return;
    }
    setEditingPersonal(false);
    setSavedPersonal(true);
    setTimeout(() => setSavedPersonal(false), 1000);
  };

  const handleSaveProfessional = async () => {
    if (!role) {
      setSaveErr("Please select a role.");
      return;
    }

    setSavingProfessional(true);
    setSaveErr("");

    const result = await updateProfile({
      company: company.trim() || null,
      role,
      current_focus: currentFocus.trim() || null,
      looking_for: lookingFor,
    });

    setSavingProfessional(false);
    if (result.error) {
      setSaveErr(result.error);
      return;
    }
    setEditingProfessional(false);
    setSavedProfessional(true);
    setTimeout(() => setSavedProfessional(false), 1000);
  };

  const handleSaveTopBio = async () => {
    setSavingTopBio(true);
    setSaveErr("");

    const result = await updateProfile({
      bio: bio.trim() || null,
    });

    setSavingTopBio(false);
    if (result.error) {
      setSaveErr(result.error);
      return;
    }
    setEditingTopBio(false);
    setSavedTopBio(true);
    setTimeout(() => setSavedTopBio(false), 1000);
  };

  const toggleLookingFor = (item: string) => {
    setLookingFor((prev) => (prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]));
  };

  const handleSignOut = () => {
    setSignOutModalOpen(true);
  };

  const confirmSignOut = async () => {
    setSignOutModalOpen(false);
    await signOut();
    router.replace("/home");
  };

  const openAvatarOptions = () => setCameraSheetOpen(true);

  const handleCameraOption = async (mode: "camera" | "gallery") => {
    setCameraSheetOpen(false);

    try {
      if (mode === "camera") {
        const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
        if (!cameraPerm.granted) {
          Alert.alert("Permission Needed", "Please allow camera access to take a profile picture.");
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

        if (result.canceled || !result.assets?.[0]?.uri) return;
        const nextUri = result.assets[0].uri;
        setAvatarUri(nextUri);
        const updateResult = await updateProfile({ avatar_url: nextUri });
        if (updateResult.error) {
          Alert.alert("Update Failed", updateResult.error);
        }
        return;
      }

      const galleryPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!galleryPerm.granted) {
        Alert.alert("Permission Needed", "Please allow gallery access to choose a profile picture.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;
      const nextUri = result.assets[0].uri;
      setAvatarUri(nextUri);
      const updateResult = await updateProfile({ avatar_url: nextUri });
      if (updateResult.error) {
        Alert.alert("Update Failed", updateResult.error);
      }
    } catch {
      Alert.alert("Error", "Unable to open camera/gallery right now. Please try again.");
    }
  };

  const renderAvatar = () => {
    if (avatarUri) {
      return <Image source={{ uri: avatarUri }} style={s.avatarImage} />;
    }
    return <Text style={s.avatarTxt}>{initials(displayName)}</Text>;
  };

  const avatarBg = role ? ROLE_COLORS[role] ?? "#312FB8" : "#312FB8";
  const displayName = fullName || profile?.full_name || "—";
  const roleLabel = ROLES.find((r) => r.value === role)?.label ?? "No role";
  const locLabel = LOCATIONS.find((l) => l.value === location)?.label ?? location;
  const bioText = bio.trim();

  if (isCompletingSignup) {
    return <CompleteSignupFlow existingUser={user} signUp={signUp} createProfile={createProfile} signOut={signOut} />;
  }

  if (!profile) {
    return (
      <View style={[s.container, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color="#312FB8" size="large" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <AppHeader />

      {!!saveErr && (
        <View style={s.errBar}>
          <Text style={s.errTxt}>{saveErr}</Text>
        </View>
      )}

      <View style={s.fixedTop}>
        <View style={s.hero}>
          <View style={s.hc1} />
          <View style={s.hc2} />

          <View style={s.avatarWrap}>
            <View style={[s.avatar, { backgroundColor: avatarBg }]}>
              <Text style={s.avatarTxt}>{initials(displayName)}</Text>
            </View>
            <TouchableOpacity style={s.cameraBtn} activeOpacity={0.85} onPress={openAvatarOptions}>
              <Camera size={14} color="#312FB8" strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          <Text style={s.heroName}>{displayName}</Text>
          <Text style={s.heroSub} numberOfLines={1}>
            {roleLabel} · {locLabel}
          </Text>
          <View style={s.heroBioWrap}>
            {editingTopBio ? (
              <TextInput
                style={s.heroBioInput}
                value={bio}
                onChangeText={setBio}
                placeholder="Add Bio..."
                placeholderTextColor="#b3b7c6"
                maxLength={BIO_MAX_LENGTH}
                multiline
                autoFocus
                textAlignVertical="top"
              />
            ) : (
              <Text style={[s.heroBio, !bioText && s.heroBioMuted]} numberOfLines={2}>
                {bioText || "Add Bio..."}
              </Text>
            )}
            <View style={[s.heroBioMetaRow, !editingTopBio && s.heroBioMetaRowCentered]}>
              {editingTopBio ? (
                <TouchableOpacity style={s.cancelEditBtn} onPress={cancelTopBioEdit} activeOpacity={0.85}>
                  <X size={12} color="#6C7085" strokeWidth={2.4} />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[s.heroBioActionBtn, savedTopBio && s.savedStateBtn]}
                activeOpacity={0.85}
                disabled={savingTopBio || savedTopBio}
                onPress={savedTopBio ? undefined : (editingTopBio ? handleSaveTopBio : () => setEditingTopBio(true))}
              >
                {savingTopBio ? (
                  <ActivityIndicator size="small" color="#312FB8" />
                ) : savedTopBio ? (
                  <Text style={s.savedStateBtnText}>Saved</Text>
                ) : (
                  <Text style={s.heroBioActionTxt}>{editingTopBio ? "Save Bio" : "Edit Bio"}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      <ScrollView style={s.scrollArea} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={s.section}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.secLabel}>Personal Details</Text>
            <View style={s.sectionActionRow}>
              {editingPersonal ? (
                <TouchableOpacity style={s.cancelEditBtn} onPress={cancelPersonalEdit} activeOpacity={0.85}>
                  <X size={12} color="#6C7085" strokeWidth={2.4} />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[s.editBtn, savedPersonal && s.savedStateBtn]}
                onPress={savedPersonal ? undefined : (editingPersonal ? handleSavePersonal : () => setEditingPersonal(true))}
                disabled={savingPersonal || savedPersonal}
                activeOpacity={0.85}
              >
                {savingPersonal ? (
                  <ActivityIndicator color="#312FB8" size="small" />
                ) : savedPersonal ? (
                  <Text style={s.savedStateBtnText}>Saved</Text>
                ) : (
                  <View style={s.editBtnContent}>
                    {editingPersonal ? (
                      <Check size={13} color="#312FB8" strokeWidth={2.6} />
                    ) : (
                      <Pencil size={13} color="#312FB8" strokeWidth={2.2} />
                    )}
                    <Text style={s.editBtnText}>{editingPersonal ? "Save Changes" : "Edit Personal Details"}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.cardNoIcon}>
            <FieldLabel label="Name" />
            {editingPersonal ? (
              <TextInput style={s.input} value={fullName} onChangeText={setFullName} placeholder="Full name" placeholderTextColor="#aaa" />
            ) : (
              <Text style={s.valueText}>{fullName || "—"}</Text>
            )}

            <FieldLabel label="Number" />
            {editingPersonal ? (
              <TextInput
                style={s.input}
                value={whatsapp}
                onChangeText={setWhatsapp}
                placeholder="Phone / WhatsApp"
                placeholderTextColor="#aaa"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={s.valueText}>{whatsapp || "Not set"}</Text>
            )}

            <FieldLabel label="Email" />
            <Text style={s.valueText}>{user?.email ?? "—"}</Text>

            <FieldLabel label="Location" />
            {editingPersonal ? (
              <View style={s.chipsWrap}>
                {LOCATIONS.map((l) => (
                  <TouchableOpacity key={l.value} onPress={() => setLocation(l.value)} style={[s.chip, location === l.value && s.chipOn]}>
                    <Text style={[s.chipTxt, location === l.value && s.chipTxtOn]}>{l.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={s.valueText}>{locLabel}</Text>
            )}

            <FieldLabel label="Password" />
            <View style={s.passwordRow}>
              <Text style={s.valueText}>••••••••</Text>
              {editingPersonal ? (
                <TouchableOpacity style={s.inlineAction} onPress={() => setPasswordSheetOpen(true)}>
                  <Text style={s.inlineActionText}>Change</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>

        <View style={s.section}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.secLabel}>Professional Details</Text>
            <View style={s.sectionActionRow}>
              {editingProfessional ? (
                <TouchableOpacity style={s.cancelEditBtn} onPress={cancelProfessionalEdit} activeOpacity={0.85}>
                  <X size={12} color="#6C7085" strokeWidth={2.4} />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[s.editBtn, savedProfessional && s.savedStateBtn]}
                onPress={savedProfessional ? undefined : (editingProfessional ? handleSaveProfessional : () => setEditingProfessional(true))}
                disabled={savingProfessional || savedProfessional}
                activeOpacity={0.85}
              >
                {savingProfessional ? (
                  <ActivityIndicator color="#312FB8" size="small" />
                ) : savedProfessional ? (
                  <Text style={s.savedStateBtnText}>Saved</Text>
                ) : (
                  <View style={s.editBtnContent}>
                    {editingProfessional ? (
                      <Check size={13} color="#312FB8" strokeWidth={2.6} />
                    ) : (
                      <Pencil size={13} color="#312FB8" strokeWidth={2.2} />
                    )}
                    <Text style={s.editBtnText}>{editingProfessional ? "Save Changes" : "Edit Professional Details"}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.cardNoIcon}>
            <FieldLabel label="Company / Organisation" />
            {editingProfessional ? (
              <TextInput style={s.input} value={company} onChangeText={setCompany} placeholder="Company" placeholderTextColor="#aaa" />
            ) : (
              <Text style={s.valueText}>{company || "Not set"}</Text>
            )}

            <FieldLabel label="Role" />
            {editingProfessional ? (
              <View style={s.chipsWrap}>
                {ROLES.map((r) => (
                  <TouchableOpacity key={r.value} onPress={() => setRole(r.value)} style={[s.chip, role === r.value && s.chipOn]}>
                    <Text style={[s.chipTxt, role === r.value && s.chipTxtOn]}>{r.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={s.valueText}>{roleLabel}</Text>
            )}

            <FieldLabel label="Current Focus" />
            {editingProfessional ? (
              <TextInput
                style={[s.input, s.textarea]}
                value={currentFocus}
                onChangeText={setCurrentFocus}
                placeholder="What are you currently focused on?"
                placeholderTextColor="#aaa"
                multiline
                textAlignVertical="top"
              />
            ) : (
              <Text style={s.valueText}>{currentFocus || "Not set"}</Text>
            )}

            <FieldLabel label="Looking For" />
            {editingProfessional ? (
              <View style={s.chipsWrap}>
                {LOOKING_FOR_OPTIONS.map((item) => (
                  <TouchableOpacity key={item} onPress={() => toggleLookingFor(item)} style={[s.chip, lookingFor.includes(item) && s.chipOn]}>
                    <Text style={[s.chipTxt, lookingFor.includes(item) && s.chipTxtOn]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={s.valueText}>{lookingFor.length ? lookingFor.join(", ") : "Not set"}</Text>
            )}
          </View>
        </View>

        <TouchableOpacity onPress={handleSignOut} activeOpacity={0.85} style={s.signOut}>
          <LogOut size={15} color="#dc2626" strokeWidth={2.2} />
          <Text style={s.signOutTxt}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <BottomNav />

      <Modal
        visible={signOutModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSignOutModalOpen(false)}
      >
        <Pressable style={s.signOutBackdrop} onPress={() => setSignOutModalOpen(false)}>
          <Pressable style={s.signOutModalCard} onPress={() => { }}>
            <TouchableOpacity
              style={s.signOutCloseBtn}
              onPress={() => setSignOutModalOpen(false)}
              activeOpacity={0.85}
            >
              <X size={14} color="#72768B" strokeWidth={2.2} />
            </TouchableOpacity>

            <LinearGradient
              colors={["#FFF1F1", "#FFECEC"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.signOutHeader}
            >
              <Text style={s.signOutTitle}>Sign Out?</Text>
              <Text style={s.signOutSubtitle}>You will need to sign in again to access your account.</Text>
            </LinearGradient>

            <View style={s.signOutActions}>
              <TouchableOpacity
                style={s.signOutCancelBtn}
                activeOpacity={0.85}
                onPress={() => setSignOutModalOpen(false)}
              >
                <Text style={s.signOutCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.signOutConfirmBtn}
                activeOpacity={0.85}
                onPress={confirmSignOut}
              >
                <LogOut size={14} color="#fff" strokeWidth={2.2} />
                <Text style={s.signOutConfirmTxt}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={cameraSheetOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCameraSheetOpen(false)}
      >
        <Pressable style={s.cameraBackdrop} onPress={() => setCameraSheetOpen(false)}>
          <Pressable style={s.cameraModalCard} onPress={() => { }}>
            <TouchableOpacity style={s.cameraCloseBtn} onPress={() => setCameraSheetOpen(false)} activeOpacity={0.85}>
              <X size={14} color="#72768B" strokeWidth={2.2} />
            </TouchableOpacity>

            <LinearGradient
              colors={["#F2F1FF", "#EEEAFE"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.cameraHeader}
            >
              <Text style={s.cameraTitle}>Update Profile Picture</Text>
              <Text style={s.cameraSubtitle}>Choose how you want to add your photo</Text>
            </LinearGradient>

            <View style={s.cameraActionsGrid}>
              <TouchableOpacity style={s.cameraOptionTile} activeOpacity={0.85} onPress={() => handleCameraOption("gallery")}>
                <View style={s.cameraOptionIconWrap}>
                  <ImageIcon size={18} color="#312FB8" strokeWidth={2.2} />
                </View>
                <Text style={s.cameraOptionLabel}>Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.cameraOptionTile} activeOpacity={0.85} onPress={() => handleCameraOption("camera")}>
                <View style={s.cameraOptionIconWrap}>
                  <Camera size={18} color="#312FB8" strokeWidth={2.2} />
                </View>
                <Text style={s.cameraOptionLabel}>Take Picture</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <PasswordSheet visible={passwordSheetOpen} onClose={() => setPasswordSheetOpen(false)} getAccessToken={getAccessToken} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8fc" },
  completeScroll: { flexGrow: 1, paddingHorizontal: 24 },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  completeHeader: { alignItems: "center", marginBottom: 28 },
  completeTitle: { color: "#fff", fontSize: 26, fontWeight: "900", marginBottom: 6, textAlign: "center" },
  completeSubtitle: { color: "rgba(255,255,255,0.68)", fontSize: 14, fontWeight: "500", textAlign: "center" },
  completeCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 12,
  },
  stepTabs: { flexDirection: "row", gap: 10, marginBottom: 18 },
  stepTab: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(49,47,184,0.14)",
    backgroundColor: "#F5F4FF",
    paddingVertical: 10,
    alignItems: "center",
  },
  stepTabActive: {
    backgroundColor: "#312FB8",
    borderColor: "#312FB8",
  },
  stepTabText: { fontSize: 12, fontWeight: "700", color: "#312FB8" },
  stepTabTextActive: { color: "#fff" },
  stepTitle: { fontSize: 18, fontWeight: "900", color: "#171A34" },
  stepSubtitle: { marginTop: 4, marginBottom: 16, fontSize: 12, color: "#6E7391", fontWeight: "600" },
  errorBox: {
    backgroundColor: "rgba(220,38,38,0.08)",
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.2)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: "#dc2626", fontSize: 13, fontWeight: "500" },
  label: { fontSize: 11, fontWeight: "700", color: "#555", letterSpacing: 0.5, marginBottom: 6 },
  mt: { marginTop: 14 },
  completeInput: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(49,47,184,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1a1a2e",
    backgroundColor: "#fafafe",
  },
  completeTextarea: { minHeight: 92, maxHeight: 140 },
  readonlyInput: { color: "#6E7391", backgroundColor: "#F3F4FA" },
  submitWrap: { marginTop: 22, borderRadius: 14, overflow: "hidden" },
  submitBtn: { height: 52, alignItems: "center", justifyContent: "center" },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  stepActions: { flexDirection: "row", gap: 12, marginTop: 22 },
  stepActionSpacer: { flex: 1 },
  stepSecondaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(49,47,184,0.16)",
    backgroundColor: "#F5F4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  stepSecondaryBtnText: { fontSize: 14, fontWeight: "700", color: "#312FB8" },
  stepPrimaryBtnWrap: { flex: 1, borderRadius: 14, overflow: "hidden" },
  signupSummary: {
    marginTop: 18,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(49,47,184,0.12)",
    backgroundColor: "#F6F5FF",
  },
  signupSummaryLabel: { fontSize: 11, fontWeight: "800", color: "#312FB8", letterSpacing: 0.4, marginBottom: 6 },
  signupSummaryValue: { fontSize: 14, fontWeight: "700", color: "#1a1a2e" },
  signupSummaryMeta: { fontSize: 12, color: "#6E7391", marginTop: 3 },
  fixedTop: {
    backgroundColor: "#312FB8",
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(15,12,82,0.24)",
  },
  scrollArea: { flex: 1 },
  errBar: {
    backgroundColor: "rgba(220,38,38,0.08)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(220,38,38,0.15)",
  },
  errTxt: { color: "#dc2626", fontSize: 13, fontWeight: "500" },
  hero: {
    paddingTop: 20,
    paddingBottom: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#312FB8",
  },
  hc1: {
    position: "absolute",
    right: -30,
    top: -30,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  hc2: {
    position: "absolute",
    left: -20,
    bottom: -20,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(17,13,78,0.34)",
  },
  avatarWrap: { position: "relative", marginBottom: 14 },
  avatar: { width: 86, height: 86, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  avatarImage: { width: "100%", height: "100%", borderRadius: 24 },
  avatarTxt: { color: "#fff", fontSize: 30, fontWeight: "900" },
  cameraBtn: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(49,47,184,0.15)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  heroName: { fontSize: 20, fontWeight: "900", color: "#fff", letterSpacing: -0.3 },
  heroSub: { fontSize: 13, color: "rgba(235,233,255,0.82)", fontWeight: "500", marginTop: 4, textTransform: "capitalize" },
  heroBioWrap: { marginTop: 14, minHeight: 36, width: "100%" },
  heroBio: { minHeight: 36, fontSize: 13, lineHeight: 18, color: "rgba(255,255,255,0.88)", textAlign: "center", paddingHorizontal: 20 },
  heroBioMuted: { color: "rgba(220,217,255,0.64)" },
  heroBioInput: {
    minHeight: 60,
    maxHeight: 60,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(49,47,184,0.14)",
    backgroundColor: "#f7f7ff",
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
    marginHorizontal: 20,
    fontSize: 13,
    lineHeight: 18,
    color: "#3f4560",
  },
  heroBioMetaRow: { marginTop: 6, marginHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  heroBioMetaRowCentered: { justifyContent: "center" },
  heroBioActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  heroBioActionTxt: { fontSize: 11, fontWeight: "700", color: "#fff" },
  savedStateBtn: { backgroundColor: "#DFF7E8", borderColor: "#BDE8CD" },
  savedStateBtnText: { fontSize: 12, fontWeight: "700", color: "#0A7A3E" },

  section: { paddingHorizontal: 16, marginTop: 22 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionActionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cancelEditBtn: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "rgba(49,47,184,0.15)",
    backgroundColor: "#F7F7FF",
    alignItems: "center",
    justifyContent: "center",
  },
  secLabel: { fontSize: 13, fontWeight: "800", color: "#1a1a2e" },
  editBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(49,47,184,0.14)",
    backgroundColor: "#F2F1FF",
    paddingHorizontal: 12,
    paddingVertical: 7,
    minWidth: 138,
    alignItems: "center",
  },
  editBtnText: { fontSize: 12, fontWeight: "700", color: "#312FB8" },
  editBtnContent: { flexDirection: "row", alignItems: "center", gap: 6 },

  cardNoIcon: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: "rgba(49,47,184,0.08)",
    padding: 14,
    gap: 8,
  },
  fieldLabel: { fontSize: 11, fontWeight: "700", color: "#8f94a6", marginTop: 8 },
  valueText: { fontSize: 14, color: "#1a1a2e", lineHeight: 20 },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(49,47,184,0.15)",
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#1a1a2e",
    backgroundColor: "#fafafe",
  },
  textarea: { height: 92, paddingTop: 12, paddingBottom: 12 },

  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(49,47,184,0.15)",
    backgroundColor: "#fafafe",
  },
  chipOn: { backgroundColor: "#312FB8", borderColor: "#312FB8" },
  chipTxt: { fontSize: 12, fontWeight: "600", color: "#555" },
  chipTxtOn: { color: "#fff" },

  passwordRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  inlineAction: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: "#EEEDFE" },
  inlineActionText: { color: "#312FB8", fontSize: 12, fontWeight: "700" },

  signOut: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(220,38,38,0.16)",
    backgroundColor: "#FFF3F3",
  },
  signOutTxt: { fontSize: 15, fontWeight: "700", color: "#dc2626" },
  cameraBackdrop: { flex: 1, backgroundColor: "rgba(15,18,40,0.56)", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  cameraModalCard: {
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
  cameraCloseBtn: {
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
  cameraHeader: { paddingTop: 28, paddingBottom: 20, paddingHorizontal: 18 },
  cameraTitle: { fontSize: 18, fontWeight: "900", color: "#171A34" },
  cameraSubtitle: { marginTop: 4, fontSize: 12, color: "#6E7391", lineHeight: 18 },
  cameraActionsGrid: { padding: 16, flexDirection: "row", justifyContent: "space-between", gap: 12 },
  cameraOptionTile: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 18,
    backgroundColor: "#F6F5FF",
    borderWidth: 1,
    borderColor: "rgba(49,47,184,0.16)",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },
  cameraOptionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(49,47,184,0.10)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  cameraOptionLabel: { fontSize: 13, fontWeight: "800", color: "#312FB8", textAlign: "center" },
  signOutBackdrop: { flex: 1, backgroundColor: "rgba(15,18,40,0.56)", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  signOutModalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#fff",
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.14)",
    shadowColor: "#1B196A",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 12,
  },
  signOutCloseBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.18)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  signOutHeader: { paddingTop: 28, paddingBottom: 20, paddingHorizontal: 18 },
  signOutTitle: { fontSize: 18, fontWeight: "900", color: "#481212" },
  signOutSubtitle: { marginTop: 4, fontSize: 12, color: "#8A4B4B", lineHeight: 18 },
  signOutActions: { flexDirection: "row", gap: 10, padding: 16 },
  signOutCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(49,47,184,0.16)",
    backgroundColor: "#F5F4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  signOutCancelTxt: { fontSize: 13, fontWeight: "700", color: "#312FB8" },
  signOutConfirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#D7263D",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  signOutConfirmTxt: { fontSize: 13, fontWeight: "700", color: "#fff" },
});

const ms = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(15,18,40,0.56)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: "rgba(49,47,184,0.10)",
    shadowColor: "#1B196A",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 14,
  },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: "#DADCF0", alignSelf: "center", marginBottom: 18 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  title: { fontSize: 20, fontWeight: "900", color: "#171A34" },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#F5F4FF",
    borderWidth: 1,
    borderColor: "rgba(49,47,184,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(49,47,184,0.15)",
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#1a1a2e",
    backgroundColor: "#fafafe",
    marginBottom: 20,
  },
  saveWrap: { borderRadius: 16, overflow: "hidden" },
  saveBtn: { height: 52, alignItems: "center", justifyContent: "center" },
  saveTxt: { color: "#fff", fontSize: 16, fontWeight: "800" },
  fieldLabel: { fontSize: 11, fontWeight: "700", color: "#555", letterSpacing: 0.5, marginBottom: 8 },
  errBox: {
    backgroundColor: "rgba(220,38,38,0.08)",
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.2)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errTxt: { color: "#dc2626", fontSize: 13, fontWeight: "500" },
  eyeBtn: { position: "absolute", right: 14, top: 16 },
  textarea: { height: 100, paddingTop: 14, paddingBottom: 14 },
});

