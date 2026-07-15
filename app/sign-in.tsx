import { Redirect } from "expo-router";

// Compatibility route for native custom-scheme links that resolve to the
// root-level /sign-in path.
export default function SignInRedirect() {
  return <Redirect href="/auth/sign-in" />;
}
