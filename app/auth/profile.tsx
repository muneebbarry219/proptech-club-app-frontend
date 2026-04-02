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
import { useRouter } from "expo-router";
import { Eye, EyeOff, X, Camera, Pencil, LogOut, Image as ImageIcon, Check } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuth, type UserRole, type UserLocation } from "../../context/AuthContext";
import AppHeader from "../../components/navigation/AppHeader";
import BottomNav from "../../components/navigation/BottomNav";
import { AUTH_URL, SUPABASE_ANON_KEY } from "../../constants/supabase";

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
          <Pressable style={ms.sheet} onPress={() => {}}>
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

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, membership, updateProfile, signOut, getAccessToken } = useAuth();

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
          <Pressable style={s.signOutModalCard} onPress={() => {}}>
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
          <Pressable style={s.cameraModalCard} onPress={() => {}}>
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
  fixedTop: { backgroundColor: "#fff", borderBottomWidth: 0.5, borderBottomColor: "rgba(49,47,184,0.08)" },
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
  },
  hc1: {
    position: "absolute",
    right: -30,
    top: -30,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(49,47,184,0.05)",
  },
  hc2: {
    position: "absolute",
    left: -20,
    bottom: -20,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(49,47,184,0.04)",
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
  heroName: { fontSize: 20, fontWeight: "900", color: "#1a1a2e", letterSpacing: -0.3 },
  heroSub: { fontSize: 13, color: "#888", fontWeight: "500", marginTop: 4, textTransform: "capitalize" },
  heroBioWrap: { marginTop: 14, minHeight: 36, width: "100%" },
  heroBio: { minHeight: 36, fontSize: 13, lineHeight: 18, color: "#5f6478", textAlign: "center", paddingHorizontal: 20 },
  heroBioMuted: { color: "#b3b7c6" },
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
    borderColor: "rgba(49,47,184,0.16)",
    backgroundColor: "#F2F1FF",
  },
  heroBioActionTxt: { fontSize: 11, fontWeight: "700", color: "#312FB8" },
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
  cameraBackdrop: { flex: 1, backgroundColor: "rgba(17,20,42,0.38)", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  cameraModalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(49,47,184,0.10)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 8,
  },
  cameraCloseBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 1,
    borderColor: "rgba(49,47,184,0.12)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  cameraHeader: { paddingTop: 22, paddingBottom: 18, paddingHorizontal: 16 },
  cameraTitle: { fontSize: 16, fontWeight: "800", color: "#171A34" },
  cameraSubtitle: { marginTop: 4, fontSize: 12, color: "#6E7391" },
  cameraActionsGrid: { padding: 14, flexDirection: "row", justifyContent: "space-between", gap: 12 },
  cameraOptionTile: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: "#F6F5FF",
    borderWidth: 1,
    borderColor: "rgba(49,47,184,0.16)",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },
  cameraOptionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "rgba(49,47,184,0.10)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  cameraOptionLabel: { fontSize: 12, fontWeight: "700", color: "#312FB8", textAlign: "center" },
  signOutBackdrop: { flex: 1, backgroundColor: "rgba(17,20,42,0.38)", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  signOutModalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.14)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 8,
  },
  signOutCloseBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.88)",
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.18)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  signOutHeader: { paddingTop: 22, paddingBottom: 18, paddingHorizontal: 16 },
  signOutTitle: { fontSize: 16, fontWeight: "800", color: "#481212" },
  signOutSubtitle: { marginTop: 4, fontSize: 12, color: "#8A4B4B" },
  signOutActions: { flexDirection: "row", gap: 10, padding: 14 },
  signOutCancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(49,47,184,0.16)",
    backgroundColor: "#F5F4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  signOutCancelTxt: { fontSize: 13, fontWeight: "700", color: "#312FB8" },
  signOutConfirmBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#D7263D",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  signOutConfirmTxt: { fontSize: 13, fontWeight: "700", color: "#fff" },
});

const ms = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(10,12,24,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#e0e0e0", alignSelf: "center", marginBottom: 20 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  title: { fontSize: 18, fontWeight: "800", color: "#1a1a2e" },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#f5f5f8", alignItems: "center", justifyContent: "center" },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(49,47,184,0.15)",
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#1a1a2e",
    backgroundColor: "#fafafe",
    marginBottom: 20,
  },
  saveWrap: { borderRadius: 14, overflow: "hidden" },
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



