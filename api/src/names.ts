// Random first names for users who sign up without a LinkedIn profile.
// Every user must have a display name (match cards, avatars); a LinkedIn
// import later overwrites this with the real first name.
const FIRST_NAMES = [
  "Alex", "Anna", "Ben", "Clara", "Daniel", "Elena", "Felix", "Greta",
  "Hannah", "Jan", "Johanna", "Jonas", "Julia", "Kai", "Lara", "Lea",
  "Leon", "Lina", "Luca", "Marie", "Max", "Mia", "Milan", "Nico",
  "Nina", "Noah", "Paul", "Pia", "Robin", "Sarah", "Simon", "Sophie",
  "Tim", "Tom", "Valentina", "Victor", "Yara", "Zoe",
];

export function randomFirstName(): string {
  return FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
}
