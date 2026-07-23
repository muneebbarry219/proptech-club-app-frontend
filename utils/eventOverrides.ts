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

export function getEventCoverSource(event: Pick<EventOverrideShape, "member_only" | "cover_image">): ImageSourcePropType | null {
  if (event.cover_image) {
    return { uri: event.cover_image };
  }

  return null;
}

