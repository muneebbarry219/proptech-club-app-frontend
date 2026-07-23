import { useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, CalendarDays, ImagePlus, Plus, Trash2 } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../context/AuthContext";
import { uploadEventCover, uploadEventSpeakerImage, uploadEventSponsorLogo } from "../../utils/uploadAvatar";

const ADMIN_USER_ID = "59a93ce0-0570-4f71-897a-162b72decf7e";
const EVENT_TYPES = ["meetup", "workshop", "webinar", "conference", "convention"];
type RegistrationChoice = "required" | "not_required" | null;
type SpeakerDraft = { id: string; name: string; image: string | null; phone: string; email: string; company: string };
type SponsorDraft = { id: string; name: string; logo: string | null };
type QuestionType = "text" | "multiple_choice" | "checkboxes";
type QuestionDraft = { id: string; question: string; isRequired: boolean; type: QuestionType; options: string[] };

const draftId = () => "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, char => {
  const value = Math.floor(Math.random() * 16);
  return (char === "x" ? value : (value & 0x3) | 0x8).toString(16);
});

function parseDateTime(date: string, time: string) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time.trim());
  if (!dateMatch || !timeMatch) return null;
  const [, year, month, day] = dateMatch.map(Number);
  const [, hours, minutes] = timeMatch.map(Number);
  if (hours > 23 || minutes > 59) return null;
  const value = new Date(year, month - 1, day, hours, minutes, 0, 0);
  if (value.getFullYear() !== year || value.getMonth() !== month - 1 || value.getDate() !== day) return null;
  return value.toISOString();
}

function dateParts(value: string | null | undefined) {
  if (!value) return { date: "", time: "" };
  const parsed = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return {
    date: `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`,
    time: `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`,
  };
}

