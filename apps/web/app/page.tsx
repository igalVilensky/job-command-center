import { ProfileSettings } from "./profile-settings";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function Home() {
  return <ProfileSettings apiUrl={apiUrl} />;
}
