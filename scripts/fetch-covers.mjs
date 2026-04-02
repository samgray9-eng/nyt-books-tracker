// Run once: node scripts/fetch-covers.mjs
// Fetches cover IDs from Open Library for all books and prints a JSON map.

import { readFileSync } from 'fs';
import { createRequire } from 'module';

// We can't import TS directly, so we'll inline the book list here.
// Pull titles/authors from the compiled output or re-list them.

const books = [
  { id: 1, title: "The Road", author: "Cormac McCarthy" },
  { id: 2, title: "Wolf Hall", author: "Hilary Mantel" },
  { id: 3, title: "Lincoln in the Bardo", author: "George Saunders" },
  { id: 4, title: "A Little Life", author: "Hanya Yanagihara" },
  { id: 5, title: "The Underground Railroad", author: "Colson Whitehead" },
  { id: 6, title: "Gilead", author: "Marilynne Robinson" },
  { id: 7, title: "Never Let Me Go", author: "Kazuo Ishiguro" },
  { id: 8, title: "The Corrections", author: "Jonathan Franzen" },
  { id: 9, title: "The Brief Wondrous Life of Oscar Wao", author: "Junot Díaz" },
  { id: 10, title: "Americanah", author: "Chimamanda Ngozi Adichie" },
  { id: 11, title: "White Teeth", author: "Zadie Smith" },
  { id: 12, title: "Normal People", author: "Sally Rooney" },
  { id: 13, title: "Exit West", author: "Mohsin Hamid" },
  { id: 14, title: "The Sympathizer", author: "Viet Thanh Nguyen" },
  { id: 15, title: "Olive Kitteridge", author: "Elizabeth Strout" },
  { id: 16, title: "Between the World and Me", author: "Ta-Nehisi Coates" },
  { id: 17, title: "Cloud Atlas", author: "David Mitchell" },
  { id: 18, title: "The Vegetarian", author: "Han Kang" },
  { id: 19, title: "Middlesex", author: "Jeffrey Eugenides" },
  { id: 20, title: "Atonement", author: "Ian McEwan" },
  { id: 21, title: "The Amazing Adventures of Kavalier and Clay", author: "Michael Chabon" },
  { id: 22, title: "Life of Pi", author: "Yann Martel" },
  { id: 23, title: "Pachinko", author: "Min Jin Lee" },
  { id: 24, title: "Station Eleven", author: "Emily St. John Mandel" },
  { id: 25, title: "The Sellout", author: "Paul Beatty" },
  { id: 26, title: "Jonathan Strange and Mr Norrell", author: "Susanna Clarke" },
  { id: 27, title: "The Known World", author: "Edward P. Jones" },
  { id: 28, title: "A Visit from the Goon Squad", author: "Jennifer Egan" },
  { id: 29, title: "My Brilliant Friend", author: "Elena Ferrante" },
  { id: 30, title: "The Goldfinch", author: "Donna Tartt" },
  { id: 31, title: "Tenth of December", author: "George Saunders" },
  { id: 32, title: "H Is for Hawk", author: "Helen Macdonald" },
  { id: 33, title: "Educated", author: "Tara Westover" },
  { id: 34, title: "The Year of Magical Thinking", author: "Joan Didion" },
  { id: 35, title: "Just Kids", author: "Patti Smith" },
  { id: 36, title: "The Warmth of Other Suns", author: "Isabel Wilkerson" },
  { id: 37, title: "When Breath Becomes Air", author: "Paul Kalanithi" },
  { id: 38, title: "Salvage the Bones", author: "Jesmyn Ward" },
  { id: 39, title: "The Nickel Boys", author: "Colson Whitehead" },
  { id: 40, title: "Half of a Yellow Sun", author: "Chimamanda Ngozi Adichie" },
  { id: 41, title: "Cutting for Stone", author: "Abraham Verghese" },
  { id: 42, title: "The Tiger's Wife", author: "Téa Obreht" },
  { id: 43, title: "The Book Thief", author: "Markus Zusak" },
  { id: 44, title: "The Curious Incident of the Dog in the Night-Time", author: "Mark Haddon" },
  { id: 45, title: "Everything Is Illuminated", author: "Jonathan Safran Foer" },
  { id: 46, title: "The Kite Runner", author: "Khaled Hosseini" },
  { id: 47, title: "Her Body and Other Parties", author: "Carmen Maria Machado" },
  { id: 48, title: "Stay True", author: "Hua Hsu" },
  { id: 49, title: "Freedom", author: "Jonathan Franzen" },
  { id: 50, title: "The Night Circus", author: "Erin Morgenstern" },
  { id: 51, title: "The Lovely Bones", author: "Alice Sebold" },
  { id: 52, title: "The Absolutely True Diary of a Part-Time Indian", author: "Sherman Alexie" },
  { id: 53, title: "Bel Canto", author: "Ann Patchett" },
  { id: 54, title: "All the Light We Cannot See", author: "Anthony Doerr" },
  { id: 55, title: "Homegoing", author: "Yaa Gyasi" },
  { id: 56, title: "The Overstory", author: "Richard Powers" },
  { id: 57, title: "There There", author: "Tommy Orange" },
  { id: 58, title: "Demon Copperhead", author: "Barbara Kingsolver" },
  { id: 59, title: "Trust", author: "Hernan Diaz" },
  { id: 60, title: "Piranesi", author: "Susanna Clarke" },
  { id: 61, title: "On Earth We're Briefly Gorgeous", author: "Ocean Vuong" },
  { id: 62, title: "The Vanishing Half", author: "Brit Bennett" },
  { id: 63, title: "Klara and the Sun", author: "Kazuo Ishiguro" },
  { id: 64, title: "Tomorrow, and Tomorrow, and Tomorrow", author: "Gabrielle Zevin" },
  { id: 65, title: "Lessons in Chemistry", author: "Bonnie Garmus" },
  { id: 66, title: "A Gentleman in Moscow", author: "Amor Towles" },
  { id: 67, title: "Less", author: "Andrew Sean Greer" },
  { id: 68, title: "Bring Up the Bodies", author: "Hilary Mantel" },
  { id: 69, title: "Outline", author: "Rachel Cusk" },
  { id: 70, title: "The Song of Achilles", author: "Madeline Miller" },
  { id: 71, title: "Circe", author: "Madeline Miller" },
  { id: 72, title: "The Magicians", author: "Lev Grossman" },
  { id: 73, title: "Hag-Seed", author: "Margaret Atwood" },
  { id: 74, title: "An Untamed State", author: "Roxane Gay" },
  { id: 75, title: "The Buried Giant", author: "Kazuo Ishiguro" },
  { id: 76, title: "The Power", author: "Naomi Alderman" },
  { id: 77, title: "The Testaments", author: "Margaret Atwood" },
  { id: 78, title: "Fever Dream", author: "Samanta Schweblin" },
  { id: 79, title: "Mexican Gothic", author: "Silvia Moreno-Garcia" },
  { id: 80, title: "The House of the Spirits", author: "Isabel Allende" },
  { id: 81, title: "Lincoln Highway", author: "Amor Towles" },
  { id: 82, title: "Bewilderment", author: "Richard Powers" },
  { id: 83, title: "The Dutch House", author: "Ann Patchett" },
  { id: 84, title: "Anxious People", author: "Fredrik Backman" },
  { id: 85, title: "A Man Called Ove", author: "Fredrik Backman" },
  { id: 86, title: "The Midnight Library", author: "Matt Haig" },
  { id: 87, title: "The Seven Husbands of Evelyn Hugo", author: "Taylor Jenkins Reid" },
  { id: 88, title: "Beautiful Boy", author: "David Sheff" },
  { id: 89, title: "The Inheritance Games", author: "Jennifer Lynn Barnes" },
  { id: 90, title: "Persepolis", author: "Marjane Satrapi" },
  { id: 91, title: "The Glass Castle", author: "Jeannette Walls" },
  { id: 92, title: "In the Woods", author: "Tana French" },
  { id: 93, title: "The Girl with the Dragon Tattoo", author: "Stieg Larsson" },
  { id: 94, title: "The Committed", author: "Viet Thanh Nguyen" },
  { id: 95, title: "2666", author: "Roberto Bolaño" },
  { id: 96, title: "The Lacuna", author: "Barbara Kingsolver" },
  { id: 97, title: "Crying in H Mart", author: "Michelle Zauner" },
  { id: 98, title: "Matrix", author: "Lauren Groff" },
  { id: 99, title: "The Covenant of Water", author: "Abraham Verghese" },
  { id: 100, title: "Intermezzo", author: "Sally Rooney" },
];

const results = {};

async function fetchCoverId(book) {
  const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(book.title)}&author=${encodeURIComponent(book.author)}&limit=1&fields=cover_i`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const coverId = data?.docs?.[0]?.cover_i ?? null;
    return coverId;
  } catch {
    return null;
  }
}

// Rate-limit: process in batches of 5 with a small delay
async function run() {
  const BATCH = 5;
  for (let i = 0; i < books.length; i += BATCH) {
    const batch = books.slice(i, i + BATCH);
    const ids = await Promise.all(batch.map(fetchCoverId));
    batch.forEach((book, j) => {
      results[book.id] = ids[j];
      const status = ids[j] ? `cover_i=${ids[j]}` : 'NOT FOUND';
      console.error(`[${book.id}] ${book.title} — ${status}`);
    });
    if (i + BATCH < books.length) {
      await new Promise(r => setTimeout(r, 300));
    }
  }
  // Print the final map as JSON to stdout
  console.log(JSON.stringify(results, null, 2));
}

run();