export default function CreateEventScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, apiFetch, getAccessToken } = useAuth();
  const isAdmin = Platform.OS === "android" && isAuthenticated && user?.id === ADMIN_USER_ID;
  const isEditing = !!id;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [registrationDeadlineDate, setRegistrationDeadlineDate] = useState("");
  const [registrationDeadlineTime, setRegistrationDeadlineTime] = useState("");
  const [venue, setVenue] = useState("");
  const [location, setLocation] = useState("");
  const [eventType, setEventType] = useState("meetup");
  const [registrationChoice, setRegistrationChoice] = useState<RegistrationChoice>(null);
  const [registrationUrl, setRegistrationUrl] = useState("");
  const [featured, setFeatured] = useState(false);
  const [addSpeakers, setAddSpeakers] = useState<boolean | null>(null);
  const [addSponsors, setAddSponsors] = useState<boolean | null>(null);
  const [speakers, setSpeakers] = useState<SpeakerDraft[]>([]);
  const [sponsors, setSponsors] = useState<SponsorDraft[]>([]);
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditing);

  useEffect(() => {
    if (!isAdmin) router.replace("/events" as any);
  }, [isAdmin, router]);

  useEffect(() => {
    if (!id || !isAdmin) return;
    void (async () => {
      try {
        const response = await apiFetch(`/events?id=eq.${id}&select=*`);
        const rows = response.ok ? await response.json() : [];
        const event = rows[0];
        if (!event) {
          Alert.alert("Event not found", "This event may have been deleted.", [{ text: "OK", onPress: () => router.replace("/events" as any) }]);
          return;
        }
        const start = dateParts(event.event_date);
        const end = dateParts(event.end_date);
        const deadline = dateParts(event.registration_deadline);
        setTitle(event.title ?? ""); setDescription(event.description ?? "");
        setDate(start.date); setTime(start.time); setEndDate(end.date); setEndTime(end.time);
        setRegistrationDeadlineDate(deadline.date); setRegistrationDeadlineTime(deadline.time);
        setVenue(event.venue ?? ""); setLocation(event.location ?? "");
        setEventType(event.event_type ?? "meetup"); setRegistrationChoice(event.registration_type === "exclusive" ? "required" : "not_required");
        setRegistrationUrl(event.registration_url ?? "");
        setFeatured(!!event.is_featured); setCoverUri(event.cover_image ?? null);
        const [speakerResponse, speakerContactResponse, sponsorResponse, questionResponse] = await Promise.all([
          apiFetch(`/event_speakers?event_id=eq.${id}&select=*&order=sort_order.asc`),
          apiFetch(`/event_speaker_contacts?event_id=eq.${id}&select=speaker_id,phone,email`),
          apiFetch(`/event_sponsors?event_id=eq.${id}&select=*&order=sort_order.asc`),
          apiFetch(`/event_registration_questions?event_id=eq.${id}&select=*&order=sort_order.asc`),
        ]);
        const speakerRows = speakerResponse.ok ? await speakerResponse.json() : [];
        const speakerContacts = speakerContactResponse.ok ? await speakerContactResponse.json() : [];
        const sponsorRows = sponsorResponse.ok ? await sponsorResponse.json() : [];
        const questionRows = questionResponse.ok ? await questionResponse.json() : [];
        setSpeakers(speakerRows.map((item: any) => { const contact = speakerContacts.find((entry: any) => entry.speaker_id === item.id); return { id: item.id, name: item.name ?? "", image: item.photo_url, phone: contact?.phone ?? "", email: contact?.email ?? "", company: item.company ?? "" }; }));
        setSponsors(sponsorRows.map((item: any) => ({ id: item.id, name: item.name ?? "", logo: item.logo_url })));
        setQuestions(questionRows.map((item: any) => ({ id: item.id, question: item.question ?? "", isRequired: !!item.is_required, type: item.question_type ?? "text", options: Array.isArray(item.options) ? item.options : [] })));
        setAddSpeakers(speakerRows.length > 0); setAddSponsors(sponsorRows.length > 0);
      } finally { setLoading(false); }
    })();
  }, [apiFetch, id, isAdmin, router]);

  const pickCover = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo access to choose an event cover.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setCoverUri(result.assets[0].uri);
  };

  const pickDraftImage = async (onPicked: (uri: string) => void, square = false) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert("Permission needed", "Allow photo access to choose an image.");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      ...(square ? { aspect: [1, 1] as [number, number] } : {}),
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (square && asset.width !== asset.height) {
        Alert.alert("Square logo required", "Crop the sponsor logo to a square before continuing.");
        return;
      }
      onPicked(asset.uri);
    }
  };

  const updateSpeaker = (speakerId: string, values: Partial<SpeakerDraft>) => setSpeakers(current => current.map(item => item.id === speakerId ? { ...item, ...values } : item));
  const updateSponsor = (sponsorId: string, values: Partial<SponsorDraft>) => setSponsors(current => current.map(item => item.id === sponsorId ? { ...item, ...values } : item));

  const save = async () => {
    if (!title.trim()) return Alert.alert("Title required", "Enter a title for the event.");
    if (!description.trim()) return Alert.alert("Description required", "Enter a description for the event.");
    if (!coverUri) return Alert.alert("Cover required", "Choose an event picture before publishing.");
    if (!registrationChoice) return Alert.alert("Registration required", "Select whether registration is required.");
    if (addSpeakers === null) return Alert.alert("Speakers", "Select whether speakers will be added.");
    if (addSponsors === null) return Alert.alert("Sponsors", "Select whether sponsors will be added.");
    const startsAt = parseDateTime(date, time);
    if (!startsAt) return Alert.alert("Invalid date", "Use YYYY-MM-DD for the date and HH:MM for the time.");
    const finishesAt = endDate.trim() || endTime.trim() ? parseDateTime(endDate || date, endTime) : null;
    if ((endDate.trim() || endTime.trim()) && !finishesAt) {
      return Alert.alert("Invalid end date", "Use YYYY-MM-DD and HH:MM for the end date and time.");
    }
    if (finishesAt && new Date(finishesAt) < new Date(startsAt)) {
      return Alert.alert("Invalid date range", "The event must end after it starts.");
    }
    if (addSpeakers && speakers.length === 0) return Alert.alert("Speaker required", "Add at least one speaker or select No.");
    if (addSponsors && sponsors.length === 0) return Alert.alert("Sponsor required", "Add at least one sponsor or select No.");
    if (addSpeakers && speakers.some(item => !item.name.trim() || !item.image || !item.phone.trim() || !item.email.trim() || !item.company.trim())) return Alert.alert("Speaker details required", "Each speaker needs a name, image, phone, email, and company.");
    if (addSponsors && sponsors.some(item => !item.name.trim() || !item.logo)) return Alert.alert("Sponsor details required", "Each sponsor needs a name and logo.");
    if (registrationChoice === "required" && questions.length === 0) return Alert.alert("Registration question required", "Add at least one question to the in-app registration form.");
    if (registrationChoice === "required" && questions.some(item => !item.question.trim())) return Alert.alert("Question required", "Every registration question must have text.");
    if (registrationChoice === "required" && questions.some(item => item.type !== "text" && (item.options.length < 2 || item.options.some(option => !option.trim())))) return Alert.alert("Options required", "Multiple-choice and checkbox questions need at least two completed options.");
    const registrationDeadline = registrationChoice === "required" && (registrationDeadlineDate.trim() || registrationDeadlineTime.trim())
      ? parseDateTime(registrationDeadlineDate, registrationDeadlineTime)
      : null;
    if ((registrationDeadlineDate.trim() || registrationDeadlineTime.trim()) && !registrationDeadline) {
      return Alert.alert("Invalid registration deadline", "Enter both the deadline date and time using YYYY-MM-DD and HH:MM.");
    }
    if (registrationDeadline && new Date(registrationDeadline) > new Date(startsAt)) {
      return Alert.alert("Invalid registration deadline", "Registration must close before the event starts.");
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(), description: description.trim() || null,
        event_date: startsAt, end_date: finishesAt,
        venue: venue.trim() || null, location: location.trim() || null,
        event_type: eventType, registration_type: registrationChoice === "required" ? "exclusive" : "open",
        registration_url: null,
        registration_deadline: registrationChoice === "required" ? registrationDeadline : null,
        is_featured: featured, is_past: new Date(startsAt) < new Date(),
        is_published: isEditing, member_only: false,
      };
      const response = await apiFetch(isEditing ? `/events?id=eq.${id}` : "/events", {
        method: isEditing ? "PATCH" : "POST", body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        Alert.alert(`Could not ${isEditing ? "update" : "add"} event`, result?.message ?? result?.[0]?.message ?? "Check your event permissions and try again.");
        return;
      }
      const created = Array.isArray(result) ? result[0] : result;
      const eventId = created?.id ?? id;
      if (!eventId) throw new Error("The event was saved without an ID.");

      if (coverUri) {
        const token = getAccessToken();
        const uploadedCoverUrl = coverUri.startsWith("http") ? coverUri : token ? await uploadEventCover(coverUri, eventId, token) : null;
        const coverUrl = uploadedCoverUrl && !coverUri.startsWith("http") ? `${uploadedCoverUrl}?v=${Date.now()}` : uploadedCoverUrl;
        if (!coverUrl) throw new Error("The event cover could not be uploaded.");
        const coverResponse = await apiFetch(`/events?id=eq.${eventId}`, {
          method: "PATCH", body: JSON.stringify({ cover_image: coverUrl }),
        });
        if (!coverResponse.ok) throw new Error("The event cover was uploaded but could not be attached to the event.");
      }


      const token = getAccessToken();
      if (!token) throw new Error("Your admin session expired. Please sign in again.");
      const cleanupResponses = await Promise.all([
        apiFetch(`/event_speaker_contacts?event_id=eq.${eventId}`, { method: "DELETE" }),
        apiFetch(`/event_speakers?event_id=eq.${eventId}`, { method: "DELETE" }),
        apiFetch(`/event_sponsors?event_id=eq.${eventId}`, { method: "DELETE" }),
      ]);
      if (cleanupResponses.some(cleanupResponse => !cleanupResponse.ok)) throw new Error("Existing event participants could not be updated safely.");
      if (registrationChoice === "required") {
        const questionResponse = await apiFetch("/event_registration_questions?on_conflict=id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(questions.map((item, index) => ({ id: item.id, event_id: eventId, question: item.question.trim(), is_required: item.isRequired, question_type: item.type, options: item.type === "text" ? [] : item.options.map(option => option.trim()), sort_order: index }))) });
        if (!questionResponse.ok) throw new Error("The registration questions could not be saved.");
        const keepIds = questions.map(item => item.id).join(",");
        const removeQuestionsResponse = await apiFetch(`/event_registration_questions?event_id=eq.${eventId}&id=not.in.(${keepIds})`, { method: "DELETE" });
        if (!removeQuestionsResponse.ok) throw new Error("Removed registration questions could not be cleaned up.");
      } else {
        const removeQuestionsResponse = await apiFetch(`/event_registration_questions?event_id=eq.${eventId}`, { method: "DELETE" });
        if (!removeQuestionsResponse.ok) throw new Error("Registration questions could not be removed.");
      }
      if (addSpeakers && speakers.length) {
        const rows = await Promise.all(speakers.map(async (item, index) => {
          const uploaded = item.image?.startsWith("http") ? item.image : await uploadEventSpeakerImage(item.image!, eventId, item.id, token);
          return {
            id: item.id, event_id: eventId, name: item.name.trim(), company: item.company.trim(),
            photo_url: uploaded && !item.image?.startsWith("http") ? `${uploaded}?v=${Date.now()}` : uploaded,
            role: null, topic: null, bio: null, is_keynote: false, sort_order: index,
          };
        }));
        if (rows.some(item => !item.photo_url)) throw new Error("A speaker image could not be uploaded.");
        const response = await apiFetch("/event_speakers", { method: "POST", body: JSON.stringify(rows) });
        if (!response.ok) throw new Error("The event was saved, but speaker details could not be published.");
        const contactResponse = await apiFetch("/event_speaker_contacts", { method: "POST", body: JSON.stringify(speakers.map(item => ({ speaker_id: item.id, event_id: eventId, phone: item.phone.trim(), email: item.email.trim() }))) });
        if (!contactResponse.ok) throw new Error("The speaker contact details could not be saved securely.");
      }
      if (addSponsors && sponsors.length) {
        const rows = await Promise.all(sponsors.map(async (item, index) => {
          const uploaded = item.logo?.startsWith("http") ? item.logo : await uploadEventSponsorLogo(item.logo!, eventId, item.id, token);
          return {
            event_id: eventId, name: item.name.trim(),
            logo_url: uploaded && !item.logo?.startsWith("http") ? `${uploaded}?v=${Date.now()}` : uploaded,
            tier: "partner", website_url: null, sort_order: index,
          };
        }));
        if (rows.some(item => !item.logo_url)) throw new Error("A sponsor logo could not be uploaded.");
        const response = await apiFetch("/event_sponsors", { method: "POST", body: JSON.stringify(rows) });
        if (!response.ok) throw new Error("The event was saved, but sponsor details could not be published.");
      }
      const publishResponse = await apiFetch(`/events?id=eq.${eventId}`, { method: "PATCH", body: JSON.stringify({ is_published: true }) });
      if (!publishResponse.ok) throw new Error("The event details were saved but could not be published.");

      Alert.alert(isEditing ? "Event updated" : "Event published", isEditing ? "Your changes are now live." : "The event is now live.", [
        { text: "View event", onPress: () => router.replace(`/events/${eventId}` as any) },
      ]);
    } catch (error) {
      Alert.alert("Could not add event", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = () => {
    if (!id) return;
    Alert.alert("Delete event", "This permanently deletes the event and cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        setSaving(true);
        try {
          const response = await apiFetch(`/events?id=eq.${id}`, { method: "DELETE" });
          if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            Alert.alert("Delete failed", error?.message ?? error?.[0]?.message ?? "Could not delete this event.");
            return;
          }
          router.replace("/events" as any);
        } finally { setSaving(false); }
      } },
    ]);
  };

  if (!isAdmin) return null;
  if (loading) return <View style={s.loading}><ActivityIndicator color="#312FB8" size="large" /></View>;

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={s.back} onPress={() => router.back()}><ArrowLeft size={20} color="#312FB8" /></TouchableOpacity>
        <Text style={s.headerTitle}>{isEditing ? "Edit event" : "Add event"}</Text><View style={{ width: 40 }} />
      </View>
      <ScrollView
        contentContainerStyle={s.content}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={s.cover} onPress={pickCover} activeOpacity={0.85}>
          {coverUri ? <Image source={{ uri: coverUri }} style={s.coverImage} /> : <><ImagePlus size={26} color="#312FB8" /><Text style={s.coverText}>Choose cover image</Text></>}
        </TouchableOpacity>
        <Field label="Event title *" value={title} onChangeText={setTitle} placeholder="PropTech networking meetup" />
        <Field label="Description *" value={description} onChangeText={setDescription} placeholder="Tell members what to expect" multiline />
        <View style={s.row}>
          <DateTimeField half label="Start date *" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
          <DateTimeField half label="Start time *" value={time} onChangeText={setTime} placeholder="HH:MM" />
        </View>
        <View style={s.optionalHeader}><Text style={s.groupHint}>Optional end date and time</Text>{(endDate || endTime) ? <TouchableOpacity onPress={() => { setEndDate(""); setEndTime(""); }}><Text style={s.clearText}>Clear</Text></TouchableOpacity> : null}</View>
        <View style={s.row}>
          <DateTimeField half label="End date" value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" />
          <DateTimeField half label="End time" value={endTime} onChangeText={setEndTime} placeholder="HH:MM" />
        </View>
        <Field label="Venue" value={venue} onChangeText={setVenue} placeholder="Venue name" />
        <Field label="Location" value={location} onChangeText={setLocation} placeholder="Karachi, Pakistan" />
        <Text style={s.label}>Event type</Text>
        <View style={s.chips}>{EVENT_TYPES.map(type => <Chip key={type} label={type} active={eventType === type} onPress={() => setEventType(type)} />)}</View>
        <View style={s.configCard}>
          <Text style={s.configTitle}>Registration *</Text>
          <Text style={s.configHint}>Choose whether attendees need to register.</Text>
          <View style={s.chips}>
            <Chip label="Required" active={registrationChoice === "required"} onPress={() => setRegistrationChoice("required")} />
            <Chip label="Not required" active={registrationChoice === "not_required"} onPress={() => { setRegistrationChoice("not_required"); setRegistrationUrl(""); setRegistrationDeadlineDate(""); setRegistrationDeadlineTime(""); }} />
          </View>
          {registrationChoice === "required" && <>
            <Text style={s.groupHint}>In-app registration questions</Text>
            {questions.map((item, index) => <View key={item.id} style={s.entryCard}>
              <View style={s.entryHeader}><Text style={s.entryTitle}>Question {index + 1}</Text><TouchableOpacity onPress={() => setQuestions(current => current.filter(question => question.id !== item.id))}><Trash2 size={17} color="#B42318" /></TouchableOpacity></View>
              <Field label="Question *" value={item.question} maxLength={200} onChangeText={(value: string) => setQuestions(current => current.map(question => question.id === item.id ? { ...question, question: value } : question))} placeholder="What would you like to ask?" />
              <Text style={s.label}>Answer type</Text>
              <View style={s.chips}>
                <Chip label="Text" active={item.type === "text"} onPress={() => setQuestions(current => current.map(question => question.id === item.id ? { ...question, type: "text", options: [] } : question))} />
                <Chip label="Multiple choice" active={item.type === "multiple_choice"} onPress={() => setQuestions(current => current.map(question => question.id === item.id ? { ...question, type: "multiple_choice", options: question.options.length >= 2 ? question.options : ["", ""] } : question))} />
                <Chip label="Checkboxes" active={item.type === "checkboxes"} onPress={() => setQuestions(current => current.map(question => question.id === item.id ? { ...question, type: "checkboxes", options: question.options.length >= 2 ? question.options : ["", ""] } : question))} />
              </View>
              {item.type !== "text" && <View>{item.options.map((option, optionIndex) => <View key={`${item.id}-${optionIndex}`} style={s.optionRow}><TextInput style={[s.input, s.optionInput]} value={option} maxLength={100} placeholder={`Option ${optionIndex + 1}`} placeholderTextColor="#AAA" onChangeText={value => setQuestions(current => current.map(question => question.id === item.id ? { ...question, options: question.options.map((entry, index) => index === optionIndex ? value : entry) } : question))} /><TouchableOpacity disabled={item.options.length <= 2} onPress={() => setQuestions(current => current.map(question => question.id === item.id ? { ...question, options: question.options.filter((_, index) => index !== optionIndex) } : question))}><Trash2 size={16} color={item.options.length <= 2 ? "#CCC" : "#B42318"} /></TouchableOpacity></View>)}<TouchableOpacity style={s.addOption} onPress={() => setQuestions(current => current.map(question => question.id === item.id ? { ...question, options: [...question.options, ""] } : question))}><Plus size={15} color="#312FB8" /><Text style={s.addButtonText}>Add option</Text></TouchableOpacity></View>}
              <Toggle label="Required answer" value={item.isRequired} onValueChange={(value) => setQuestions(current => current.map(question => question.id === item.id ? { ...question, isRequired: value } : question))} />
            </View>)}
            <TouchableOpacity style={s.addButton} onPress={() => setQuestions(current => [...current, { id: draftId(), question: "", isRequired: true, type: "text", options: [] }])}><Plus size={17} color="#312FB8" /><Text style={s.addButtonText}>Add question</Text></TouchableOpacity>
            <View style={s.optionalHeader}><Text style={s.groupHint}>Optional registration deadline</Text>{(registrationDeadlineDate || registrationDeadlineTime) ? <TouchableOpacity onPress={() => { setRegistrationDeadlineDate(""); setRegistrationDeadlineTime(""); }}><Text style={s.clearText}>Clear</Text></TouchableOpacity> : null}</View>
            <View style={s.row}>
              <DateTimeField half label="Close date" value={registrationDeadlineDate} onChangeText={setRegistrationDeadlineDate} placeholder="YYYY-MM-DD" />
              <DateTimeField half label="Close time" value={registrationDeadlineTime} onChangeText={setRegistrationDeadlineTime} placeholder="HH:MM" />
            </View>
          </>}
        </View>
        <Toggle label="Feature this event" value={featured} onValueChange={setFeatured} />
        <View style={s.configCard}>
          <Text style={s.configTitle}>Add speakers?</Text>
          <View style={s.chips}><Chip label="Yes" active={addSpeakers === true} onPress={() => setAddSpeakers(true)} /><Chip label="No" active={addSpeakers === false} onPress={() => { setAddSpeakers(false); setSpeakers([]); }} /></View>
          {addSpeakers && <>
            {speakers.map((speaker, index) => <View key={speaker.id} style={s.entryCard}>
              <View style={s.entryHeader}><Text style={s.entryTitle}>Speaker {index + 1}</Text><TouchableOpacity onPress={() => setSpeakers(items => items.filter(item => item.id !== speaker.id))}><Trash2 size={17} color="#B42318" /></TouchableOpacity></View>
              <TouchableOpacity style={s.smallImagePicker} onPress={() => pickDraftImage(uri => updateSpeaker(speaker.id, { image: uri }))}>{speaker.image ? <Image source={{ uri: speaker.image }} style={s.smallImage} /> : <><ImagePlus size={20} color="#312FB8" /><Text style={s.imagePickerText}>Speaker image *</Text></>}</TouchableOpacity>
              <Field label="Name *" value={speaker.name} onChangeText={(value: string) => updateSpeaker(speaker.id, { name: value })} placeholder="Full name" />
              <Field label="Company *" value={speaker.company} onChangeText={(value: string) => updateSpeaker(speaker.id, { company: value })} placeholder="Company" />
              <Field label="Phone *" value={speaker.phone} onChangeText={(value: string) => updateSpeaker(speaker.id, { phone: value })} placeholder="Phone number" keyboardType="phone-pad" />
              <Field label="Email *" value={speaker.email} onChangeText={(value: string) => updateSpeaker(speaker.id, { email: value })} placeholder="Email" keyboardType="email-address" autoCapitalize="none" />
            </View>)}
            <TouchableOpacity style={s.addButton} onPress={() => setSpeakers(items => [...items, { id: draftId(), name: "", image: null, phone: "", email: "", company: "" }])}><Plus size={17} color="#312FB8" /><Text style={s.addButtonText}>Add speaker</Text></TouchableOpacity>
          </>}
        </View>
        <View style={s.configCard}>
          <Text style={s.configTitle}>Add sponsors?</Text>
          <View style={s.chips}><Chip label="Yes" active={addSponsors === true} onPress={() => setAddSponsors(true)} /><Chip label="No" active={addSponsors === false} onPress={() => { setAddSponsors(false); setSponsors([]); }} /></View>
          {addSponsors && <>
            {sponsors.map((sponsor, index) => <View key={sponsor.id} style={s.entryCard}>
              <View style={s.entryHeader}><Text style={s.entryTitle}>Sponsor {index + 1}</Text><TouchableOpacity onPress={() => setSponsors(items => items.filter(item => item.id !== sponsor.id))}><Trash2 size={17} color="#B42318" /></TouchableOpacity></View>
              <TouchableOpacity style={s.smallImagePicker} onPress={() => pickDraftImage(uri => updateSponsor(sponsor.id, { logo: uri }), true)}>{sponsor.logo ? <Image source={{ uri: sponsor.logo }} style={s.smallImage} resizeMode="contain" /> : <><ImagePlus size={20} color="#312FB8" /><Text style={s.imagePickerText}>Square sponsor logo *</Text></>}</TouchableOpacity>
              <Field label="Name * (maximum 24 characters)" value={sponsor.name} onChangeText={(value: string) => updateSponsor(sponsor.id, { name: value })} placeholder="Sponsor name" maxLength={24} />
            </View>)}
            <TouchableOpacity style={s.addButton} onPress={() => setSponsors(items => [...items, { id: draftId(), name: "", logo: null }])}><Plus size={17} color="#312FB8" /><Text style={s.addButtonText}>Add sponsor</Text></TouchableOpacity>
          </>}
        </View>
        <TouchableOpacity style={[s.publish, saving && s.disabled]} disabled={saving} onPress={save}>
          {saving ? <ActivityIndicator color="#FFF" /> : <><CalendarDays size={18} color="#FFF" /><Text style={s.publishText}>{isEditing ? "Save changes" : "Publish event"}</Text></>}
        </TouchableOpacity>
        {isEditing && <TouchableOpacity style={s.deleteButton} disabled={saving} onPress={deleteEvent}><Trash2 size={17} color="#B42318" /><Text style={s.deleteText}>Delete event</Text></TouchableOpacity>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, half, multiline, ...props }: any) {
  return <View style={half ? s.half : undefined}><Text style={s.label}>{label}</Text><TextInput style={[s.input, multiline && s.multiline]} multiline={multiline} textAlignVertical={multiline ? "top" : "center"} placeholderTextColor="#AAA" {...props} /></View>;
}
function DateTimeField({ label, half, ...props }: any) {
  return <View style={half ? s.half : undefined}><Text style={s.label}>{label}</Text><View style={s.pickerInput}><TextInput style={s.dateTimeInput} placeholderTextColor="#AAA" autoCapitalize="none" {...props} /><CalendarDays size={16} color="#312FB8" /></View></View>;
}
function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <TouchableOpacity onPress={onPress} style={[s.chip, active && s.chipActive]}><Text style={[s.chipText, active && s.chipTextActive]}>{label[0].toUpperCase() + label.slice(1)}</Text></TouchableOpacity>;
}
function Toggle({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (value: boolean) => void }) {
  return <View style={s.toggle}><Text style={s.toggleText}>{label}</Text><Switch value={value} onValueChange={onValueChange} trackColor={{ false: "#D8D8E0", true: "#8B89DB" }} thumbColor={value ? "#312FB8" : "#FFF"} /></View>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8F8FC" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8F8FC" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, backgroundColor: "#FFF", borderBottomWidth: 0.5, borderBottomColor: "rgba(49,47,184,0.1)" },
  back: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#EEEDFE", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Outfit_700Bold", color: "#1A1A2E" },
  content: { padding: 16, paddingBottom: 48 },
  cover: { height: 170, borderRadius: 18, borderWidth: 1.5, borderStyle: "dashed", borderColor: "rgba(49,47,184,0.3)", backgroundColor: "#EEEDFE", alignItems: "center", justifyContent: "center", gap: 8, overflow: "hidden", marginBottom: 18 },
  coverImage: { width: "100%", height: "100%" }, coverText: { color: "#312FB8", fontSize: 13, fontFamily: "Outfit_600SemiBold" },
  label: { color: "#45455A", fontSize: 12, fontFamily: "Outfit_600SemiBold", marginBottom: 7, marginTop: 12 },
  groupHint: { color: "#312FB8", fontSize: 12, fontFamily: "Outfit_700Bold", marginTop: 18, marginBottom: -4 },
  optionalHeader: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  clearText: { color: "#B42318", fontSize: 12, fontFamily: "Outfit_600SemiBold", paddingHorizontal: 4, paddingVertical: 4 },
  input: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: "#E1E1EA", backgroundColor: "#FFF", paddingHorizontal: 13, color: "#1A1A2E", fontSize: 14 },
  pickerInput: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: "#E1E1EA", backgroundColor: "#FFF", paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
  pickerText: { flex: 1, color: "#1A1A2E", fontSize: 13, fontFamily: "Outfit_500Medium" },
  pickerPlaceholder: { color: "#AAA", fontFamily: "Outfit_400Regular" },
  dateTimeInput: { flex: 1, height: "100%", color: "#1A1A2E", fontSize: 13, padding: 0 },
  multiline: { height: 110, paddingTop: 13 }, row: { flexDirection: "row", gap: 10 }, half: { flex: 1 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "#DADAE5", backgroundColor: "#FFF" },
  chipActive: { backgroundColor: "#312FB8", borderColor: "#312FB8" }, chipText: { fontSize: 12, color: "#666" }, chipTextActive: { color: "#FFF", fontFamily: "Outfit_600SemiBold" },
  toggle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, marginTop: 5 }, toggleText: { fontSize: 14, color: "#29293C", fontFamily: "Outfit_600SemiBold" },
  publish: { height: 52, borderRadius: 14, backgroundColor: "#312FB8", flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", marginTop: 18 },
  publishText: { color: "#FFF", fontSize: 15, fontFamily: "Outfit_700Bold" }, disabled: { opacity: 0.65 },
  deleteButton: { height: 50, borderRadius: 14, borderWidth: 1, borderColor: "#FDA29B", backgroundColor: "#FEF3F2", flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", marginTop: 12 },
  deleteText: { color: "#B42318", fontSize: 14, fontFamily: "Outfit_700Bold" },
  configCard: { marginTop: 18, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: "#E1E1EA", backgroundColor: "#FFF" },
  configTitle: { color: "#1A1A2E", fontSize: 15, fontFamily: "Outfit_700Bold", marginBottom: 4 },
  configHint: { color: "#777", fontSize: 12, marginBottom: 6 },
  entryCard: { marginTop: 14, padding: 12, borderRadius: 14, backgroundColor: "#F8F8FC", borderWidth: 1, borderColor: "#E5E5EF" },
  entryHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  entryTitle: { color: "#312FB8", fontSize: 13, fontFamily: "Outfit_700Bold" },
  smallImagePicker: { height: 90, marginTop: 10, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: "#B9B8E8", alignItems: "center", justifyContent: "center", overflow: "hidden", gap: 5 },
  smallImage: { width: "100%", height: "100%" }, imagePickerText: { color: "#312FB8", fontSize: 12, fontFamily: "Outfit_600SemiBold" },
  addButton: { height: 44, marginTop: 12, borderRadius: 12, borderWidth: 1, borderColor: "#B9B8E8", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  addButtonText: { color: "#312FB8", fontSize: 13, fontFamily: "Outfit_700Bold" },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }, optionInput: { flex: 1, marginTop: 0 },
  addOption: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingVertical: 10 },
});
