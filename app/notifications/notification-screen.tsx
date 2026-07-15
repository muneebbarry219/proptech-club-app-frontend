import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { CalendarDays, MessageCircle, Newspaper, PartyPopper, UserPlus } from "lucide-react-native";
import AppShell from "../../components/layout/AppShell";
import { useAuth } from "../../context/AuthContext";
import { getAvatarUri } from "../../utils/getAvatarUri";
import { getArticleCoverUrl } from "../../utils/getArticleCoverUrl";
import { NOTIFICATION_ACTION_LABELS, NOTIFICATION_LABELS, NOTIFICATIONS } from "./notification";
import {
  getReadNotificationKeys,
  markNotificationKeysRead,
  markNotificationsOpened,
  type ConnectionNotificationSnapshotRecord,
} from "./notification-read-state";

type ActionVariant = "primary" | "success" | "danger";
type NotificationFilter = "all" | "unread" | "action";
const MESSAGE_NOTIFICATION_WINDOW_MS = 24 * 60 * 60 * 1000;
const EVENT_REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

const NOTIFICATION_FILTERS: Array<{ key: NotificationFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "action", label: "Action needed" },
];

interface NotificationAction {
  label: string;
  route?: string;
  variant: ActionVariant;
  onPress?: () => void;
}

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  sortAt?: number;
  readKey?: string;
  unread: boolean;
  actionRoute?: string;
  actions?: NotificationAction[];
  actorName: string | null;
  actorAvatarUrl: string | null;
  boldName?: string | null;
  boldNames?: string[];
  showConnectionBadge?: boolean;
  showMessageBadge?: boolean;
  showEventBadge?: boolean;
  showContentBadge?: boolean;
  showUnreadDot?: boolean;
  showCelebrationBadge?: boolean;
  Icon: any;
}

interface ConnectionRequestRow {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "declined";
  created_at?: string | null;
  updated_at?: string | null;
}

interface RequesterProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  updated_at?: string | null;
}

interface UnreadMessageRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface EventAttendeeRow {
  id: string;
  event_id: string;
  user_id: string;
  status: "pending" | "confirmed" | string;
  created_at?: string | null;
  updated_at?: string | null;
}

interface EventNotificationRow {
  id: string;
  title: string;
  event_date: string;
  cover_image?: string | null;
  registration_type: "open" | "exclusive";
  member_only?: boolean | null;
}

interface ArticleNotificationRow {
  id: string;
  title: string;
  cover_url: string | null;
  published_at: string;
  profiles: { full_name: string | null } | null;
}

