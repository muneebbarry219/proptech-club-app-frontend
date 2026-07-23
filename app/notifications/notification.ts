import { CalendarDays, Check, Newspaper } from "lucide-react-native";

export const NOTIFICATION_LABELS = {
  welcome: {
    title: "Welcome to The PropTech Club! 🎉",
    body: (firstName: string) => `Connect, grow and build your network`,
    fallbackName: "PropTech Club member",
  },
  connectionRequestReceived: {
    title: "Connection request received",
    body: (name: string) => `${name} wants to connect!`,
  },
  connectionRequestHandledByMe: {
    title: (statusText: string) =>
      statusText === "accepted" ? "You're now connected! 🤝" : `Connection request ${statusText}`,
    body: (statusText: string, requesterName: string) =>
      statusText === "accepted"
        ? `${requesterName} is now connected with you`
        : `You ${statusText} ${requesterName}'s connection request`,
  },
  connectionRequestHandledByOtherUser: {
    title: (statusText: string) =>
      statusText === "accepted" ? "You're now connected! 🤝" : `Connection request ${statusText}`,
    body: (receiverName: string, statusText: string) =>
      statusText === "declined"
        ? `${receiverName} cant connect right now`
        : `${receiverName} accepted your request`,
  },
  unreadMessage: {
    title: "You have a new message!",
    body: (senderName: string) => `${senderName} sent you a message`,
  },
  messageWaitingForReply: {
    title: "Reply reminder",
    body: (senderName: string) => `${senderName} is waiting for reply`,
  },
  eventRegistered: {
    title: "You're Registered! ✓",
    body: (eventName: string) => `You successfully registered for ${eventName}`,
  },
  eventPublished: {
    title: "New event published",
    body: (eventName: string) => `${eventName} is now open to view`,
  },
  eventRegistrationApproved: {
    title: "Registration Approved ✓",
    body: (eventName: string) => `${eventName} approved your registration`,
  },
  eventTomorrow: {
    title: "Event Tomorrow ⏰",
    body: (eventName: string) => `${eventName} is tomorrow. Don't miss it!`,
  },
  articlePublished: {
    title: (articleTitle: string) => articleTitle,
    body: (publisherName: string) => `Read the latest from ${publisherName}`,
  },
};

export const NOTIFICATION_ACTION_LABELS = {
  accept: "Accept",
  reject: "Decline",
  viewEvent: "View event",
  viewMessage: "View message",
};

export const NOTIFICATIONS = [
  // {
  //   id: "profile",
  //   title: "Profile update complete",
  //   body: "Your latest profile changes are now visible to members.",
  //   time: "2 days ago",
  //   unread: false,
  //   actionRoute: "/auth/profile",
  //   actorName: null,
  //   actorAvatarUrl: null,
  //   Icon: Check,
  // },
];
