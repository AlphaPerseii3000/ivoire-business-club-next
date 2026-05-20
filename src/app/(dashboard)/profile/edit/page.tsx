import { redirect } from "next/navigation";

// `/profile` reste la route canonique d'édition du profil.
// Cette URL explicite satisfait les liens futurs « Modifier mes tags » et redirige proprement.
export default function ProfileEditRedirectPage() {
  redirect("/profile");
}
