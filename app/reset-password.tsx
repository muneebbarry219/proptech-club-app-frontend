import { Redirect } from "expo-router";

// Compatibility route for recovery emails generated with a two-slash custom
// scheme. Native URL parsing turns proptechclub://auth/reset-password into
// /reset-password because `auth` is interpreted as the hostname.
export default function ResetPasswordRedirect() {
  return <Redirect href="/auth/reset-password" />;
}