function latestMessageNotificationAnchor(messages: UnreadMessageRow[]) {
  const sorted = [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  let anchor = sorted[0];

  sorted.slice(1).forEach((message) => {
    if (sortTime(message.created_at) - sortTime(anchor.created_at) >= MESSAGE_NOTIFICATION_WINDOW_MS) {
      anchor = message;
    }
  });

  return anchor;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function timeAgo(iso?: string | null) {
  if (!iso) return "Just now";

  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff) || diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 172800000) return "Yesterday";

  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function notificationDate(iso?: string | null) {
  if (!iso) return "Welcome";

  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function sortTime(iso?: string | null) {
  const time = iso ? new Date(iso).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function renderBoldNames(text: string, names: string[] = []) {
  const uniqueNames = Array.from(new Set(names.filter(Boolean))).sort((a, b) => b.length - a.length);
  if (!uniqueNames.length) return text;

  const segments: Array<{ text: string; bold: boolean }> = [];
  let cursor = 0;

  while (cursor < text.length) {
    const nextMatch = uniqueNames
      .map((name) => ({ name, index: text.indexOf(name, cursor) }))
      .filter((match) => match.index >= 0)
      .sort((a, b) => a.index - b.index)[0];

    if (!nextMatch) {
      segments.push({ text: text.slice(cursor), bold: false });
      break;
    }

    if (nextMatch.index > cursor) {
      segments.push({ text: text.slice(cursor, nextMatch.index), bold: false });
    }

    segments.push({ text: nextMatch.name, bold: true });
    cursor = nextMatch.index + nextMatch.name.length;
  }

  return segments.map((segment, index) => (
    <Text key={`${segment.text}-${index}`} style={segment.bold ? styles.cardBodyBold : undefined}>
      {segment.text}
    </Text>
  ));
}

export default function NotificationScreen() {
  const router = useRouter();
  const {
    user,
    apiFetch,
    isAuthenticated,
    isLoading,
    profile,
    connectionSyncTick,
    messageSyncTick,
    profileSyncTick,
    notifyConnectionChanged,
  } = useAuth();
  const [connectionNotifications, setConnectionNotifications] = useState<NotificationItem[]>([]);
  const [messageNotifications, setMessageNotifications] = useState<NotificationItem[]>([]);
  const [eventNotifications, setEventNotifications] = useState<NotificationItem[]>([]);
  const [articleNotifications, setArticleNotifications] = useState<NotificationItem[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [readNotificationKeys, setReadNotificationKeys] = useState<Set<string>>(new Set());
  const [connectionSnapshotRecords, setConnectionSnapshotRecords] = useState<ConnectionNotificationSnapshotRecord[]>([]);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>("all");
  const notificationsRef = useRef<NotificationItem[]>([]);
  const connectionSnapshotRecordsRef = useRef<ConnectionNotificationSnapshotRecord[]>([]);

  useEffect(() => {
    if (!user?.id) {
      setReadNotificationKeys(new Set());
      return;
    }

    let active = true;
    void getReadNotificationKeys(user.id).then((keys) => {
      if (active) {
        setReadNotificationKeys(new Set(keys));
      }
    });

    return () => {
      active = false;
    };
  }, [user?.id]);

  const markKeysRead = useCallback(
    (keys: string[]) => {
      if (!user?.id || !keys.length) return;

      setReadNotificationKeys((current) => {
        const next = new Set(current);
        keys.forEach((key) => next.add(key));
        return next;
      });
      void markNotificationKeysRead(user.id, keys);
    },
    [user?.id]
  );

  const loadConnectionNotifications = useCallback(async () => {
    if (isLoading) return;
    let openedSnapshotRecords: ConnectionNotificationSnapshotRecord[] = [];

    if (!isAuthenticated || !user) {
      setConnectionNotifications([]);
      setConnectionSnapshotRecords([]);
      setLoadingRequests(false);
      return;
    }

    try {
      let connectionsRes = await apiFetch(
        `/connections?or=(requester_id.eq.${user.id},receiver_id.eq.${user.id})&status=in.(pending,accepted,declined)&select=id,requester_id,receiver_id,status,created_at,updated_at&order=updated_at.desc`
      );

      if (!connectionsRes.ok) {
        connectionsRes = await apiFetch(
          `/connections?or=(requester_id.eq.${user.id},receiver_id.eq.${user.id})&status=in.(pending,accepted,declined)&select=id,requester_id,receiver_id,status,created_at&order=created_at.desc`
        );
      }

      if (!connectionsRes.ok) {
        setConnectionNotifications([]);
        setConnectionSnapshotRecords([]);
        return;
      }

      const connections: ConnectionRequestRow[] = await connectionsRes.json();
      const relevantConnections = connections.filter(
        (connection) =>
          (connection.status === "pending" && connection.receiver_id === user.id) ||
          connection.status === "accepted" ||
          (connection.status === "declined" && connection.requester_id === user.id)
      );
      openedSnapshotRecords = relevantConnections.map((connection) => ({
        id: connection.id,
        requester_id: connection.requester_id,
        receiver_id: connection.receiver_id,
        status: connection.status,
      }));
      setConnectionSnapshotRecords(openedSnapshotRecords);

      if (!relevantConnections.length) {
        setConnectionNotifications([]);
        return;
      }

      const profileIds = Array.from(
        new Set(
          relevantConnections.map((connection) =>
            connection.requester_id === user.id ? connection.receiver_id : connection.requester_id
          )
        )
      );
      const profilesRes = await apiFetch(
        `/profiles?id=in.(${profileIds.join(",")})&select=id,full_name,avatar_url,updated_at`
      );
      const profiles: RequesterProfile[] = profilesRes.ok ? await profilesRes.json() : [];
      const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
      const loggedInUserName = profile?.full_name || "You";

      setConnectionNotifications(
        relevantConnections.map((connection) => {
          const otherUserId = connection.requester_id === user.id ? connection.receiver_id : connection.requester_id;
          const otherUser = profilesById.get(otherUserId);
          const name = otherUser?.full_name ?? "A member";
          const requesterName = connection.requester_id === user.id ? loggedInUserName : name;
          const receiverName = connection.receiver_id === user.id ? loggedInUserName : name;

          if (connection.status === "pending") {
            return {
              id: `connection-${connection.id}`,
              readKey: `connection-${connection.id}-pending`,
              title: NOTIFICATION_LABELS.connectionRequestReceived.title,
              body: NOTIFICATION_LABELS.connectionRequestReceived.body(name),
              time: timeAgo(connection.updated_at ?? connection.created_at),
              sortAt: sortTime(connection.updated_at ?? connection.created_at),
              unread: true,
              actionRoute: `/members/${connection.requester_id}`,
              actorName: name,
              actorAvatarUrl: getAvatarUri(otherUser?.avatar_url, otherUser?.updated_at),
              boldName: name,
              showConnectionBadge: true,
              showUnreadDot: true,
              Icon: UserPlus,
              actions: [
                {
                  label: NOTIFICATION_ACTION_LABELS.accept,
                  variant: "success",
                  onPress: () => {
                    void handleAcceptRequest(connection.id);
                  },
                },
                {
                  label: NOTIFICATION_ACTION_LABELS.reject,
                  variant: "danger",
                  onPress: () => {
                    void handleRejectRequest(connection.id);
                  },
                },
              ],
            };
          }

          const didAccept = connection.status === "accepted";
          const statusText = didAccept ? "accepted" : "declined";
          const isReceiver = connection.receiver_id === user.id;

          return {
            id: `connection-${connection.id}`,
            readKey: `connection-${connection.id}-${connection.status}`,
            title: isReceiver
              ? NOTIFICATION_LABELS.connectionRequestHandledByMe.title(statusText)
              : NOTIFICATION_LABELS.connectionRequestHandledByOtherUser.title(statusText),
            body: isReceiver
              ? NOTIFICATION_LABELS.connectionRequestHandledByMe.body(statusText, requesterName)
              : NOTIFICATION_LABELS.connectionRequestHandledByOtherUser.body(receiverName, statusText),
            time: timeAgo(connection.updated_at ?? connection.created_at),
            sortAt: sortTime(connection.updated_at ?? connection.created_at),
            unread: true,
            actionRoute: `/members/${otherUserId}`,
            actorName: name,
            actorAvatarUrl: getAvatarUri(otherUser?.avatar_url, otherUser?.updated_at),
            boldName: name,
            boldNames: isReceiver ? [requesterName] : [receiverName],
            showConnectionBadge: true,
            Icon: UserPlus,
          };
        })
      );
    } catch (error) {
      console.warn("[Notifications] connection requests load error", error);
      setConnectionNotifications([]);
      setConnectionSnapshotRecords([]);
    } finally {
      setLoadingRequests(false);
    }
  }, [apiFetch, isAuthenticated, isLoading, profile?.full_name, user]);

  useEffect(() => {
    void loadConnectionNotifications();
  }, [loadConnectionNotifications]);

  useEffect(() => {
    void loadConnectionNotifications();
  }, [connectionSyncTick, loadConnectionNotifications, profileSyncTick]);

  const loadMessageNotifications = useCallback(async () => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      setMessageNotifications([]);
      return;
    }

    try {
      const messagesRes = await apiFetch(
        `/direct_messages?receiver_id=eq.${user.id}&order=created_at.desc&select=id,sender_id,receiver_id,content,is_read,created_at`
      );

      if (!messagesRes.ok) {
        setMessageNotifications([]);
        return;
      }

      const messages: UnreadMessageRow[] = await messagesRes.json();
      if (!messages.length) {
        setMessageNotifications([]);
        return;
      }

      const messagesBySender = new Map<string, UnreadMessageRow[]>();
      const unreadBySender = new Map<string, boolean>();
      messages.forEach((message) => {
        messagesBySender.set(message.sender_id, [
          ...(messagesBySender.get(message.sender_id) ?? []),
          message,
        ]);
        if (!message.is_read) {
          unreadBySender.set(message.sender_id, true);
        }
      });

      const senderIds = Array.from(messagesBySender.keys());
      const profilesRes = await apiFetch(
        `/profiles?id=in.(${senderIds.join(",")})&select=id,full_name,avatar_url,updated_at`
      );
      const profiles: RequesterProfile[] = profilesRes.ok ? await profilesRes.json() : [];
      const profilesById = new Map(profiles.map((senderProfile) => [senderProfile.id, senderProfile]));

      setMessageNotifications(
        senderIds.map((senderId) => {
          const senderMessages = messagesBySender.get(senderId) ?? [];
          const notificationAnchor = latestMessageNotificationAnchor(senderMessages);
          const latestMessage = senderMessages[0];
          const hasUnread = Boolean(unreadBySender.get(senderId));
          const latestMessageAge = Date.now() - sortTime(latestMessage.created_at);
          const showReplyReminder = hasUnread && latestMessageAge >= MESSAGE_NOTIFICATION_WINDOW_MS;
          const sender = profilesById.get(senderId);
          const senderName = sender?.full_name ?? "Someone";

          return {
            id: `message-${senderId}`,
            readKey: `message-${senderId}-${showReplyReminder ? latestMessage.id : notificationAnchor.id}`,
            title: showReplyReminder
              ? NOTIFICATION_LABELS.messageWaitingForReply.title
              : NOTIFICATION_LABELS.unreadMessage.title,
            body: showReplyReminder
              ? NOTIFICATION_LABELS.messageWaitingForReply.body(senderName)
              : NOTIFICATION_LABELS.unreadMessage.body(senderName),
            time: timeAgo(showReplyReminder ? latestMessage.created_at : notificationAnchor.created_at),
            sortAt: sortTime(showReplyReminder ? latestMessage.created_at : notificationAnchor.created_at),
            unread: hasUnread,
            actionRoute: `/messages/${senderId}`,
            actions: showReplyReminder
              ? [{ label: NOTIFICATION_ACTION_LABELS.viewMessage, route: `/messages/${senderId}`, variant: "primary" }]
              : undefined,
            actorName: senderName,
            actorAvatarUrl: getAvatarUri(sender?.avatar_url, sender?.updated_at),
            boldName: senderName,
            boldNames: [senderName],
            showMessageBadge: true,
            showUnreadDot: hasUnread,
            Icon: MessageCircle,
          };
        })
      );
    } catch (error) {
      console.warn("[Notifications] unread messages load error", error);
      setMessageNotifications([]);
    }
  }, [apiFetch, isAuthenticated, isLoading, user]);

  useEffect(() => {
    void loadMessageNotifications();
  }, [loadMessageNotifications, messageSyncTick, profileSyncTick]);

  const loadEventNotifications = useCallback(async () => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      setEventNotifications([]);
      return;
    }

    try {
      let attendeesRes = await apiFetch(
        `/event_attendees?user_id=eq.${user.id}&status=eq.confirmed&select=id,event_id,user_id,status,created_at,updated_at&order=updated_at.desc`
      );

      if (!attendeesRes.ok) {
        attendeesRes = await apiFetch(
          `/event_attendees?user_id=eq.${user.id}&status=eq.confirmed&select=id,event_id,user_id,status,created_at&order=created_at.desc`
        );
      }

      if (!attendeesRes.ok) {
        setEventNotifications([]);
        return;
      }

      const attendees: EventAttendeeRow[] = await attendeesRes.json();
      if (!attendees.length) {
        setEventNotifications([]);
        return;
      }

      const eventIds = Array.from(new Set(attendees.map((attendee) => attendee.event_id).filter(Boolean)));
      if (!eventIds.length) {
        setEventNotifications([]);
        return;
      }

      const eventsRes = await apiFetch(
        `/events?id=in.(${eventIds.join(",")})&select=id,title,event_date,cover_image,registration_type,member_only`
      );
      const events: EventNotificationRow[] = eventsRes.ok ? await eventsRes.json() : [];
      const eventsById = new Map(events.map((event) => [event.id, event]));
      const now = Date.now();

      const nextNotifications = attendees.flatMap((attendee) => {
        const event = eventsById.get(attendee.event_id);
        if (!event) return [];

        const eventName = event.title || "This event";
        const eventTime = sortTime(event.event_date);
        const registrationTime = attendee.updated_at ?? attendee.created_at;
        const isFreeRegistration = event.registration_type === "open" && !event.member_only;
        const registrationNotification: NotificationItem = {
          id: `event-registration-${attendee.id}`,
          readKey: `event-registration-${attendee.id}-${attendee.status}`,
          title: isFreeRegistration
            ? NOTIFICATION_LABELS.eventRegistered.title
            : NOTIFICATION_LABELS.eventRegistrationApproved.title,
          body: isFreeRegistration
            ? NOTIFICATION_LABELS.eventRegistered.body(eventName)
            : NOTIFICATION_LABELS.eventRegistrationApproved.body(eventName),
          time: timeAgo(registrationTime),
          sortAt: sortTime(registrationTime),
          unread: true,
          actionRoute: `/events/${event.id}`,
          actorName: eventName,
          actorAvatarUrl: event.cover_image ?? null,
          boldName: eventName,
          boldNames: [eventName],
          showEventBadge: true,
          Icon: CalendarDays,
        };

        const notifications = [registrationNotification];
        const isReminderDue = eventTime > now && eventTime - now <= EVENT_REMINDER_WINDOW_MS;
        if (isReminderDue) {
          const reminderAt = new Date(eventTime - EVENT_REMINDER_WINDOW_MS).toISOString();
          notifications.push({
            id: `event-reminder-${event.id}`,
            readKey: `event-reminder-${event.id}-${event.event_date}`,
            title: NOTIFICATION_LABELS.eventTomorrow.title,
            body: NOTIFICATION_LABELS.eventTomorrow.body(eventName),
            time: timeAgo(reminderAt),
            sortAt: sortTime(reminderAt),
            unread: true,
            actionRoute: `/events/${event.id}`,
            actorName: eventName,
            actorAvatarUrl: event.cover_image ?? null,
            boldName: eventName,
            boldNames: [eventName],
            showEventBadge: true,
            Icon: CalendarDays,
          });
        }

        return notifications;
      });

      setEventNotifications(nextNotifications);
    } catch (error) {
      console.warn("[Notifications] event notifications load error", error);
      setEventNotifications([]);
    }
  }, [apiFetch, isAuthenticated, isLoading, user]);

  useEffect(() => {
    void loadEventNotifications();
  }, [loadEventNotifications]);

  const loadArticleNotifications = useCallback(async () => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      setArticleNotifications([]);
      return;
    }

    try {
      const articlesRes = await apiFetch(
        `/articles?is_published=eq.true&order=published_at.desc&limit=30&select=id,title,cover_url,published_at,profiles!author_id(full_name)`
      );

      if (!articlesRes.ok) {
        setArticleNotifications([]);
        return;
      }

      const articles: ArticleNotificationRow[] = await articlesRes.json();
      setArticleNotifications(
        articles.map((article) => {
          const publisherName = article.profiles?.full_name || "PropTech Club";

          return {
            id: `article-${article.id}`,
            readKey: `article-${article.id}-${article.published_at}`,
            title: NOTIFICATION_LABELS.articlePublished.title(article.title),
            body: NOTIFICATION_LABELS.articlePublished.body(publisherName),
            time: timeAgo(article.published_at),
            sortAt: sortTime(article.published_at),
            unread: true,
            actionRoute: `/articles/${article.id}`,
            actorName: article.title,
            actorAvatarUrl: getArticleCoverUrl(article.cover_url),
            boldName: publisherName,
            boldNames: [publisherName],
            showContentBadge: true,
            Icon: Newspaper,
          };
        })
      );
    } catch (error) {
      console.warn("[Notifications] article notifications load error", error);
      setArticleNotifications([]);
    }
  }, [apiFetch, isAuthenticated, isLoading, user]);

  useEffect(() => {
    void loadArticleNotifications();
  }, [loadArticleNotifications]);

  const handleAcceptRequest = useCallback(async (connectionId: string) => {
    const res = await apiFetch(`/connections?id=eq.${connectionId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "accepted" }),
    });

    if (!res.ok) {
      Alert.alert("Error", "Could not accept request. Please try again.");
      await loadConnectionNotifications();
      return;
    }

    notifyConnectionChanged();
    await loadConnectionNotifications();
  }, [apiFetch, loadConnectionNotifications, notifyConnectionChanged]);

  const handleRejectRequest = useCallback(async (connectionId: string) => {
    const res = await apiFetch(`/connections?id=eq.${connectionId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "declined" }),
    });

    if (!res.ok) {
      Alert.alert("Error", "Could not reject request. Please try again.");
      await loadConnectionNotifications();
      return;
    }

    notifyConnectionChanged();
    await loadConnectionNotifications();
  }, [apiFetch, loadConnectionNotifications, notifyConnectionChanged]);

  const welcomeNotification = useMemo<NotificationItem | null>(() => {
    if (!user || !profile) return null;

    const firstName = profile.full_name?.split(" ")[0] || "there";

    return {
      id: `welcome-${user.id}`,
      readKey: `welcome-${user.id}`,
      title: NOTIFICATION_LABELS.welcome.title,
      body: NOTIFICATION_LABELS.welcome.body(firstName),
      time: notificationDate(profile.created_at),
      sortAt: sortTime(profile.created_at),
      unread: true,
      actionRoute: "/auth/profile",
      actorName: profile.full_name || NOTIFICATION_LABELS.welcome.fallbackName,
      actorAvatarUrl: getAvatarUri(profile.avatar_url, profile.updated_at),
      showCelebrationBadge: true,
      Icon: PartyPopper,
    };
  }, [profile, user]);

  const notifications = useMemo(() => {
    const allNotifications = [
        ...connectionNotifications,
        ...messageNotifications,
        ...eventNotifications,
        ...articleNotifications,
        ...(welcomeNotification ? [welcomeNotification] : []),
        ...(NOTIFICATIONS as NotificationItem[]),
      ].sort((a, b) => (b.sortAt ?? 0) - (a.sortAt ?? 0));

    return allNotifications.map((notification) => {
      const readKey = notification.readKey ?? notification.id;
      return {
        ...notification,
        readKey,
        unread: notification.unread && !readNotificationKeys.has(readKey),
      };
    });
  }, [articleNotifications, connectionNotifications, eventNotifications, messageNotifications, readNotificationKeys, welcomeNotification]);

  const filteredNotifications = useMemo(() => {
    if (activeFilter === "unread") {
      return notifications.filter((notification) => notification.unread);
    }

    if (activeFilter === "action") {
      return notifications.filter((notification) => Boolean(notification.actions?.length || notification.showUnreadDot));
    }

    return notifications;
  }, [activeFilter, notifications]);

  useEffect(() => {
    notificationsRef.current = filteredNotifications;
  }, [filteredNotifications]);

  useEffect(() => {
    connectionSnapshotRecordsRef.current = connectionSnapshotRecords;
  }, [connectionSnapshotRecords]);

  useEffect(() => {
    if (!user?.id || loadingRequests) return;

    void markNotificationsOpened(user.id, connectionSnapshotRecords);
  }, [connectionSnapshotRecords, loadingRequests, user?.id]);

  const markCurrentScreenRead = useCallback(() => {
    if (!user?.id) return;

    const infoKeys = notificationsRef.current
      .filter((notification) => !notification.actions?.length)
      .map((notification) => notification.readKey ?? notification.id);

    markKeysRead(infoKeys);
    void markNotificationsOpened(user.id, connectionSnapshotRecordsRef.current);
  }, [markKeysRead, user?.id]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        markCurrentScreenRead();
      };
    }, [markCurrentScreenRead])
  );

  const handleNotificationPress = useCallback(
    (notification: NotificationItem, route?: string) => {
      markKeysRead([notification.readKey ?? notification.id]);
      router.push((route ?? "/notifications") as any);
    },
    [markKeysRead, router]
  );

  return (
    <AppShell>
      <View style={styles.screen}>
        {/* <View style={styles.headerBlock}> */}
        {/* <View style={styles.titleRow}>
            <View style={styles.titleIcon}>
              <Bell size={22} color="#FFFFFF" strokeWidth={2.2} />
            </View>
            <View style={styles.titleCopy}>
              <Text style={styles.eyebrow}>Notifications</Text>
              <Text style={styles.heading}>Stay in the loop</Text>
            </View>
          </View> */}
        {/* <Text style={styles.summary}>
            {unreadCount ? `${unreadCount} new updates from your PropTech Club activity.` : "You are all caught up."}
          </Text> */}
        {/* </View> */}

        {loadingRequests ? (
          <View style={styles.loader}>
            <ActivityIndicator color="#312FB8" size="large" />
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          >
            <View style={styles.filterRow}>
              {NOTIFICATION_FILTERS.map((filter) => {
                const isActive = activeFilter === filter.key;
                return (
                  <TouchableOpacity
                    key={filter.key}
                    activeOpacity={0.85}
                    style={[styles.filterPill, isActive && styles.filterPillActive]}
                    onPress={() => setActiveFilter(filter.key)}
                  >
                    <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {filteredNotifications.map(({
            id,
            readKey,
            title,
            body,
            time,
            unread,
            actionRoute,
            actions,
            actorName,
            actorAvatarUrl,
            boldName,
            boldNames,
            showConnectionBadge,
            showMessageBadge,
            showEventBadge,
            showContentBadge,
            showUnreadDot,
            showCelebrationBadge,
            Icon,
            }) => {
            const notification = {
              id,
              readKey,
              title,
              body,
              time,
              unread,
              actionRoute,
              actions,
              actorName,
              actorAvatarUrl,
              boldName,
              boldNames,
              showConnectionBadge,
              showMessageBadge,
              showEventBadge,
              showContentBadge,
              showUnreadDot,
              showCelebrationBadge,
              Icon,
            };
            const hasActionButtons = Boolean(actions?.length);
            const cardContent = (
              <>
                {actorName ? (
                  <View style={styles.avatarWrap}>
                    {actorAvatarUrl ? (
                      <Image source={{ uri: actorAvatarUrl }} style={styles.avatarImg} />
                    ) : (
                      <Text style={styles.avatarText}>{initials(actorName)}</Text>
                    )}
                    {showConnectionBadge ? (
                      <View style={styles.connectionBadge}>
                        <UserPlus size={11} color="#FFFFFF" strokeWidth={2.4} />
                      </View>
                    ) : null}
                    {showMessageBadge ? (
                      <View style={styles.messageBadge}>
                        <MessageCircle size={11} color="#FFFFFF" strokeWidth={2.4} />
                      </View>
                    ) : null}
                    {showCelebrationBadge ? (
                      <View style={styles.celebrationBadge}>
                        <PartyPopper size={11} color="#FFFFFF" strokeWidth={2.4} />
                      </View>
                    ) : null}
                    {showEventBadge ? (
                      <View style={styles.eventBadge}>
                        <CalendarDays size={11} color="#FFFFFF" strokeWidth={2.4} />
                      </View>
                    ) : null}
                    {showContentBadge ? (
                      <View style={styles.contentBadge}>
                        <Newspaper size={11} color="#FFFFFF" strokeWidth={2.4} />
                      </View>
                    ) : null}
                  </View>
                ) : (
                  <View style={[styles.iconWrap, unread && styles.iconWrapUnread]}>
                    <Icon
                      size={19}
                      color={unread ? "#FFFFFF" : "#312FB8"}
                      strokeWidth={2.1}
                    />
                  </View>
                )}
                <View style={[styles.cardCopy, hasActionButtons ? styles.actionCopy : styles.infoCopy]}>
                  {showUnreadDot ? <View style={styles.itemUnreadDot} /> : null}
                  <View style={[styles.textBlock, !hasActionButtons && styles.infoTextBlock]}>
                    {!hasActionButtons && title ? (
                      <Text
                        style={[styles.infoTitle, unread ? styles.unreadTitleText : styles.readText]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {title}
                      </Text>
                    ) : null}
                    <Text
                      style={[styles.cardBody, unread ? styles.unreadBodyText : styles.readText]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {renderBoldNames(body, boldNames ?? (boldName ? [boldName] : []))}
                    </Text>
                  </View>
                  {hasActionButtons ? (
                    <View style={[styles.cardFooter, styles.actionFooter]}>
                      <View style={styles.actionsRow}>
                        {actions?.map((action) => (
                          <TouchableOpacity
                            key={action.label}
                            activeOpacity={0.85}
                            style={[
                              styles.actionPill,
                              action.variant === "success" && styles.actionPillSuccess,
                              action.variant === "danger" && styles.actionPillDanger,
                            ]}
                            onPress={(event) => {
                              event.stopPropagation();
                              if (action.onPress) {
                                action.onPress();
                                return;
                              }
                              if (action.route) {
                                markKeysRead([readKey ?? id]);
                                router.push(action.route as any);
                              }
                            }}
                          >
                            <Text
                              style={[
                                styles.actionPillText,
                                action.variant === "success" && styles.actionPillTextSuccess,
                                action.variant === "danger" && styles.actionPillTextDanger,
                              ]}
                              numberOfLines={1}
                            >
                              {action.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <Text style={[styles.time, unread ? styles.unreadBodyText : styles.readText]}>
                        {time}
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.infoTime, unread ? styles.unreadBodyText : styles.readText]}>
                      {time}
                    </Text>
                  )}
                </View>
              </>
            );

            if (!actionRoute) {
              return (
                <TouchableOpacity
                  key={id}
                  activeOpacity={0.85}
                  style={[styles.card, styles.infoCard]}
                  onPress={() => handleNotificationPress(notification)}
                >
                  {cardContent}
                </TouchableOpacity>
              );
            }

            return (
              <TouchableOpacity
                key={id}
                activeOpacity={0.85}
                style={[styles.card, hasActionButtons ? styles.actionCard : styles.infoCard]}
                onPress={() => handleNotificationPress(notification, actionRoute)}
              >
                {cardContent}
              </TouchableOpacity>
            );
            })}
          </ScrollView>
        )}
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerBlock: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 18,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 0.5,
    borderColor: "rgba(49,47,184,0.08)",
    shadowColor: "#16163D",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  titleIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#312FB8",
    alignItems: "center",
    justifyContent: "center",
  },
  titleCopy: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: "Outfit_600SemiBold",
    color: "#0F6E56",
    letterSpacing: 0,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  heading: {
    fontSize: 23,
    lineHeight: 28,
    fontFamily: "Outfit_700Bold",
    color: "#121426",
    letterSpacing: 0,
  },
  summary: {
    marginTop: 14,
    fontSize: 14,
    lineHeight: 19,
    fontFamily: "Outfit_400Regular",
    color: "#6F7488",
    letterSpacing: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    gap: 10,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  filterPill: {
    flex: 1,
    height: 34,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(49,47,184,0.1)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  filterPillActive: {
    backgroundColor: "#312FB8",
    borderColor: "#312FB8",
  },
  filterText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Outfit_600SemiBold",
    color: "#5F667A",
    letterSpacing: 0,
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: "rgba(49,47,184,0.08)",
    padding: 15,
    shadowColor: "#16163D",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actionCard: {
    height: 75,
    paddingVertical: 10,
    alignItems: "center",
  },
  infoCard: {
    height: 75,
    paddingVertical: 10,
    alignItems: "center",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#EEEDFE",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapUnread: {
    backgroundColor: "#312FB8",
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#312FB8",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: 13,
  },
  avatarText: {
    fontSize: 12,
    fontFamily: "Outfit_700Bold",
    color: "#FFFFFF",
    letterSpacing: 0,
  },
  connectionBadge: {
    position: "absolute",
    right: -3,
    bottom: -3,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#312FB8",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  celebrationBadge: {
    position: "absolute",
    right: -3,
    bottom: -3,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#8C5B16",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  messageBadge: {
    position: "absolute",
    right: -3,
    bottom: -3,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#0F6E56",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  eventBadge: {
    position: "absolute",
    right: -3,
    bottom: -3,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#D06B18",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  contentBadge: {
    position: "absolute",
    right: -3,
    bottom: -3,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#185FA5",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  cardCopy: {
    flex: 1,
    minWidth: 0,
    position: "relative",
  },
  actionCopy: {
    justifyContent: "center",
  },
  infoCopy: {
    justifyContent: "center",
    position: "relative",
  },
  textBlock: {
    gap: 2,
    paddingRight: 58,
  },
  infoTextBlock: {
    paddingRight: 64,
  },
  infoTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Outfit_600SemiBold",
    color: "#121426",
    letterSpacing: 0,
  },
  cardBody: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Outfit_400Regular",
    color: "#7B8196",
    letterSpacing: 0,
  },
  cardBodyBold: {
    fontFamily: "Outfit_500Medium",
    letterSpacing: 0,
  },
  unreadTitleText: {
    color: "#33384A",
  },
  unreadBodyText: {
    color: "#4E556A",
  },
  readText: {
    color: "#A3A8B8",
  },
  itemUnreadDot: {
    position: "absolute",
    right: 0,
    top: 2,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#E53935",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  actionFooter: {
    marginTop: 8,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  time: {
    marginLeft: "auto",
    fontSize: 9,
    fontFamily: "Outfit_500Medium",
    color: "#9A9FB2",
    letterSpacing: 0,
    textAlign: "right",
  },
  infoTime: {
    position: "absolute",
    right: 0,
    bottom: 0,
    fontSize: 9,
    fontFamily: "Outfit_500Medium",
    color: "#9A9FB2",
    letterSpacing: 0,
    textAlign: "right",
  },
  actionPill: {
    borderRadius: 999,
    backgroundColor: "#EEEDFE",
    paddingHorizontal: 12,
    paddingVertical: 4,
    maxWidth: 142,
  },
  actionPillSuccess: {
    backgroundColor: "#EAF7F2",
    borderWidth: 1,
    borderColor: "rgba(15,110,86,0.18)",
  },
  actionPillDanger: {
    backgroundColor: "#FEECEE",
    borderWidth: 1,
    borderColor: "rgba(180,35,24,0.16)",
  },
  actionPillText: {
    fontSize: 11,
    fontFamily: "Outfit_600SemiBold",
    color: "#312FB8",
    letterSpacing: 0,
  },
  actionPillTextSuccess: {
    color: "#0F6E56",
  },
  actionPillTextDanger: {
    color: "#B42318",
  },
});
