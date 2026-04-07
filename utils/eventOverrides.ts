import type { ImageSourcePropType } from "react-native";

export interface EventOverrideShape {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  venue: string | null;
  location: string | null;
  event_type: string;
  registration_type: "open" | "exclusive";
  registration_url: string | null;
  report_url: string | null;
  is_featured: boolean;
  is_past: boolean;
  whatsapp_link?: string | null;
  website_url?: string | null;
  cover_image?: string | null;
  member_only?: boolean;
}

const CURATED_EVENT_COPY = {
  title: "PropTech Club Eid Meet & Greet",
  description:
    "We’re curating a private PropTech Club Eid Meet & Greet — a closed-door gathering bringing together developers, capital, and key enablers from the real estate ecosystem.\n\nThe idea is simple:\nA focused room for meaningful conversations, alignment, and long-term collaboration.\n\nSeats are intentionally limited.\n\nIf you’d like to be considered, you can share your details here:\nhttps://forms.gle/M21o61hr19NFycgE8\n\n— Atif",
  event_date: "2026-04-11T17:30:00+05:00",
  end_date: null,
  venue: "Tapestry Cafe",
  location: "Karachi, Pakistan",
  event_type: "meetup",
  registration_type: "exclusive" as const,
  registration_url: "https://forms.gle/M21o61hr19NFycgE8",
  report_url: null,
  is_featured: true,
  is_past: false,
  whatsapp_link: null,
  website_url: "https://forms.gle/M21o61hr19NFycgE8",
  member_only: true,
};

export function getPrimaryUpcomingEventId<T extends Pick<EventOverrideShape, "id" | "event_date" | "is_past">>(events: T[]) {
  return [...events]
    .filter((event) => !event.is_past)
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())[0]?.id ?? null;
}

export function applyCuratedEventOverride<T extends EventOverrideShape>(event: T, curatedEventId: string | null) {
  if (!curatedEventId || event.id !== curatedEventId) return event;
  return {
    ...event,
    ...CURATED_EVENT_COPY,
  };
}

export function applyCuratedEventOverrides<T extends EventOverrideShape>(events: T[]) {
  const curatedEventId = getPrimaryUpcomingEventId(events);
  return events.map((event) => applyCuratedEventOverride(event, curatedEventId));
}

export function getEventCoverSource(event: Pick<EventOverrideShape, "member_only" | "cover_image">): ImageSourcePropType | null {
  if (event.member_only) {
    return require("../assets/proptech eid meet n greet.jpg");
  }

  if (event.cover_image) {
    return { uri: event.cover_image };
  }

  return null;
}
